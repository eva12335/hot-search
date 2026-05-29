import { refreshAll } from "./routes/hot.js";

/** 启动定时刷新任务 */
export function startCron(intervalMs: number): void {
  console.log(`[cron] 定时刷新已启动，间隔 ${intervalMs / 1000}s`);
  // 启动后立即刷新一次
  refreshAll();
  // 定时循环
  setInterval(refreshAll, intervalMs);
}
