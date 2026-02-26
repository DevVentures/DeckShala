import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { diff } from "deep-diff";

interface CreateVersionOptions {
  presentationId: string;
  content: unknown;
  createdBy: string;
  comment?: string;
  tags?: string[];
}

/**
 * Presentation Versioning Service
 * Track and manage presentation versions with diff tracking
 */
export class VersioningService {
  /**
   * Create a new version of a presentation
   */
  static async createVersion(options: CreateVersionOptions): Promise<{
    success: boolean;
    versionNumber?: number;
    error?: string;
  }> {
    try {
      // Get the last version number
      const lastVersion = await db.presentationVersion.findFirst({
        where: { presentationId: options.presentationId },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true, content: true },
      });

      const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;

      // Calculate diff from previous version
      const changes = lastVersion?.content
        ? diff(lastVersion.content, options.content)
        : null;

      await db.presentationVersion.create({
        data: {
          presentationId: options.presentationId,
          versionNumber,
          content: options.content as any,
          changes: changes as any,
          createdBy: options.createdBy,
          comment: options.comment,
          tags: options.tags || [],
        },
      });

      logger.info("Version created", {
        presentationId: options.presentationId,
        versionNumber,
        userId: options.createdBy,
      });

      return { success: true, versionNumber };
    } catch (error) {
      logger.error("Create version error", error as Error, {
        presentationId: options.presentationId,
        createdBy: options.createdBy,
      });
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get all versions of a presentation
   */
  static async getVersions(presentationId: string): Promise<
    Array<{
      id: string;
      versionNumber: number;
      createdBy: string;
      createdByName?: string;
      comment?: string;
      tags: string[];
      createdAt: Date;
      changesCount: number;
    }>
  > {
    try {
      const versions = await db.presentationVersion.findMany({
        where: { presentationId },
        orderBy: { versionNumber: "desc" },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      });

      return versions.map(version => ({
        id: version.id,
        versionNumber: version.versionNumber,
        createdBy: version.createdBy,
        createdByName: version.user.name ?? undefined,
        comment: version.comment ?? undefined,
        tags: version.tags,
        createdAt: version.createdAt,
        changesCount: Array.isArray(version.changes) ? (version.changes as any[]).length : 0,
      }));
    } catch (error) {
      logger.error("Get versions error", error as Error, { presentationId });
      return [];
    }
  }

  /**
   * Get a specific version
   */
  static async getVersion(
    presentationId: string,
    versionNumber: number
  ): Promise<{
    content: unknown;
    changes?: unknown;
    metadata: {
      versionNumber: number;
      createdBy: string;
      createdByName?: string;
      comment?: string;
      tags: string[];
      createdAt: Date;
    };
  } | null> {
    try {
      const version = await db.presentationVersion.findFirst({
        where: {
          presentationId,
          versionNumber,
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!version) {
        return null;
      }

      return {
        content: version.content,
        changes: version.changes,
        metadata: {
          versionNumber: version.versionNumber,
          createdBy: version.createdBy,
          createdByName: version.user.name ?? undefined,
          comment: version.comment ?? undefined,
          tags: version.tags,
          createdAt: version.createdAt,
        },
      };
    } catch (error) {
      logger.error("Get version error", error as Error, { presentationId, versionNumber });
      return null;
    }
  }

  /**
   * Restore a presentation to a specific version
   */
  static async restoreVersion(
    presentationId: string,
    versionNumber: number,
    restoredBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const version = await this.getVersion(presentationId, versionNumber);

      if (!version) {
        return { success: false, error: "Version not found" };
      }

      // Update the presentation with the version content
      await db.presentation.update({
        where: { id: presentationId },
        data: {
          content: version.content as any,
          base: {
            update: {
              updatedAt: new Date(),
            },
          },
        },
      });

      // Create a new version marking this as a restore
      await this.createVersion({
        presentationId,
        content: version.content,
        createdBy: restoredBy,
        comment: `Restored from version ${versionNumber}`,
        tags: ["restored"],
      });

      logger.info("Version restored", {
        presentationId,
        versionNumber,
        restoredBy,
      });

      return { success: true };
    } catch (error) {
      logger.error("Restore version error", error as Error, {
        presentationId,
        versionNumber,
        restoredBy,
      });
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Compare two versions
   */
  static async compareVersions(
    presentationId: string,
    version1: number,
    version2: number
  ): Promise<{
    differences: unknown;
    metadata: {
      version1: number;
      version2: number;
      changesCount: number;
    };
  } | null> {
    try {
      const v1 = await this.getVersion(presentationId, version1);
      const v2 = await this.getVersion(presentationId, version2);

      if (!v1 || !v2) {
        return null;
      }

      const differences = diff(v1.content, v2.content);

      return {
        differences,
        metadata: {
          version1,
          version2,
          changesCount: Array.isArray(differences) ? differences.length : 0,
        },
      };
    } catch (error) {
      logger.error("Compare versions error", error as Error, {
        presentationId,
        version1,
        version2,
      });
      return null;
    }
  }

  /**
   * Delete old versions (keep last N versions)
   */
  static async pruneOldVersions(
    presentationId: string,
    keepLast: number = 10
  ): Promise<{ success: boolean; deletedCount: number }> {
    try {
      const versions = await db.presentationVersion.findMany({
        where: { presentationId },
        orderBy: { versionNumber: "desc" },
        select: { id: true, versionNumber: true },
      });

      if (versions.length <= keepLast) {
        return { success: true, deletedCount: 0 };
      }

      const versionsToDelete = versions.slice(keepLast);
      const result = await db.presentationVersion.deleteMany({
        where: {
          id: {
            in: versionsToDelete.map(v => v.id),
          },
        },
      });

      logger.info("Pruned old versions", {
        presentationId,
        deletedCount: result.count,
        keepLast,
      });

      return { success: true, deletedCount: result.count };
    } catch (error) {
      logger.error("Prune versions error", error as Error, { presentationId, keepLast });
      return { success: false, deletedCount: 0 };
    }
  }

  /**
   * Auto-save version on major changes
   */
  static async autoSaveVersion(
    presentationId: string,
    content: unknown,
    userId: string
  ): Promise<void> {
    try {
      const lastVersion = await db.presentationVersion.findFirst({
        where: { presentationId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });

      // Only auto-save if last version is older than 10 minutes
      const shouldAutoSave = !lastVersion ||
        (Date.now() - lastVersion.createdAt.getTime()) > 10 * 60 * 1000;

      if (shouldAutoSave) {
        await this.createVersion({
          presentationId,
          content,
          createdBy: userId,
          comment: "Auto-saved",
          tags: ["autosave"],
        });
      }
    } catch (error) {
      logger.error("Auto-save version error", error as Error, { presentationId, userId });
    }
  }
}
