import { Router } from "express";
import { weiboAdapter } from "../adapters/weibo.js";
import { zhihuAdapter } from "../adapters/zhihu.js";
import { bilibiliAdapter } from "../adapters/bilibili.js";
import { huggingfaceAdapter, MOCK_DATA as HF_MOCK } from "../adapters/huggingface.js";
import { githubTrendingAdapter } from "../adapters/github-trending.js";
import type { PlatformAdapter, HotItem } from "../adapters/weibo.js";
import { getCache, setCache, dataState } from "../cache.js";
import { getLatestSnapshot, getHistory } from "../db.js";

const router = Router();

/** 所有已注册的适配器 */
const adapters: Record<string, PlatformAdapter> = {
  weibo: weiboAdapter,
  zhihu: zhihuAdapter,
  bilibili: bilibiliAdapter,
  huggingface: huggingfaceAdapter,
  github: githubTrendingAdapter,
};

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** V2 API 响应格式 */
interface PlatformResponse {
  success: boolean;
  stale: boolean;
  platform: string;
  title: string;
  type: string;
  lastSuccessAt: string | null;
  data: HotItem[];
  error?: string;
}

/** 构建 V2 响应 */
function buildResponse(
  adapter: PlatformAdapter,
  data: HotItem[],
  success: boolean,
  stale: boolean,
  lastSuccessAt: string | null,
  error?: string
): PlatformResponse {
  return {
    success,
    stale,
    platform: adapter.meta.platformName,
    title: adapter.meta.displayName,
    type: adapter.meta.typeLabel,
    lastSuccessAt,
    data,
    ...(error ? { error } : {}),
  };
}

/** 五级降级链：采集单平台数据 */
export async function fetchPlatform(
  adapter: PlatformAdapter
): Promise<PlatformResponse> {
  const cacheKey = `hot:${adapter.meta.platformName}`;

  // 1. 主线路
  try {
    const data = await adapter.fetch();
    if (data.length > 0) {
      setCache(cacheKey, data);
      return buildResponse(adapter, data, true, false, new Date().toISOString());
    }
  } catch (e: any) {
    console.warn(`[${adapter.meta.platformName}] 主线路失败: ${e.message}`);
  }

  // 2. 备用线路
  try {
    const data = await adapter.fallbackFetch();
    if (data.length > 0) {
      setCache(cacheKey, data);
      return buildResponse(adapter, data, true, false, new Date().toISOString());
    }
  } catch (e: any) {
    console.warn(`[${adapter.meta.platformName}] 备用线路失败: ${e.message}`);
  }

  // 3. NodeCache（可能 stale）
  const cached = getCache(cacheKey);
  if (cached && dataState(cached) !== "invalid") {
    const stale = dataState(cached) === "stale";
    return buildResponse(
      adapter,
      cached.data,
      true,
      stale,
      stale ? new Date(cached.fetchedAt).toISOString() : new Date().toISOString()
    );
  }

  // 4. SQLite 历史快照
  const snapshot = getLatestSnapshot(adapter.meta.platformName);
  if (snapshot.length > 0) {
    return buildResponse(adapter, snapshot, true, true, null);
  }

  // 5. 开发环境 mock 数据（HuggingFace 国内不可用）
  if (!isProduction() && adapter.meta.platformName === "huggingface") {
    console.warn(`[${adapter.meta.platformName}] 使用本地 mock 数据`);
    return buildResponse(adapter, HF_MOCK, true, false, new Date().toISOString());
  }

  // 6. 空数据
  return buildResponse(adapter, [], false, false, null, "主备线路均不可用，且无历史快照");
}

/** GET /api/hot/all — 返回所有平台数据 */
router.get("/all", async (_req, res) => {
  try {
    const results = await Promise.all(
      Object.values(adapters).map(fetchPlatform)
    );
    const all: Record<string, PlatformResponse> = {};
    for (const r of results) {
      all[r.platform] = r;
    }
    res.json(all);
  } catch (e: any) {
    console.error("[hot:all] 采集失败:", e.message);
    res.status(500).json({
      success: false,
      message: isProduction() ? "服务繁忙，请稍后重试" : e.message,
    });
  }
});

/** GET /api/hot/:platform — 返回单平台数据 */
router.get("/:platform", async (req, res, next) => {
  try {
    const adapter = adapters[req.params.platform];
    if (!adapter) {
      res.status(404).json({
        success: false,
        message: `未知平台: ${req.params.platform}，支持: ${Object.keys(adapters).join(", ")}`,
      });
      return;
    }
    const result = await fetchPlatform(adapter);
    res.json(result);
  } catch (e: any) {
    next(e);
  }
});

/** GET /api/hot/:platform/history — 历史趋势（新增） */
router.get("/:platform/history", async (req, res) => {
  const adapter = adapters[req.params.platform];
  if (!adapter) {
    res.status(404).json({
      success: false,
      message: `未知平台: ${req.params.platform}`,
    });
    return;
  }
  const title = req.query.title as string | undefined;
  if (!title) {
    res.json({
      success: false,
      platform: adapter.meta.platformName,
      title: "",
      data: [],
      message: "缺少 title 参数",
    });
    return;
  }
  const hours = parseInt(req.query.hours as string, 10) || 24;
  const data = getHistory(adapter.meta.platformName, title, hours);
  res.json({
    success: true,
    platform: adapter.meta.platformName,
    title,
    data,
  });
});

/** 刷新所有平台数据到缓存（cron 调用） */
export async function refreshAll(): Promise<void> {
  console.log("[cron] 开始刷新...");
  const results = await Promise.all(
    Object.values(adapters).map(fetchPlatform)
  );
  let successCount = 0;
  for (const r of results) {
    if (r.success) successCount++;
  }
  console.log(`[cron] 已刷新: ${successCount}/${results.length} 平台成功`);
}

export default router;
