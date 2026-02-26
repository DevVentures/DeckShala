import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { OllamaService } from "@/lib/ollama-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/ollama/metrics - Get model performance metrics
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const metrics = OllamaService.getModelMetrics();

    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (error) {
    logger.error("Get Ollama metrics error", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
