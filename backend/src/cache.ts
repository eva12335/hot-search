import type { HotItem } from "./adapters/weibo.js";

/** 历史快照：某个时间点的热搜数据 */
interface HistorySnapshot {
  time: string;    // ISO 时间
  items: HotItem[]; // 该时间点的热搜列表
}

/** 缓存条目结构：当前数据 + 历史快照 */
export interface CacheEntry {
  data: HotItem[];
  fetchedAt: number;
  expiresAt: number;
  history: HistorySnapshot[];
}

const CACHE_TTL = parseInt(process.env.CACHE_TTL || "600", 10);
const MAX_HISTORY = 30; // 最多保留 30 个快照

const store = new Map<string, CacheEntry>();

/** 判断缓存数据状态 */
export function dataState(entry: CacheEntry): "fresh" | "stale" | "invalid" {
  const now = Date.now();
  if (now < entry.expiresAt) return "fresh";
  if (now < entry.fetchedAt + CACHE_TTL * 2 * 1000) return "stale";
  return "invalid";
}

/** 存入缓存，同时追加历史快照 */
export function setCache(key: string, data: HotItem[]): void {
  const now = Date.now();
  const snapshot: HistorySnapshot = {
    time: new Date(now).toISOString(),
    items: data,
  };
  const existing = store.get(key);
  const history = existing?.history ?? [];
  history.push(snapshot);
  if (history.length > MAX_HISTORY) history.shift();
  store.set(key, {
    data,
    fetchedAt: now,
    expiresAt: now + CACHE_TTL * 1000,
    history,
  });
}

/** 读取缓存条目 */
export function getCache(key: string): CacheEntry | undefined {
  return store.get(key);
}

export default store;
