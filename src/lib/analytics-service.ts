import { db } from "@/server/db";
import { logger } from "@/lib/logger";

export type AnalyticsEventType =
  | "view"
  | "edit"
  | "share"
  | "export"
  | "collaborate"
  | "comment"
  | "template_use"
  | "ai_generation"
  | "version_create";

interface AnalyticsEvent {
  presentationId: string;
  userId: string;
  eventType: AnalyticsEventType;
  eventData?: Record<string, unknown>;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  duration?: number;
}

/**
 * Advanced Analytics Service
 * Track and analyze presentation usage patterns
 */
export class AnalyticsService {
  /**
   * Track an analytics event
   */
  static async track(event: AnalyticsEvent): Promise<void> {
    try {
      await db.presentationAnalytics.create({
        data: {
          presentationId: event.presentationId,
          userId: event.userId,
          eventType: event.eventType,
          eventData: event.eventData as any,
          sessionId: event.sessionId,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          duration: event.duration,
        },
      });

      logger.debug("Analytics event tracked", {
        eventType: event.eventType,
        presentationId: event.presentationId,
      });
    } catch (error) {
      logger.error("Analytics tracking error", error as Error, {
        presentationId: event.presentationId,
        userId: event.userId,
        eventType: event.eventType,
      });
    }
  }

  /**
   * Get presentation statistics
   */
  static async getPresentationStats(presentationId: string): Promise<{
    totalViews: number;
    totalEdits: number;
    totalShares: number;
    totalExports: number;
    totalCollaborations: number;
    uniqueViewers: number;
    avgSessionDuration?: number;
    viewsByDate: Array<{ date: string; count: number }>;
  }> {
    try {
      const events = await db.presentationAnalytics.findMany({
        where: { presentationId },
        select: {
          eventType: true,
          userId: true,
          duration: true,
          createdAt: true,
        },
      });

      const uniqueViewers = new Set(
        events.filter(e => e.eventType === "view").map(e => e.userId)
      ).size;

      const totalViews = events.filter(e => e.eventType === "view").length;
      const totalEdits = events.filter(e => e.eventType === "edit").length;
      const totalShares = events.filter(e => e.eventType === "share").length;
      const totalExports = events.filter(e => e.eventType === "export").length;
      const totalCollaborations = events.filter(e => e.eventType === "collaborate").length;

      const durations = events
        .filter(e => e.duration !== null)
        .map(e => e.duration!);
      const avgSessionDuration = durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : undefined;

      // Group by date
      const viewsByDate = events
        .filter(e => e.eventType === "view")
        .reduce((acc, event) => {
          const date = event.createdAt.toISOString().split('T')[0];
          if (date) {
            acc[date] = (acc[date] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

      return {
        totalViews,
        totalEdits,
        totalShares,
        totalExports,
        totalCollaborations,
        uniqueViewers,
        avgSessionDuration,
        viewsByDate: Object.entries(viewsByDate).map(([date, count]) => ({
          date,
          count,
        })),
      };
    } catch (error) {
      logger.error("Get presentation stats error", error as Error, { presentationId });
      return {
        totalViews: 0,
        totalEdits: 0,
        totalShares: 0,
        totalExports: 0,
        totalCollaborations: 0,
        uniqueViewers: 0,
        viewsByDate: [],
      };
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(userId: string): Promise<{
    totalPresentations: number;
    totalViews: number;
    totalEdits: number;
    mostViewedPresentation?: { id: string; title: string; views: number };
    activityByDay: Array<{ date: string; count: number }>;
  }> {
    try {
      const presentations = await db.baseDocument.count({
        where: { userId, type: "PRESENTATION" },
      });

      const events = await db.presentationAnalytics.findMany({
        where: { userId },
        include: {
          presentation: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      const totalViews = events.filter(e => e.eventType === "view").length;
      const totalEdits = events.filter(e => e.eventType === "edit").length;

      // Most viewed presentation
      const viewCounts = events
        .filter(e => e.eventType === "view")
        .reduce((acc, event) => {
          const pid = event.presentationId;
          acc[pid] = (acc[pid] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const mostViewedId = Object.entries(viewCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      const mostViewedPresentation = mostViewedId && viewCounts[mostViewedId]
        ? {
          id: mostViewedId,
          title: events.find(e => e.presentationId === mostViewedId)?.presentation.title || "Unknown",
          views: viewCounts[mostViewedId],
        }
        : undefined;

      // Activity by day
      const activityByDay = events.reduce((acc, event) => {
        const date = event.createdAt.toISOString().split('T')[0];
        if (date) {
          acc[date] = (acc[date] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return {
        totalPresentations: presentations,
        totalViews,
        totalEdits,
        mostViewedPresentation,
        activityByDay: Object.entries(activityByDay).map(([date, count]) => ({
          date,
          count,
        })),
      };
    } catch (error) {
      logger.error("Get user stats error", error as Error, { userId });
      return {
        totalPresentations: 0,
        totalViews: 0,
        totalEdits: 0,
        activityByDay: [],
      };
    }
  }

  /**
   * Get trending presentations
   */
  static async getTrendingPresentations(
    limit = 10,
    days = 7
  ): Promise<Array<{ presentationId: string; title: string; views: number; uniqueUsers: number }>> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const events = await db.presentationAnalytics.findMany({
        where: {
          eventType: "view",
          createdAt: {
            gte: since,
          },
        },
        include: {
          presentation: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      const stats = events.reduce((acc, event) => {
        const pid = event.presentationId;
        if (!acc[pid]) {
          acc[pid] = {
            presentationId: pid,
            title: event.presentation.title,
            views: 0,
            users: new Set<string>(),
          };
        }
        acc[pid].views++;
        acc[pid].users.add(event.userId);
        return acc;
      }, {} as Record<string, { presentationId: string; title: string; views: number; users: Set<string> }>);

      return Object.values(stats)
        .map(item => ({
          presentationId: item.presentationId,
          title: item.title,
          views: item.views,
          uniqueUsers: item.users.size,
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, limit);
    } catch (error) {
      logger.error("Get trending presentations error", error as Error);
      return [];
    }
  }
}
