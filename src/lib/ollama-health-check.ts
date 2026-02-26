import { env } from "@/env";

/**
 * Health check result for Ollama service
 */
export interface OllamaHealthCheck {
  isAvailable: boolean;
  responseTime?: number;
  version?: string;
  models?: string[];
  error?: string;
}

/**
 * Check if Ollama service is healthy and available
 * This should be called before making AI requests to ensure service availability
 */
export async function checkOllamaHealth(): Promise<OllamaHealthCheck> {
  const startTime = Date.now();
  const baseURL = env.OLLAMA_BASE_URL || "http://localhost:11434";

  try {
    // Test basic connectivity
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health check

    const response = await fetch(`${baseURL}/api/tags`, {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        isAvailable: false,
        responseTime: Date.now() - startTime,
        error: `Ollama service returned status ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      models?: Array<{ name: string }>;
    };
    const models = data.models?.map((m) => m.name) || [];

    return {
      isAvailable: true,
      responseTime: Date.now() - startTime,
      models,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Provide more specific error messages
    let detailedError = errorMessage;
    if (errorMessage.includes("ECONNREFUSED")) {
      detailedError = `Cannot connect to Ollama at ${baseURL}. Is Ollama running? Try 'ollama serve'`;
    } else if (errorMessage.includes("abort")) {
      detailedError = `Ollama health check timed out after 5 seconds`;
    }

    return {
      isAvailable: false,
      responseTime: Date.now() - startTime,
      error: detailedError,
    };
  }
}

/**
 * Validate that a specific model is available in Ollama
 */
export async function validateOllamaModel(
  modelName: string
): Promise<{ isAvailable: boolean; error?: string }> {
  try {
    const health = await checkOllamaHealth();

    if (!health.isAvailable) {
      return {
        isAvailable: false,
        error: health.error || "Ollama service is not available",
      };
    }

    if (!health.models || health.models.length === 0) {
      return {
        isAvailable: false,
        error: `No models found in Ollama. Please run 'ollama pull ${modelName}'`,
      };
    }

    // Check if the specific model exists
    const modelExists = health.models.some(
      (m) => m === modelName || m.startsWith(`${modelName}:`)
    );

    if (!modelExists) {
      return {
        isAvailable: false,
        error: `Model '${modelName}' not found. Available models: ${health.models.join(", ")}. Run 'ollama pull ${modelName}' to download it.`,
      };
    }

    return { isAvailable: true };
  } catch (error) {
    return {
      isAvailable: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get Ollama service status with detailed information
 * Useful for admin/debug dashboards
 */
export async function getOllamaServiceStatus(): Promise<{
  status: "healthy" | "degraded" | "unavailable";
  details: OllamaHealthCheck;
  recommendations?: string[];
}> {
  const health = await checkOllamaHealth();
  const recommendations: string[] = [];

  if (!health.isAvailable) {
    recommendations.push("Start Ollama service: 'ollama serve'");
    recommendations.push(
      `Verify Ollama is running at ${env.OLLAMA_BASE_URL || "http://localhost:11434"}`
    );

    return {
      status: "unavailable",
      details: health,
      recommendations,
    };
  }

  if (!health.models || health.models.length === 0) {
    recommendations.push("Download at least one model: 'ollama pull llama3.2'");
    return {
      status: "degraded",
      details: health,
      recommendations,
    };
  }

  if (health.responseTime && health.responseTime > 2000) {
    recommendations.push(
      "Ollama is responding slowly. Consider checking system resources."
    );
    return {
      status: "degraded",
      details: health,
      recommendations,
    };
  }

  return {
    status: "healthy",
    details: health,
  };
}
