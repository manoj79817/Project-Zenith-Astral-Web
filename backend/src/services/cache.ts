/**
 * Caching layer — In-memory cache with configurable TTL.
 */

import NodeCache from 'node-cache';

// Short TTL cache for live API responses (zenith calculations)
const shortCache = new NodeCache({
  stdTTL: 10,       // 10 seconds default
  checkperiod: 5,   // Check for expired keys every 5s
  useClones: false,  // Performance: don't deep clone
});

// Long TTL cache for TLE data and external API responses
const longCache = new NodeCache({
  stdTTL: 21600,    // 6 hours default
  checkperiod: 600, // Check every 10 minutes
  useClones: false,
});

export const zenithCache = {
  get: <T>(key: string): T | undefined => shortCache.get<T>(key),
  set: <T>(key: string, value: T, ttl?: number): boolean =>
    shortCache.set(key, value, ttl || 10),
  del: (key: string): number => shortCache.del(key),
  flush: (): void => shortCache.flushAll(),
  stats: () => shortCache.getStats(),
};

export const tleCache = {
  get: <T>(key: string): T | undefined => longCache.get<T>(key),
  set: <T>(key: string, value: T, ttl?: number): boolean =>
    longCache.set(key, value, ttl || 21600),
  del: (key: string): number => longCache.del(key),
  flush: (): void => longCache.flushAll(),
  stats: () => longCache.getStats(),
};

/**
 * Generic cached fetch wrapper
 */
export async function cachedFetch<T>(
  cache: typeof zenithCache | typeof tleCache,
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== undefined) {
    return cached;
  }

  const result = await fetcher();
  cache.set(key, result, ttl);
  return result;
}
