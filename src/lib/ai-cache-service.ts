import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import crypto from "crypto";

interface CacheOptions {
  expiresIn?: number; // in seconds, default 7 days
  model: string;
  provider: string;
}

/**
 * Advanced AI Generation Cache Service
 * Reduces costs and improves response times by caching AI responses
 */
export class AIGenerationCacheService {
  private static readonly DEFAULT_EXPIRY = 7 * 24 * 60 * 60; // 7 days

  /**
   * Generate a cache key from prompt and model
   */
  static generateCacheKey(prompt: string, model: string, provider: string): string {
    const normalized = `${provider}:${model}:${prompt.trim().toLowerCase()}`;
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Get cached AI response
   */
  static async get(
    prompt: string,
    model: string,
    provider: string
  ): Promise<{ response: unknown; metadata: { tokensUsed?: number; latencyMs?: number } } | null> {
    try {
      const cacheKey = this.generateCacheKey(prompt, model, provider);

      const cached = await db.aIGenerationCache.findUnique({
        where: { cacheKey },
      });

      if (!cached) {
        return null;
      }

      // Check if expired
      if (cached.expiresAt && cached.expiresAt < new Date()) {
        // Expired - delete and return null
        await db.aIGenerationCache.delete({
          where: { id: cached.id },
        });
        logger.debug("Cache expired", { cacheKey });
        return null;
      }

      // Update hit count and last accessed
      await db.aIGenerationCache.update({
        where: { id: cached.id },
        data: {
          hitCount: { increment: 1 },
          lastAccessedAt: new Date(),
        },
      });

      logger.info("Cache hit", {
        cacheKey,
        hitCount: cached.hitCount + 1,
        provider,
        model,
      });

      return {
        response: cached.response,
        metadata: {
          tokensUsed: cached.tokensUsed ?? undefined,
          latencyMs: cached.latencyMs ?? undefined,
        },
      };
    } catch (error) {
      logger.error("Cache get error", error as Error, { prompt, model, provider });
      return null;
    }
  }

  /**
   * Store AI response in cache
   */
  static async set(
    prompt: string,
    response: unknown,
    options: CacheOptions,
    metadata?: { tokensUsed?: number; latencyMs?: number }
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(prompt, options.model, options.provider);
      const expiresAt = new Date(Date.now() + (options.expiresIn ?? this.DEFAULT_EXPIRY) * 1000);

      await db.aIGenerationCache.upsert({
        where: { cacheKey },
        create: {
          cacheKey,
          prompt,
          model: options.model,
          provider: options.provider,
          response: response as any,
          tokensUsed: metadata?.tokensUsed,
          latencyMs: metadata?.latencyMs,
          expiresAt,
        },
        update: {
          response: response as any,
          tokensUsed: metadata?.tokensUsed,
          latencyMs: metadata?.latencyMs,
          expiresAt,
          lastAccessedAt: new Date(),
        },
      });

      logger.info("Cache set", {
        cacheKey,
        provider: options.provider,
        model: options.model,
        tokensUsed: metadata?.tokensUsed,
      });
    } catch (error) {
      logger.error("Cache set error", error as Error, { prompt, options });
    }
  }

  /**
   * Cleanup expired cache entries
   */
  static async cleanup(): Promise<number> {
    try {
      const result = await db.aIGenerationCache.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      logger.info("Cache cleanup completed", { deletedCount: result.count });
      return result.count;
    } catch (error) {
      logger.error("Cache cleanup error", error as Error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{
    totalEntries: number;
    totalHits: number;
    avgHitCount: number;
    topModels: Array<{ model: string; provider: string; count: number }>;
  }> {
    try {
      const totalEntries = await db.aIGenerationCache.count();

      const stats = await db.aIGenerationCache.aggregate({
        _sum: { hitCount: true },
        _avg: { hitCount: true },
      });

      // Get top models
      const topModelsRaw = await db.aIGenerationCache.groupBy({
        by: ['model', 'provider'],
        _count: true,
        orderBy: {
          _count: {
            model: 'desc',
          },
        },
        take: 10,
      });

      const topModels = topModelsRaw.map(item => ({
        model: item.model,
        provider: item.provider,
        count: item._count,
      }));

      return {
        totalEntries,
        totalHits: stats._sum.hitCount ?? 0,
        avgHitCount: stats._avg.hitCount ?? 0,
        topModels,
      };
    } catch (error) {
      logger.error("Cache stats error", error as Error);
      return {
        totalEntries: 0,
        totalHits: 0,
        avgHitCount: 0,
        topModels: [],
      };
    }
  }

  /**
   * Clear all cache
   */
  static async clearAll(): Promise<number> {
    try {
      const result = await db.aIGenerationCache.deleteMany({});
      logger.info("Cache cleared", { deletedCount: result.count });
      return result.count;
    } catch (error) {
      logger.error("Cache clear error", error as Error);
      return 0;
    }
  }
}
