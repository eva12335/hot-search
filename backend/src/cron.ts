import { refreshAll } from "./routes/hot.js";
import { getCache } from "./cache.js";
import { insertSnapshot, cleanOldSnapshots } from "./db.js";

const PLATFORMS = ["weibo", "zhihu", "bilibili", "baidu", "huggingface", "github"];

/** 启动定时刷新任务 */
export function startCron(intervalMs: number): void {
  console.log(`[cron] 定时刷新已启动，间隔 ${intervalMs / 1000}s`);

  // 启动后立即刷新一次（fetchPlatform 内部会计算 delta）
  refreshAll().then(() => saveSnapshots());

  // 定时循环
  setInterval(async () => {
    await refreshAll();
    // delta 已在 fetchPlatform 中计算并写入缓存，此处仅持久化到 SQLite
    saveSnapshots();
  }, intervalMs);

  // 每小时清理 7 天前数据
  setInterval(() => {
    cleanOldSnapshots();
  }, 3_600_000);
}

/** 将缓存中的 delta 数据写入 SQLite */
function saveSnapshots(): void {
  for (const p of PLATFORMS) {
    const entry = getCache(`hot:${p}`);
    if (entry?.data && entry.data.length > 0) {
      insertSnapshot(p, entry.data);
    }
  }
}
