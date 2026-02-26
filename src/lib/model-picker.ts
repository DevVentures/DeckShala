import { createOpenAI } from "@ai-sdk/openai";
import { type LanguageModelV1 } from "ai";
import { createOllama } from "ollama-ai-provider";
import { env } from "@/env"; import { logger } from "@/lib/logger"; import { checkOllamaHealth, validateOllamaModel } from "./ollama-health-check";

/**
 * Configuration for model provider with retry and timeout settings
 */
interface ModelProviderConfig {
  maxRetries?: number;
  timeout?: number; // in milliseconds
}

/**
 * Get configuration from environment with fallback defaults
 */
function getProviderConfig(): ModelProviderConfig {
  return {
    maxRetries: parseInt(env.OLLAMA_MAX_RETRIES || "3", 10),
    timeout: parseInt(env.OLLAMA_TIMEOUT_MS || "120000", 10), // 2 minutes default
  };
}

/**
 * Centralized model picker function for all presentation generation routes
 * Supports Ollama (default), OpenAI, and LM Studio models
 * 
 * @throws {Error} When model provider is unavailable or misconfigured
 */
export async function modelPicker(
  modelProvider: string,
  modelId?: string,
  baseURL?: string,
): Promise<LanguageModelV1> {
  const config = getProviderConfig();

  // Use Ollama as default provider
  if (modelProvider === "ollama" || !modelProvider) {
    const ollamaBaseURL = baseURL || env.OLLAMA_BASE_URL || "http://localhost:11434";
    const model = modelId || "llama3.2";

    // Perform health check before creating model instance
    const health = await checkOllamaHealth();
    if (!health.isAvailable) {
      throw new Error(
        `Ollama service is unavailable: ${health.error}. Please ensure Ollama is running with 'ollama serve'`
      );
    }

    // Validate the specific model is available
    const modelValidation = await validateOllamaModel(model);
    if (!modelValidation.isAvailable) {
      console.warn(`Model validation failed: ${modelValidation.error}`);
      // Don't throw here - let Ollama handle it and provide fallback suggestion
    }

    try {
      const ollama = createOllama({
        baseURL: ollamaBaseURL,
      });

      return ollama(model, {
        // Add timeout and other configurations
        // Note: ollama-ai-provider may not support these directly,
        // but they're good for documentation
      }) as unknown as LanguageModelV1;
    } catch (error) {
      throw new Error(
        `Failed to create Ollama model '${model}': ${error instanceof Error ? error.message : "Unknown error"}. Try running 'ollama pull ${model}'`
      );
    }
  }

  if (modelProvider === "lmstudio" && modelId) {
    // Use LM Studio with OpenAI compatible provider
    try {
      const lmstudio = createOpenAI({
        name: "lmstudio",
        baseURL: baseURL || "http://localhost:1234/v1",
        apiKey: "lmstudio", // LM Studio doesn't require a real API key
      });
      return lmstudio(modelId) as unknown as LanguageModelV1;
    } catch (error) {
      throw new Error(
        `Failed to create LM Studio model: ${error instanceof Error ? error.message : "Unknown error"}. Ensure LM Studio is running on localhost:1234`
      );
    }
  }

  if (modelProvider === "openai" && modelId) {
    // OpenAI provider (requires API key)
    if (!env.OPENAI_API_KEY) {
      throw new Error(
        "OpenAI API key is required. Please set OPENAI_API_KEY in your environment variables."
      );
    }

    try {
      const openai = createOpenAI({
        apiKey: env.OPENAI_API_KEY,
      });
      return openai(modelId) as unknown as LanguageModelV1;
    } catch (error) {
      throw new Error(
        `Failed to create OpenAI model: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // Fallback to Ollama with default model
  console.warn(
    `Unknown model provider '${modelProvider}', falling back to Ollama with llama3.2`
  );

  // Perform health check for fallback too
  const health = await checkOllamaHealth();
  if (!health.isAvailable) {
    throw new Error(
      `Fallback to Ollama failed - service is unavailable: ${health.error}`
    );
  }

  const ollama = createOllama({
    baseURL: env.OLLAMA_BASE_URL || "http://localhost:11434",
  });
  return ollama("llama3.2") as unknown as LanguageModelV1;
}

/**
 * Synchronous version of model picker for backward compatibility
 * Note: This won't perform health checks. Use async version when possible.
 * 
 * @deprecated Use async modelPicker instead for better error handling
 */
export function modelPickerSync(
  modelProvider: string,
  modelId?: string,
  baseURL?: string,
): LanguageModelV1 {
  // Use Ollama as default provider
  if (modelProvider === "ollama" || !modelProvider) {
    const ollamaBaseURL = baseURL || env.OLLAMA_BASE_URL || "http://localhost:11434";
    const ollama = createOllama({
      baseURL: ollamaBaseURL,
    });
    const model = modelId || "llama3.2";
    return ollama(model) as unknown as LanguageModelV1;
  }

  if (modelProvider === "lmstudio" && modelId) {
    const lmstudio = createOpenAI({
      name: "lmstudio",
      baseURL: "http://localhost:1234/v1",
      apiKey: "lmstudio",
    });
    return lmstudio(modelId) as unknown as LanguageModelV1;
  }

  if (modelProvider === "openai" && modelId) {
    const openai = createOpenAI();
    return openai(modelId) as unknown as LanguageModelV1;
  }

  // Fallback to Ollama with default model
  const ollama = createOllama({
    baseURL: env.OLLAMA_BASE_URL || "http://localhost:11434",
  });
  return ollama("llama3.2") as unknown as LanguageModelV1;
}

