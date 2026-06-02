import type { HotItem } from "./adapters/weibo.js";

/** 缓存条目结构：单条数据 + 时间戳 */
export interface CacheEntry {
  data: HotItem[];
  fetchedAt: number;  // 采集时间 (unix ms)
  expiresAt: number;  // 过期时间 (unix ms) = fetchedAt + CACHE_TTL * 1000
}

const CACHE_TTL = parseInt(process.env.CACHE_TTL || "600", 10); // 默认 10 分钟

const store = new Map<string, CacheEntry>();

/** 判断缓存数据状态 */
export function dataState(entry: CacheEntry): "fresh" | "stale" | "invalid" {
  const now = Date.now();
  if (now < entry.expiresAt) return "fresh";
  if (now < entry.fetchedAt + CACHE_TTL * 2 * 1000) return "stale";
  return "invalid";
}

/** 存入缓存（带时间戳） */
export function setCache(key: string, data: HotItem[]): void {
  const now = Date.now();
  store.set(key, {
    data,
    fetchedAt: now,
    expiresAt: now + CACHE_TTL * 1000,
  });
}

/** 读取缓存条目 */
export function getCache(key: string): CacheEntry | undefined {
  return store.get(key);
}

export default store;
