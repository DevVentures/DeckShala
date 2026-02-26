import { type NextRequest, NextResponse } from "next/server";
import { getOllamaServiceStatus } from "@/lib/ollama-health-check";
import { logger } from "@/lib/logger";
import { auth } from "@/server/auth";

/**
 * Health check endpoint for Ollama service
 * GET /api/health/ollama
 * 
 * Returns detailed status of Ollama service including:
 * - Service availability
 * - Response time
 * - Available models
 * - Recommendations for issues
 */
export async function GET(req: NextRequest) {
  try {
    // Optional: Check authentication (remove if you want public health endpoint)
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const status = await getOllamaServiceStatus();

    // Return appropriate HTTP status based on service health
    const httpStatus =
      status.status === "healthy" ? 200 :
        status.status === "degraded" ? 207 : // Multi-Status
          503; // Service Unavailable

    return NextResponse.json(status, { status: httpStatus });
  } catch (error) {
    logger.error("Health check error", error as Error);
    return NextResponse.json(
      {
        status: "unavailable",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
