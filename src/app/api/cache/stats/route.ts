import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { AIGenerationCacheService } from "@/lib/ai-cache-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/cache/stats - Get cache statistics
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can view cache stats
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const stats = await AIGenerationCacheService.getStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error("Get cache stats error", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cache/cleanup - Cleanup expired cache entries
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can cleanup cache
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const deletedCount = await AIGenerationCacheService.cleanup();

    return NextResponse.json({
      success: true,
      deletedCount,
    });
  } catch (error) {
    logger.error("Cache cleanup error", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cache/stats - Clear all cache
 */
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can clear cache
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const deletedCount = await AIGenerationCacheService.clearAll();

    return NextResponse.json({
      success: true,
      deletedCount,
    });
  } catch (error) {
    logger.error("Clear cache error", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
