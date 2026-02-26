"use server";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { AnalyticsService } from "@/lib/analytics-service";
import { logger } from "@/lib/logger";

/**
 * Track analytics event
 */
export async function trackEvent(
  presentationId: string,
  eventType: "view" | "edit" | "share" | "export" | "collaborate",
  eventData?: Record<string, unknown>
) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    await AnalyticsService.track({
      presentationId,
      userId: session.user.id,
      eventType,
      eventData,
    });

    return { success: true };
  } catch (error) {
    logger.error("Track event error", error as Error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get presentation analytics
 */
export async function getPresentationAnalytics(presentationId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Verify user owns this presentation
    const presentation = await db.baseDocument.findFirst({
      where: {
        id: presentationId,
        userId: session.user.id,
      },
    });

    if (!presentation) {
      throw new Error("Presentation not found or unauthorized");
    }

    const stats = await AnalyticsService.getPresentationStats(presentationId);

    return {
      success: true,
      stats,
    };
  } catch (error) {
    logger.error("Get presentation analytics error", error as Error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get user analytics dashboard
 */
export async function getUserAnalytics() {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const stats = await AnalyticsService.getUserStats(session.user.id);

    return {
      success: true,
      stats,
    };
  } catch (error) {
    logger.error("Get user analytics error", error as Error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get trending presentations
 */
export async function getTrendingPresentations(limit = 10, days = 7) {
  try {
    const trending = await AnalyticsService.getTrendingPresentations(limit, days);

    return {
      success: true,
      trending,
    };
  } catch (error) {
    logger.error("Get trending presentations error", error as Error);
    return { success: false, error: (error as Error).message };
  }
}
