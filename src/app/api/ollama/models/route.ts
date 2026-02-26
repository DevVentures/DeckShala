import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { OllamaService } from "@/lib/ollama-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/ollama/models - Get available models
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await OllamaService.getAvailableModels();

    if (result.error) {
      return NextResponse.json(
        { error: result.error, models: [] },
        { status: 503 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Get Ollama models error", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ollama/models - Pull a new model
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can pull models
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { modelName } = (await request.json()) as { modelName: string };

    if (!modelName) {
      return NextResponse.json(
        { error: "Model name is required" },
        { status: 400 }
      );
    }

    const result = await OllamaService.pullModel(modelName);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Pull Ollama model error", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ollama/models - Delete a model
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can delete models
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { modelName } = (await request.json()) as { modelName: string };

    if (!modelName) {
      return NextResponse.json(
        { error: "Model name is required" },
        { status: 400 }
      );
    }

    const result = await OllamaService.deleteModel(modelName);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Delete Ollama model error", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
