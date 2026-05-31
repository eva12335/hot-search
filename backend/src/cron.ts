import { refreshAll } from "./routes/hot.js";
import { getCache, setCache, getCache as getCacheEntry } from "./cache.js";
import { insertSnapshot, cleanOldSnapshots } from "./db.js";
import type { HotItem } from "./adapters/weibo.js";

const PLATFORMS = ["weibo", "zhihu", "bilibili", "huggingface", "github"];

/** 对比上一轮快照，计算 delta */
function computeDelta(platform: string, current: HotItem[]): HotItem[] {
  // 从缓存获取上一轮数据（在 refreshAll 更新缓存之前已存入）
  const prev = getCacheEntry(`hot:prev:${platform}`);
  if (!prev?.data || prev.data.length === 0) {
    // 首次采集，全部标记为 new
    return current.map((item) => ({ ...item, delta: "new" as const }));
  }
  const prevMap = new Map(prev.data.map((item) => ({ ...item, rank: item.rank })).map((item) => [item.title, item]));
  return current.map((item) => {
    const prevItem = prevMap.get(item.title);
    if (!prevItem) return { ...item, delta: "new" as const };
    if (prevItem.rank === item.rank) return { ...item, delta: "same" as const };
    return { ...item, delta: prevItem.rank > item.rank ? "up" as const : "down" as const };
  });
}

/** 启动定时刷新任务 */
export function startCron(intervalMs: number): void {
  console.log(`[cron] 定时刷新已启动，间隔 ${intervalMs / 1000}s`);

  // 启动后立即刷新一次
  refreshAll().then(() => saveSnapshots());

  // 定时循环
  setInterval(async () => {
    // 保存上一轮数据用于 delta 计算
    for (const p of PLATFORMS) {
      const entry = getCacheEntry(`hot:${p}`);
      if (entry) {
        setCache(`hot:prev:${p}`, entry.data);
      }
    }

    await refreshAll();

    // 计算 delta 并写入 SQLite
    saveSnapshots();
  }, intervalMs);

  // 每小时清理 7 天前数据
  setInterval(() => {
    cleanOldSnapshots();
  }, 3_600_000);
}

/** 将当前缓存数据写入 SQLite，并计算 delta */
function saveSnapshots(): void {
  for (const p of PLATFORMS) {
    const entry = getCacheEntry(`hot:${p}`);
    if (entry?.data && entry.data.length > 0) {
      const withDelta = computeDelta(p, entry.data);
      // 更新缓存中的 delta 字段
      setCache(`hot:${p}`, withDelta);
      // 写入 SQLite 历史快照
      insertSnapshot(p, withDelta);
    }
  }
}
