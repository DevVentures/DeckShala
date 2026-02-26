"use server";

import { auth } from "@/server/auth";
import { VersioningService } from "@/lib/versioning-service";
import { logger } from "@/lib/logger";

/**
 * Create a new version of a presentation
 */
export async function createPresentationVersion(
  presentationId: string,
  content: unknown,
  comment?: string,
  tags?: string[]
) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const result = await VersioningService.createVersion({
      presentationId,
      content,
      createdBy: session.user.id,
      comment,
      tags,
    });

    return result;
  } catch (error) {
    logger.error("Create presentation version error", error as Error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get all versions of a presentation
 */
export async function getPresentationVersions(presentationId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const versions = await VersioningService.getVersions(presentationId);

    return {
      success: true,
      versions,
    };
  } catch (error) {
    logger.error("Get presentation versions error", error as Error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get a specific version
 */
export async function getPresentationVersion(
  presentationId: string,
  versionNumber: number
) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const version = await VersioningService.getVersion(presentationId, versionNumber);

    if (!version) {
      throw new Error("Version not found");
    }

    return {
      success: true,
      version,
    };
  } catch (error) {
    logger.error("Get presentation version error", error as Error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Restore a presentation to a specific version
 */
export async function restorePresentationVersion(
  presentationId: string,
  versionNumber: number
) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const result = await VersioningService.restoreVersion(
      presentationId,
      versionNumber,
      session.user.id
    );

    return result;
  } catch (error) {
    logger.error("Restore presentation version error", error as Error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Compare two versions
 */
export async function comparePresentationVersions(
  presentationId: string,
  version1: number,
  version2: number
) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const comparison = await VersioningService.compareVersions(
      presentationId,
      version1,
      version2
    );

    if (!comparison) {
      throw new Error("Versions not found");
    }

    return {
      success: true,
      comparison,
    };
  } catch (error) {
    logger.error("Compare presentation versions error", error as Error);
    return { success: false, error: (error as Error).message };
  }
}
