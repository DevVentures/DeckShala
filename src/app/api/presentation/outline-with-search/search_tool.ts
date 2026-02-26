import { env } from "@/env";
import { logger } from "@/lib/logger";
import { tavily } from "@tavily/core";
import { type Tool } from "ai";
import z from "zod";

/**
 * Create search tool with proper error handling
 * Returns null if TAVILY_API_KEY is not configured
 */
export function createSearchTool(): Tool | null {
  // Check if Tavily API key is configured
  if (!env.TAVILY_API_KEY) {
    logger.warn(
      "TAVILY_API_KEY not configured. Web search functionality will be disabled."
    );
    return null;
  }

  const tavilyService = tavily({ apiKey: env.TAVILY_API_KEY });

  return {
    description:
      "A search engine optimized for comprehensive, accurate, and trusted results. Useful for when you need to answer questions about current events like news, weather, stock price etc. Input should be a search query.",
    parameters: z.object({
      query: z.string(),
    }),
    execute: async ({ query }: { query: string }) => {
      try {
        const response = await tavilyService.search(query, { max_results: 5 });
        return JSON.stringify(response);
      } catch (error) {
        logger.error("Search error", error as Error);
        // Return error info instead of just "Search failed"
        return JSON.stringify({
          error: "Search failed",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  };
}

// Export the tool (may be null if not configured)
export const search_tool = createSearchTool();
