import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

/**
 * Wraps the cache-manager store with an in-memory key registry so keys can be
 * invalidated by pattern. The registry mirrors the store because the app runs
 * the default in-memory adapter (store and registry share process lifetime).
 */
@Injectable()
export class CacheService {
  private readonly trackedKeys = new Set<string>();

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async get<T>(cacheKey: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(cacheKey);
  }

  async set(cacheKey: string, value: unknown, ttlSec?: number): Promise<void> {
    if (ttlSec) {
      await this.cacheManager.set(cacheKey, value, ttlSec * 1000);
    } else {
      await this.cacheManager.set(cacheKey, value);
    }
    this.trackedKeys.add(cacheKey);
  }

  async del(cacheKey: string): Promise<void> {
    await this.cacheManager.del(cacheKey);
    this.trackedKeys.delete(cacheKey);
  }

  async reset(): Promise<void> {
    await this.cacheManager.clear();
    this.trackedKeys.clear();
  }

  /**
   * Delete every tracked key matching a glob-ish pattern (only `*` wildcards
   * supported; `*` matches anything including colons).
   */
  async delByPattern(pattern: string): Promise<void> {
    const regex = new RegExp(
      '^' +
        pattern
          .split('*')
          .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('.*') +
        '$',
    );

    const matches = Array.from(this.trackedKeys).filter((key) =>
      regex.test(key),
    );
    if (!matches.length) return;
    await Promise.all(
      matches.map((key) => this.cacheManager.del(key)),
    );
    for (const key of matches) this.trackedKeys.delete(key);
  }
}
