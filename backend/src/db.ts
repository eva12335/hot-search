import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import path from "path";
import type { HotItem } from "./adapters/weibo.js";

const DB_PATH = process.env.SQLITE_PATH || "./data/hot.db";

let db: Database.Database;

/** 所有平台 */
const PLATFORMS = ["weibo", "zhihu", "bilibili", "huggingface", "github"];

/** 初始化数据库，创建表和索引 */
export function initDB(): void {
  const dir = path.dirname(DB_PATH);
  mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");

  for (const p of PLATFORMS) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS snapshot_${p} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rank INTEGER NOT NULL,
        title TEXT NOT NULL,
        hot_score INTEGER DEFAULT 0,
        url TEXT DEFAULT '',
        captured_at TEXT DEFAULT (datetime('now'))
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_${p}_time ON snapshot_${p}(captured_at)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_${p}_title ON snapshot_${p}(title)`);
  }

  console.log(`[db] SQLite 初始化完成 (WAL), ${DB_PATH}`);
}

/** 写入一条平台快照（每条热搜一行） */
export function insertSnapshot(platform: string, items: HotItem[]): void {
  if (!db) return;
  const table = `snapshot_${platform}`;
  const stmt = db.prepare(
    `INSERT INTO ${table} (rank, title, hot_score, url) VALUES (@rank, @title, @hot, @url)`
  );
  const insertAll = db.transaction((rows: HotItem[]) => {
    for (const item of rows) {
      stmt.run({ rank: item.rank, title: item.title, hot: item.hot ?? 0, url: item.url || "" });
    }
  });
  try {
    insertAll(items);
  } catch (e: any) {
    console.error(`[db] insertSnapshot ${platform} 失败:`, e.message);
  }
}

/** 查询某个话题的历史快照 */
export function getHistory(
  platform: string,
  title: string,
  hours: number = 24
): { time: string; rank: number; hot: number }[] {
  if (!db) return [];
  try {
    const table = `snapshot_${platform}`;
    const rows = db
      .prepare(
        `SELECT captured_at as time, rank, hot_score as hot
         FROM ${table}
         WHERE title = ? AND captured_at >= datetime('now', ? || ' hours')
         ORDER BY captured_at ASC`
      )
      .all(title, `-${hours}`) as { time: string; rank: number; hot: number }[];
    return rows;
  } catch {
    return [];
  }
}

/** 获取某平台最近一次快照 */
export function getLatestSnapshot(platform: string): HotItem[] {
  if (!db) return [];
  try {
    const table = `snapshot_${platform}`;
    const latest = db
      .prepare(`SELECT MAX(captured_at) as t FROM ${table}`)
      .get() as { t: string } | undefined;
    if (!latest?.t) return [];
    const rows = db
      .prepare(
        `SELECT rank, title, hot_score as hot, url FROM ${table} WHERE captured_at = ? ORDER BY rank ASC`
      )
      .all(latest.t) as HotItem[];
    return rows;
  } catch {
    return [];
  }
}

/** 清理 7 天前数据 */
export function cleanOldSnapshots(): void {
  if (!db) return;
  for (const p of PLATFORMS) {
    try {
      const result = db
        .prepare(`DELETE FROM snapshot_${p} WHERE captured_at < datetime('now', '-7 days')`)
        .run();
      if (result.changes > 0) {
        console.log(`[db] 清理 snapshot_${p}: 删除 ${result.changes} 条`);
      }
    } catch (e: any) {
      console.error(`[db] 清理 snapshot_${p} 失败:`, e.message);
    }
  }
}
