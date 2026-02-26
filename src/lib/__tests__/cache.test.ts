import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LRUCache, CacheService, CacheKeyGenerator, CacheWarming } from '@/lib/cache';

describe('Cache System', () => {
  describe('LRUCache', () => {
    let cache: LRUCache<string>;

    beforeEach(() => {
      cache = new LRUCache<string>(3); // Small cache for testing
    });

    afterEach(() => {
      cache.destroy();
    });

    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');

      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should respect TTL', async () => {
      cache.set('key1', 'value1', 1); // 1 second TTL

      expect(cache.get('key1')).toBe('value1');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(cache.get('key1')).toBeNull();
    });

    it('should evict LRU entry when cache is full', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Cache is now full (size 3)
      cache.set('key4', 'value4'); // Should evict key1 (least recently used)

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should update LRU order on access', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Access key1 to make it most recently used
      cache.get('key1');

      // Add key4, should evict key2 (now LRU)
      cache.set('key4', 'value4');

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeNull(); // Evicted
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should delete entries', () => {
      cache.set('key1', 'value1');

      expect(cache.get('key1')).toBe('value1');

      cache.delete('key1');

      expect(cache.get('key1')).toBeNull();
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });

    it('should track cache statistics', () => {
      cache.set('key1', 'value1');

      cache.get('key1'); // Hit
      cache.get('key2'); // Miss
      cache.get('key1'); // Hit

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(1);
      expect(stats.size).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.67, 1);
    });

    it('should track entry hit counts', () => {
      cache.set('key1', 'value1');

      cache.get('key1');
      cache.get('key1');
      cache.get('key1');

      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
    });

    it('should handle setting same key multiple times', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');

      expect(cache.get('key1')).toBe('value2');

      const stats = cache.getStats();
      expect(stats.size).toBe(1);
    });

    it('should handle complex data types', () => {
      const cache = new LRUCache<any>(3);
      const complexData = {
        id: 1,
        name: 'Test',
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' },
        },
      };

      cache.set('complex', complexData);

      const retrieved = cache.get('complex');
      expect(retrieved).toEqual(complexData);
    });

    it('should cleanup expired entries automatically', async () => {
      cache.set('key1', 'value1', 0.5); // 0.5 seconds
      cache.set('key2', 'value2', 10); // 10 seconds

      // Wait for key1 to expire and cleanup to run
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });

    it('should handle concurrent access', async () => {
      const promises: Promise<void>[] = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          Promise.resolve().then(() => {
            cache.set(`key${i}`, `value${i}`);
          })
        );
      }

      await Promise.all(promises);

      const stats = cache.getStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should return null after deletion', () => {
      cache.set('key1', 'value1');
      cache.delete('key1');

      expect(cache.get('key1')).toBeNull();

      const stats = cache.getStats();
      expect(stats.deletes).toBe(1);
    });
  });

  describe('CacheService', () => {
    let cacheService: CacheService;

    beforeEach(() => {
      cacheService = new CacheService('test');
    });

    describe('get and set', () => {
      it('should set and get values', async () => {
        await cacheService.set('key1', 'value1');
        const value = await cacheService.get('key1');

        expect(value).toBe('value1');
      });

      it('should return null for missing keys', async () => {
        const value = await cacheService.get('nonexistent');

        expect(value).toBeNull();
      });

      it('should use namespace in keys', async () => {
        const service1 = new CacheService('namespace1');
        const service2 = new CacheService('namespace2');

        await service1.set('key', 'value1');
        await service2.set('key', 'value2');

        expect(await service1.get('key')).toBe('value1');
        expect(await service2.get('key')).toBe('value2');
      });
    });

    describe('getOrSet', () => {
      it('should use factory on cache miss', async () => {
        let factoryCalled = 0;
        const factory = async () => {
          factoryCalled++;
          return 'generated-value';
        };

        const value = await cacheService.getOrSet('key', factory);

        expect(value).toBe('generated-value');
        expect(factoryCalled).toBe(1);
      });

      it('should use cached value on cache hit', async () => {
        let factoryCalled = 0;
        const factory = async () => {
          factoryCalled++;
          return 'generated-value';
        };

        // First call - cache miss
        await cacheService.getOrSet('key', factory);

        // Second call - cache hit
        const value = await cacheService.getOrSet('key', factory);

        expect(value).toBe('generated-value');
        expect(factoryCalled).toBe(1); // Factory called only once
      });

      it('should handle factory errors', async () => {
        const factory = async () => {
          throw new Error('Factory error');
        };

        await expect(cacheService.getOrSet('key', factory)).rejects.toThrow('Factory error');
      });

      it('should respect TTL', async () => {
        const factory = async () => 'value';

        await cacheService.getOrSet('key', factory, 1); // 1 second TTL

        expect(await cacheService.get('key')).toBe('value');

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 1100));

        expect(await cacheService.get('key')).toBeNull();
      });
    });

    describe('delete and clear', () => {
      it('should delete specific keys', async () => {
        await cacheService.set('key1', 'value1');
        await cacheService.set('key2', 'value2');

        await cacheService.delete('key1');

        expect(await cacheService.get('key1')).toBeNull();
        expect(await cacheService.get('key2')).toBe('value2');
      });

      it('should clear all keys in namespace', async () => {
        await cacheService.set('key1', 'value1');
        await cacheService.set('key2', 'value2');

        await cacheService.clear();

        expect(await cacheService.get('key1')).toBeNull();
        expect(await cacheService.get('key2')).toBeNull();
      });
    });

    describe('warm', () => {
      it('should warm cache with multiple values', async () => {
        const data = [
          { key: 'key1', value: 'value1', ttl: 3600 },
          { key: 'key2', value: 'value2', ttl: 3600 },
          { key: 'key3', value: 'value3', ttl: 3600 },
        ];

        await cacheService.warm(data);

        expect(await cacheService.get('key1')).toBe('value1');
        expect(await cacheService.get('key2')).toBe('value2');
        expect(await cacheService.get('key3')).toBe('value3');
      });

      it('should handle empty data array', async () => {
        await expect(cacheService.warm([])).resolves.not.toThrow();
      });
    });
  });

  describe('CacheKeyGenerator', () => {
    it('should generate consistent presentation keys', () => {
      const key1 = CacheKeyGenerator.presentation('pres456');
      const key2 = CacheKeyGenerator.presentation('pres456');

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = CacheKeyGenerator.presentation('pres1');
      const key2 = CacheKeyGenerator.presentation('pres2');

      expect(key1).not.toBe(key2);
    });

    it('should generate user keys', () => {
      const key = CacheKeyGenerator.user('user123');

      expect(key).toContain('user:');
      expect(key).toContain('user123');
    });

    it('should generate AI response keys', () => {
      const key = CacheKeyGenerator.aiResponse('test prompt', 'llama3.2');

      expect(key).toContain('ai:');
      expect(key).toBeDefined();
    });

    it('should generate theme keys', () => {
      const key = CacheKeyGenerator.theme('theme123');

      expect(key).toContain('theme:');
      expect(key).toContain('theme123');
    });

    it('should generate template keys', () => {
      const key = CacheKeyGenerator.template('template123');

      expect(key).toContain('template:');
      expect(key).toContain('template123');
    });

    it('should hash long prompts for AI responses', () => {
      const longPrompt = 'a'.repeat(1000);
      const key = CacheKeyGenerator.aiResponse(longPrompt, 'model');

      // Key should be reasonably short despite long prompt
      expect(key.length).toBeLessThan(200);
    });
  });

  describe('CacheWarming', () => {
    describe('warmPopularPresentations', () => {
      it('should warm cache with popular presentations', async () => {
        const mockDb = {
          baseDocument: {
            findMany: vi.fn().mockResolvedValue([
              { id: 'pres1', title: 'Presentation 1' },
              { id: 'pres2', title: 'Presentation 2' },
            ]),
          },
        };

        await CacheWarming.warmPopularPresentations(mockDb as any);

        expect(mockDb.baseDocument.findMany).toHaveBeenCalled();
      });

      it('should handle database errors gracefully', async () => {
        const mockDb = {
          baseDocument: {
            findMany: vi.fn().mockRejectedValue(new Error('DB Error')),
          },
        };

        await expect(
          CacheWarming.warmPopularPresentations(mockDb as any)
        ).resolves.not.toThrow();
      });
    });

    describe('warmThemes', () => {
      it('should warm cache with themes', async () => {
        const mockDb = {
          customTheme: {
            findMany: vi.fn().mockResolvedValue([
              { id: 'theme1', name: 'Theme 1' },
              { id: 'theme2', name: 'Theme 2' },
            ]),
          },
        };

        await CacheWarming.warmThemes(mockDb as any);

        expect(mockDb.customTheme.findMany).toHaveBeenCalled();
      });
    });

    describe('warmTemplates', () => {
      it('should warm cache with templates', async () => {
        const mockDb = {
          presentationTemplate: {
            findMany: vi.fn().mockResolvedValue([
              { id: 'template1', name: 'Template 1' },
              { id: 'template2', name: 'Template 2' },
            ]),
          },
        };

        await CacheWarming.warmTemplates(mockDb as any);

        expect(mockDb.presentationTemplate.findMany).toHaveBeenCalled();
      });
    });
  });

  describe('Specialized Cache Instances', () => {
    it('should export presentationCache', () => {
      const { presentationCache } = require('@/lib/cache');

      expect(presentationCache).toBeDefined();
      expect(typeof presentationCache.set).toBe('function');
      expect(typeof presentationCache.get).toBe('function');
    });

    it('should export aiCache', () => {
      const { aiCache } = require('@/lib/cache');

      expect(aiCache).toBeDefined();
    });

    it('should export userCache', () => {
      const { userCache } = require('@/lib/cache');

      expect(userCache).toBeDefined();
    });

    it('should export themeCache', () => {
      const { themeCache } = require('@/lib/cache');

      expect(themeCache).toBeDefined();
    });

    it('should export templateCache', () => {
      const { templateCache } = require('@/lib/cache');

      expect(templateCache).toBeDefined();
    });
  });

  describe('Cache Performance', () => {
    it('should handle high volume of operations', () => {
      const cache = new LRUCache<number>(1000);

      const start = Date.now();

      // Set 1000 items
      for (let i = 0; i < 1000; i++) {
        cache.set(`key${i}`, i);
      }

      // Get 1000 items
      for (let i = 0; i < 1000; i++) {
        cache.get(`key${i}`);
      }

      const duration = Date.now() - start;

      // Should complete in reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);

      cache.destroy();
    });

    it('should maintain performance with evictions', () => {
      const cache = new LRUCache<number>(100);

      const start = Date.now();

      // Add more items than capacity
      for (let i = 0; i < 500; i++) {
        cache.set(`key${i}`, i);
      }

      const duration = Date.now() - start;

      // Should handle evictions efficiently
      expect(duration).toBeLessThan(100);
      expect(cache.getStats().size).toBe(100);

      cache.destroy();
    });
  });

  describe('Error Handling', () => {
    it('should handle circular references in data', () => {
      const cache = new LRUCache<any>(10);

      const circular: any = { name: 'test' };
      circular.self = circular;

      // Should not throw
      expect(() => cache.set('circular', circular)).not.toThrow();

      cache.destroy();
    });

    it('should handle null and undefined values', () => {
      const cache = new LRUCache<any>(10);

      cache.set('null', null);
      cache.set('undefined', undefined);

      expect(cache.get('null')).toBeNull();
      expect(cache.get('undefined')).toBeNull();

      cache.destroy();
    });
  });
});
