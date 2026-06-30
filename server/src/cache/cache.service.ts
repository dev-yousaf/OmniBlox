import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
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
  }

  async del(cacheKey: string): Promise<void> {
    await this.cacheManager.del(cacheKey);
  }
}
