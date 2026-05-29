import { Router } from "express";
import { weiboAdapter } from "../adapters/weibo.js";
import { zhihuAdapter } from "../adapters/zhihu.js";
import { baiduAdapter } from "../adapters/baidu.js";
import type { PlatformAdapter, HotItem } from "../adapters/weibo.js";
import cache from "../cache.js";

const router = Router();

/** 所有已注册的适配器 */
const adapters: Record<string, PlatformAdapter> = {
  weibo: weiboAdapter,
  zhihu: zhihuAdapter,
  baidu: baiduAdapter,
};

/** 统一响应结构 */
interface ApiResponse {
  code: number;
  platform: string;
  title: string;
  type: string;
  updateTime: string;
  data: HotItem[];
}

function buildResponse(
  adapter: PlatformAdapter,
  data: HotItem[]
): ApiResponse {
  return {
    code: 200,
    platform: adapter.meta.platformName,
    title: adapter.meta.displayName,
    type: adapter.meta.typeLabel,
    updateTime: new Date().toISOString(),
    data,
  };
}

/** 采集单个平台数据，主线路失败自动降级到备用线路 */
export async function fetchPlatform(
  adapter: PlatformAdapter
): Promise<ApiResponse> {
  try {
    const data = await adapter.fetch();
    if (data.length > 0) return buildResponse(adapter, data);
  } catch (e: any) {
    console.warn(
      `[${adapter.meta.platformName}] 主线路失败: ${e.message}，尝试备用线路`
    );
  }
  // 备用线路
  try {
    const data = await adapter.fallbackFetch();
    return buildResponse(adapter, data);
  } catch (e: any) {
    console.error(
      `[${adapter.meta.platformName}] 备用线路也失败: ${e.message}`
    );
    return buildResponse(adapter, []);
  }
}

/** GET /api/hot/all — 返回所有平台数据 */
router.get("/all", async (_req, res) => {
  try {
    const cached = cache.get("hot:all");
    if (cached) {
      res.json(cached);
      return;
    }
    // 缓存未命中，即时采集
    const results = await Promise.all(
      Object.values(adapters).map(fetchPlatform)
    );
    const all: Record<string, ApiResponse> = {};
    for (const r of results) {
      all[r.platform] = r;
    }
    cache.set("hot:all", all);
    res.json(all);
  } catch (e: any) {
    res.status(500).json({ code: 500, message: e.message });
  }
});

/** GET /api/hot/:platform — 返回单平台数据 */
router.get("/:platform", async (req, res, next) => {
  try {
    const adapter = adapters[req.params.platform];
    if (!adapter) {
      res.status(404).json({
        code: 404,
        message: `未知平台: ${req.params.platform}，支持: ${Object.keys(adapters).join(", ")}`,
      });
      return;
    }
    const cacheKey = `hot:${adapter.meta.platformName}`;
    const cached = cache.get(cacheKey) as ApiResponse | undefined;
    if (cached) {
      res.json(cached);
      return;
    }
    const result = await fetchPlatform(adapter);
    cache.set(cacheKey, result);
    res.json(result);
  } catch (e: any) {
    next(e);
  }
});

/** 刷新所有平台数据到缓存 */
export async function refreshAll(): Promise<void> {
  const results = await Promise.all(
    Object.values(adapters).map(fetchPlatform)
  );
  const all: Record<string, ApiResponse> = {};
  for (const r of results) {
    const key = `hot:${r.platform}`;
    cache.set(key, r);
    all[r.platform] = r;
  }
  cache.set("hot:all", all);
  console.log(`[cron] 已刷新 ${results.length} 个平台`);
}

export default router;
