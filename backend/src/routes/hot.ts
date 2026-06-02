import { Router } from "express";
import { weiboAdapter } from "../adapters/weibo.js";
import { zhihuAdapter } from "../adapters/zhihu.js";
import { bilibiliAdapter } from "../adapters/bilibili.js";
import { baiduAdapter } from "../adapters/baidu.js";
import { huggingfaceAdapter } from "../adapters/huggingface.js";
import { githubTrendingAdapter } from "../adapters/github-trending.js";
import type { PlatformAdapter, HotItem } from "../adapters/weibo.js";
import { getCache, setCache, dataState } from "../cache.js";

/** 对比上一轮数据，计算排名变化 delta */
export function computeDelta(prevData: HotItem[] | undefined, current: HotItem[]): HotItem[] {
  if (!prevData || prevData.length === 0) {
    return current.map((item) => ({ ...item, delta: "new" as const }));
  }
  const prevMap = new Map(prevData.map((item) => [item.title, item.rank]));
  return current.map((item) => {
    const prevRank = prevMap.get(item.title);
    if (prevRank === undefined) return { ...item, delta: "new" as const };
    if (prevRank === item.rank) return { ...item, delta: "same" as const };
    return { ...item, delta: prevRank > item.rank ? "up" as const : "down" as const };
  });
}

const router = Router();

/** 所有已注册的适配器 */
const adapters: Record<string, PlatformAdapter> = {
  weibo: weiboAdapter,
  zhihu: zhihuAdapter,
  bilibili: bilibiliAdapter,
  baidu: baiduAdapter,
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
export function buildResponse(
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

/** 跑一个异步任务，超时返回 null */
async function withDeadline<T>(fn: () => Promise<T>, ms: number): Promise<T | null> {
  try {
    const result = await Promise.race([
      fn(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
    return result;
  } catch (e: any) {
    console.warn("[withDeadline] 请求异常:", e.message || e);
    return null;
  }
}

/** 单个平台 API 路由用：缓存优先，过期时远端拉取（Vercel 上每平台 ≤ 5s） */
export async function fetchPlatform(
  adapter: PlatformAdapter
): Promise<PlatformResponse> {
  const cacheKey = `hot:${adapter.meta.platformName}`;
  const DEADLINE = 5000;

  // 缓存新鲜 → 直接返回
  const cached = getCache(cacheKey);
  if (cached && dataState(cached) === "fresh") {
    return buildResponse(adapter, cached.data, true, false, new Date(cached.fetchedAt).toISOString());
  }

  // 远端拉取
  const primaryData = await withDeadline(() => adapter.fetch(), DEADLINE);
  if (primaryData && primaryData.length > 0) {
    const prevEntry = getCache(cacheKey);
    const withDelta = computeDelta(prevEntry?.data, primaryData);
    setCache(cacheKey, withDelta);
    return buildResponse(adapter, withDelta, true, false, new Date().toISOString());
  }

  const fallbackData = await withDeadline(() => adapter.fallbackFetch(), DEADLINE);
  if (fallbackData && fallbackData.length > 0) {
    const prevEntry = getCache(cacheKey);
    const withDelta = computeDelta(prevEntry?.data, fallbackData);
    setCache(cacheKey, withDelta);
    return buildResponse(adapter, withDelta, true, false, new Date().toISOString());
  }

  // 旧缓存降级
  if (cached && dataState(cached) !== "invalid") {
    return buildResponse(adapter, cached.data, true, true,
      new Date(cached.fetchedAt).toISOString());
  }

  return buildResponse(adapter, [], false, false, null, "暂无数据");
}

/** cron 用：强制远端拉取，不走缓存（Vercel 上每平台 ≤ 7s） */
export async function fetchPlatformForce(
  adapter: PlatformAdapter
): Promise<PlatformResponse> {
  const cacheKey = `hot:${adapter.meta.platformName}`;
  const DEADLINE = 7000;

  const primaryData = await withDeadline(() => adapter.fetch(), DEADLINE);
  if (primaryData && primaryData.length > 0) {
    const prevEntry = getCache(cacheKey);
    const withDelta = computeDelta(prevEntry?.data, primaryData);
    setCache(cacheKey, withDelta);
    return buildResponse(adapter, withDelta, true, false, new Date().toISOString());
  }

  const fallbackData = await withDeadline(() => adapter.fallbackFetch(), DEADLINE);
  if (fallbackData && fallbackData.length > 0) {
    const prevEntry = getCache(cacheKey);
    const withDelta = computeDelta(prevEntry?.data, fallbackData);
    setCache(cacheKey, withDelta);
    return buildResponse(adapter, withDelta, true, false, new Date().toISOString());
  }

  const cached = getCache(cacheKey);
  if (cached && dataState(cached) !== "invalid") {
    return buildResponse(adapter, cached.data, true, true,
      new Date(cached.fetchedAt).toISOString());
  }

  return buildResponse(adapter, [], false, false, null, "暂无数据");
}

/** GET /api/hot/all — 纯缓存返回，不触发远端拉取（确保 Vercel <10s） */
router.get("/all", (_req, res) => {
  const all: Record<string, PlatformResponse> = {};
  for (const adapter of Object.values(adapters)) {
    const cacheKey = `hot:${adapter.meta.platformName}`;
    const cached = getCache(cacheKey);
    if (cached && dataState(cached) !== "invalid") {
      all[adapter.meta.platformName] = buildResponse(
        adapter, cached.data, true,
        dataState(cached) === "stale",
        new Date(cached.fetchedAt).toISOString()
      );
    } else {
      all[adapter.meta.platformName] = buildResponse(adapter, [], false, false, null, "暂无数据");
    }
  }
  res.json(all);
});

/** GET /api/hot/cron — 外部定时任务触发刷新 */
router.get("/cron", async (_req, res) => {
  const token = _req.query.token || _req.headers["x-cron-token"];
  if (process.env.CRON_SECRET && token !== process.env.CRON_SECRET) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const results = await refreshAll();
    res.json({ ok: true, time: new Date().toISOString(), results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /api/hot/:platform — 单平台（缓存优先，过期时远端拉取） */
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

/** GET /api/hot/:platform/history — 历史趋势（Vercel 无 SQLite，返回空数组） */
router.get("/:platform/history", (req, res) => {
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
  res.json({
    success: true,
    platform: adapter.meta.platformName,
    title,
    data: [],
  });
});

/** 刷新所有平台数据到缓存（外部 cron 调用，强制远端拉取） */
export async function refreshAll(): Promise<PlatformResponse[]> {
  console.log("[cron] 开始刷新...");
  const results = await Promise.all(
    Object.values(adapters).map(fetchPlatformForce)
  );
  let successCount = 0;
  for (const r of results) {
    if (r.success) successCount++;
  }
  console.log(`[cron] 已刷新: ${successCount}/${results.length} 平台成功`);
  return results;
}

export default router;
