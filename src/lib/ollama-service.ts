import { env } from "@/env";
import { logger } from "@/lib/logger";
import { checkOllamaHealth, validateOllamaModel } from "./ollama-health-check";

/**
 * Advanced Ollama Service with multi-model orchestration,
 * load balancing, and intelligent fallbacks
 */

interface ModelConfig {
  name: string;
  priority: number; // Higher is better
  maxRetries: number;
  timeout: number;
  contextWindow: number;
  costPerToken?: number;
}

interface GenerationOptions {
  temperature?: number;
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
  maxTokens?: number;
  stream?: boolean;
  system?: string;
}

interface ModelMetrics {
  model: string;
  averageLatency: number;
  successRate: number;
  totalRequests: number;
  lastUsed: Date;
}

/**
 * Advanced Ollama Service
 */
export class OllamaService {
  private static modelMetrics = new Map<string, ModelMetrics>();

  // Default model configurations
  private static modelConfigs: ModelConfig[] = [
    {
      name: "llama3.2",
      priority: 90,
      maxRetries: 3,
      timeout: 120000,
      contextWindow: 128000,
    },
    {
      name: "llama3.1",
      priority: 85,
      maxRetries: 3,
      timeout: 120000,
      contextWindow: 128000,
    },
    {
      name: "qwen2.5",
      priority: 80,
      maxRetries: 3,
      timeout: 120000,
      contextWindow: 32768,
    },
    {
      name: "gemma2",
      priority: 75,
      maxRetries: 3,
      timeout: 120000,
      contextWindow: 8192,
    },
    {
      name: "mistral",
      priority: 70,
      maxRetries: 3,
      timeout: 120000,
      contextWindow: 32768,
    },
  ];

  /**
   * Get available models from Ollama with health status
   */
  static async getAvailableModels(): Promise<{
    models: Array<{
      name: string;
      size: number;
      modified: string;
      isHealthy: boolean;
      metrics?: ModelMetrics;
    }>;
    error?: string;
  }> {
    try {
      const health = await checkOllamaHealth();

      if (!health.isAvailable) {
        return {
          models: [],
          error: health.error,
        };
      }

      const baseURL = env.OLLAMA_BASE_URL || "http://localhost:11434";
      const response = await fetch(`${baseURL}/api/tags`);
      const data = (await response.json()) as {
        models: Array<{
          name: string;
          size: number;
          modified_at: string;
        }>;
      };

      return {
        models: data.models.map(model => ({
          name: model.name,
          size: model.size,
          modified: model.modified_at,
          isHealthy: true,
          metrics: this.modelMetrics.get(model.name),
        })),
      };
    } catch (error) {
      logger.error("Get available models error", error as Error);
      return {
        models: [],
        error: (error as Error).message,
      };
    }
  }

  /**
   * Select the best model based on requirements and current metrics
   */
  static async selectBestModel(
    requirements?: {
      minContextWindow?: number;
      maxLatency?: number;
      preferredModels?: string[];
    }
  ): Promise<string> {
    try {
      const { models } = await this.getAvailableModels();

      if (models.length === 0) {
        throw new Error("No models available");
      }

      // Filter by requirements
      let candidates = models;

      if (requirements?.minContextWindow) {
        candidates = candidates.filter(m => {
          const config = this.modelConfigs.find(c => c.name === m.name);
          return config && config.contextWindow >= requirements.minContextWindow!;
        });
      }

      if (requirements?.maxLatency && candidates.length > 0) {
        candidates = candidates.filter(m => {
          const metrics = this.modelMetrics.get(m.name);
          return !metrics || metrics.averageLatency <= requirements.maxLatency!;
        });
      }

      if (requirements?.preferredModels && requirements.preferredModels.length > 0) {
        const preferred = candidates.filter(m =>
          requirements.preferredModels!.some(p => m.name.includes(p))
        );
        if (preferred.length > 0) {
          candidates = preferred;
        }
      }

      if (candidates.length === 0) {
        // Fallback to any available model
        candidates = models;
      }

      // Score each candidate
      const scores = candidates.map(model => {
        const config = this.modelConfigs.find(c => c.name === model.name);
        const metrics = this.modelMetrics.get(model.name);

        let score = config?.priority || 50;

        if (metrics) {
          score += metrics.successRate * 20; // Boost by success rate
          score -= Math.min(metrics.averageLatency / 1000, 10); // Penalize high latency
        }

        return { model: model.name, score };
      });

      // Sort by score and return the best
      scores.sort((a, b) => b.score - a.score);

      if (scores.length === 0) {
        logger.warn("No models available, using fallback");
        return "llama3.2";
      }

      const bestModel = scores[0]!;

      logger.info("Selected best model", {
        model: bestModel.model,
        score: bestModel.score,
      });

      return bestModel.model;
    } catch (error) {
      logger.error("Select best model error", error as Error);
      return "llama3.2"; // Fallback
    }
  }

  /**
   * Generate with automatic fallback to other models
   */
  static async generateWithFallback(
    prompt: string,
    options?: GenerationOptions & { preferredModel?: string }
  ): Promise<{
    response: string;
    model: string;
    metadata: {
      latency: number;
      tokensUsed?: number;
      attemptedModels: string[];
    };
  }> {
    const attemptedModels: string[] = [];
    const startTime = Date.now();

    // Try preferred model first
    let models = options?.preferredModel
      ? [options.preferredModel]
      : [];

    // Add other available models
    const { models: availableModels } = await this.getAvailableModels();
    models.push(...availableModels.map(m => m.name));

    for (const modelName of models) {
      attemptedModels.push(modelName);

      try {
        const result = await this.generateWithModel(modelName, prompt, options);

        const latency = Date.now() - startTime;

        // Update metrics
        this.updateMetrics(modelName, latency, true);

        return {
          response: result.response,
          model: modelName,
          metadata: {
            latency,
            tokensUsed: result.tokensUsed,
            attemptedModels,
          },
        };
      } catch (error) {
        logger.warn("Model generation failed, trying next", {
          model: modelName,
          error: (error as Error).message,
        });

        this.updateMetrics(modelName, Date.now() - startTime, false);
      }
    }

    throw new Error(
      `All models failed. Attempted: ${attemptedModels.join(", ")}`
    );
  }

  /**
   * Generate with a specific model
   */
  private static async generateWithModel(
    model: string,
    prompt: string,
    options?: GenerationOptions
  ): Promise<{ response: string; tokensUsed?: number }> {
    const baseURL = env.OLLAMA_BASE_URL || "http://localhost:11434";

    const validation = await validateOllamaModel(model);
    if (!validation.isAvailable) {
      throw new Error(validation.error || `Model ${model} not available`);
    }

    const response = await fetch(`${baseURL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.7,
          top_p: options?.topP ?? 0.9,
          top_k: options?.topK ?? 40,
          repeat_penalty: options?.repeatPenalty ?? 1.1,
          num_predict: options?.maxTokens ?? 2000,
        },
        system: options?.system,
      }),
      signal: AbortSignal.timeout(options?.maxTokens ? options.maxTokens * 100 : 120000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      response: string;
      eval_count?: number;
    };

    return {
      response: data.response,
      tokensUsed: data.eval_count,
    };
  }

  /**
   * Simple text generation method for convenience
   * Wraps generateWithFallback for easier use
   */
  static async generateText(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      system?: string;
      model?: string;
    }
  ): Promise<string> {
    const result = await this.generateWithFallback(prompt, {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      system: options?.system,
      preferredModel: options?.model || env.OLLAMA_MODEL,
    });

    return result.response;
  }

  /**
   * Update model metrics
   */
  private static updateMetrics(
    model: string,
    latency: number,
    success: boolean
  ): void {
    const existing = this.modelMetrics.get(model);

    if (!existing) {
      this.modelMetrics.set(model, {
        model,
        averageLatency: latency,
        successRate: success ? 1 : 0,
        totalRequests: 1,
        lastUsed: new Date(),
      });
      return;
    }

    const totalRequests = existing.totalRequests + 1;
    const successCount = existing.successRate * existing.totalRequests + (success ? 1 : 0);

    this.modelMetrics.set(model, {
      model,
      averageLatency:
        (existing.averageLatency * existing.totalRequests + latency) / totalRequests,
      successRate: successCount / totalRequests,
      totalRequests,
      lastUsed: new Date(),
    });
  }

  /**
   * Get model metrics
   */
  static getModelMetrics(): ModelMetrics[] {
    return Array.from(this.modelMetrics.values());
  }

  /**
   * Pull a model from Ollama registry
   */
  static async pullModel(modelName: string): Promise<{
    success: boolean;
    error?: string;
    progress?: string;
  }> {
    try {
      const baseURL = env.OLLAMA_BASE_URL || "http://localhost:11434";

      const response = await fetch(`${baseURL}/api/pull`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: modelName,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      logger.info("Model pulled successfully", { modelName });
      return { success: true };
    } catch (error) {
      logger.error("Pull model error", error as Error, { modelName });
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Delete a model
   */
  static async deleteModel(modelName: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const baseURL = env.OLLAMA_BASE_URL || "http://localhost:11434";

      const response = await fetch(`${baseURL}/api/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: modelName,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      logger.info("Model deleted successfully", { modelName });
      return { success: true };
    } catch (error) {
      logger.error("Delete model error", error as Error, { modelName });
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get model information
   */
  static async getModelInfo(modelName: string): Promise<{
    name: string;
    size: number;
    parameters: string;
    quantization: string;
    family: string;
    format: string;
    error?: string;
  } | null> {
    try {
      const baseURL = env.OLLAMA_BASE_URL || "http://localhost:11434";

      const response = await fetch(`${baseURL}/api/show`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: modelName,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error("Get model info error", error as Error, { modelName });
      return null;
    }
  }
}
