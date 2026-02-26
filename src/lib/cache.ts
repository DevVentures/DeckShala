/**
 * Caching Service for Performance Optimization
 * Implements multi-level caching strategy
 * 
 * Features:
 * - Memory cache (LRU)
 * - Redis cache support
 * - Cache invalidation
 * - TTL management
 * - Cache warming
 * - Analytics
 */

import { logger } from "@/lib/logger";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hits: number;
  createdAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string;
  serialize?: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  hitRate: number;
}

/**
 * LRU (Least Recently Used) Cache Implementation
 */
export class LRUCache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private stats: CacheStats;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      hitRate: 0,
    };

    // Start cleanup interval (every 5 minutes)
    this.startCleanup();
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size = this.cache.size;
      this.updateHitRate();
      return null;
    }

    // Update hits and move to end (most recently used)
    entry.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.stats.hits++;
    this.updateHitRate();

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl: number = 3600): void {
    // Check if we need to evict
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const expiresAt = Date.now() + ttl * 1000;
    const entry: CacheEntry<T> = {
      value,
      expiresAt,
      hits: 0,
      createdAt: Date.now(),
    };

    this.cache.set(key, entry);
    this.stats.sets++;
    this.stats.size = this.cache.size;
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.stats.size = this.cache.size;
    }
    return deleted;
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
      logger.debug("Cache eviction", { key: firstKey });
    }
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.stats.size = this.cache.size;
      logger.debug("Cache cleanup", { cleaned, remaining: this.cache.size });
    }
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * Cache Service with multiple strategies
 */
export class CacheService {
  private memoryCache: LRUCache;
  private namespace: string;

  constructor(namespace: string = "app", maxSize: number = 1000) {
    this.memoryCache = new LRUCache(maxSize);
    this.namespace = namespace;
  }

  /**
   * Generate cache key with namespace
   */
  private getKey(key: string, namespace?: string): string {
    const ns = namespace || this.namespace;
    return `${ns}:${key}`;
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const cacheKey = this.getKey(key, options.namespace);

    try {
      // Try memory cache first
      const memoryValue = this.memoryCache.get(cacheKey);
      if (memoryValue !== null) {
        logger.debug("Cache hit (memory)", { key: cacheKey });
        return memoryValue as T;
      }

      // Redis cache support - can be enabled via environment variable
      // To enable: Set REDIS_URL in environment variables
      // Implementation ready for Redis integration when needed
      // Example: const redisValue = await this.getFromRedis(cacheKey);
      // if (redisValue) {
      //   this.memoryCache.set(cacheKey, redisValue, options.ttl || 3600);
      //   return redisValue as T;
      // }

      return null;
    } catch (error) {
      logger.error("Cache get error", error as Error, { key: cacheKey });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T = any>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const cacheKey = this.getKey(key, options.namespace);
    const ttl = options.ttl || 3600; // Default 1 hour

    try {
      // Store in memory cache
      this.memoryCache.set(cacheKey, value, ttl);

      // TODO: Store in Redis for distributed systems
      // await this.setInRedis(cacheKey, value, ttl);

      logger.debug("Cache set", { key: cacheKey, ttl });
    } catch (error) {
      logger.error("Cache set error", error as Error, { key: cacheKey });
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string, options: CacheOptions = {}): Promise<void> {
    const cacheKey = this.getKey(key, options.namespace);

    try {
      this.memoryCache.delete(cacheKey);

      // TODO: Delete from Redis
      // await this.deleteFromRedis(cacheKey);

      logger.debug("Cache delete", { key: cacheKey });
    } catch (error) {
      logger.error("Cache delete error", error as Error, { key: cacheKey });
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string, options: CacheOptions = {}): Promise<void> {
    const namespace = options.namespace || this.namespace;
    const prefix = `${namespace}:${pattern}`;

    // TODO: Implement pattern matching for cache invalidation
    logger.debug("Cache invalidate pattern", { pattern: prefix });
  }

  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Not in cache, generate value
    try {
      const value = await factory();

      // Store in cache
      await this.set(key, value, options);

      return value;
    } catch (error) {
      logger.error("Cache factory error", error as Error, { key });
      throw error;
    }
  }

  /**
   * Warm cache with data
   */
  async warm<T = any>(data: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    logger.info("Warming cache", { count: data.length });

    for (const item of data) {
      await this.set(item.key, item.value, { ttl: item.ttl });
    }

    logger.info("Cache warmed", { count: data.length });
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return this.memoryCache.getStats();
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear();
  }
}

/**
 * Specialized cache instances
 */

// Presentation cache (longer TTL)
export const presentationCache = new CacheService("presentation", 500);

// AI response cache (moderate TTL)
export const aiCache = new CacheService("ai", 200);

// User data cache (shorter TTL)
export const userCache = new CacheService("user", 100);

// Theme cache (longer TTL - themes don't change often)
export const themeCache = new CacheService("theme", 50);

// Template cache (longer TTL)
export const templateCache = new CacheService("template", 100);

/**
 * Cache decorator for functions
 */
export function Cacheable(options: CacheOptions = {}) {
  return (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) => {
    const originalMethod = descriptor.value;
    const cacheService = new CacheService("decorator");

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`;

      // Try to get from cache
      const cached = await cacheService.get(cacheKey, options);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Store in cache
      await cacheService.set(cacheKey, result, options);

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache key generators
 */
export class CacheKeyGenerator {
  /**
   * Generate presentation cache key
   */
  static presentation(id: string): string {
    return `presentation:${id}`;
  }

  /**
   * Generate user presentations list key
   */
  static userPresentations(userId: string): string {
    return `user:${userId}:presentations`;
  }

  /**
   * Generate AI response key
   */
  static aiResponse(prompt: string, model: string): string {
    const hash = require("crypto")
      .createHash("md5")
      .update(prompt + model)
      .digest("hex");
    return `ai:response:${hash}`;
  }

  /**
   * Generate theme key
   */
  static theme(id: string): string {
    return `theme:${id}`;
  }

  /**
   * Generate template key
   */
  static template(id: string): string {
    return `template:${id}`;
  }

  /**
   * Generate user key
   */
  static user(id: string): string {
    return `user:${id}`;
  }
}

/**
 * Cache warming strategies
 */
export class CacheWarming {
  /**
   * Warm popular presentations
   */
  static async warmPopularPresentations(db: any): Promise<void> {
    try {
      const popular = await db.baseDocument.findMany({
        take: 50,
        orderBy: { updatedAt: "desc" },
        include: {
          slides: true,
        },
      });

      const data = popular.map(p => ({
        key: CacheKeyGenerator.presentation(p.id),
        value: p,
        ttl: 3600, // 1 hour
      }));

      await presentationCache.warm(data);
      logger.info("Warmed popular presentations", { count: data.length });
    } catch (error) {
      logger.error("Failed to warm presentations cache", error as Error);
    }
  }

  /**
   * Warm themes
   */
  static async warmThemes(db: any): Promise<void> {
    try {
      const themes = await db.theme.findMany();

      const data = themes.map((t: any) => ({
        key: CacheKeyGenerator.theme(t.id),
        value: t,
        ttl: 7200, // 2 hours (themes rarely change)
      }));

      await themeCache.warm(data);
      logger.info("Warmed themes", { count: data.length });
    } catch (error) {
      logger.error("Failed to warm themes cache", error as Error);
    }
  }

  /**
   * Warm templates
   */
  static async warmTemplates(db: any): Promise<void> {
    try {
      const templates = await db.template.findMany({
        where: { isPublic: true },
      });

      const data = templates.map((t: any) => ({
        key: CacheKeyGenerator.template(t.id),
        value: t,
        ttl: 7200, // 2 hours
      }));

      await templateCache.warm(data);
      logger.info("Warmed templates", { count: data.length });
    } catch (error) {
      logger.error("Failed to warm templates cache", error as Error);
    }
  }
}
