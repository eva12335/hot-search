import axios from "axios";
import md5 from "md5";
import type { HotItem, PlatformAdapter } from "./weibo.js";
import { filterAI } from "./filter.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const http = axios.create({ timeout: 15000 });

/** WBI 签名混排表 */
const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28,
  14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54,
  21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
];

/** 搜索关键词 — AI 新闻相关，避开泛词降低噪音 */
const SEARCH_KEYWORDS = ["AI新闻", "人工智能", "大模型", "DeepSeek", "ChatGPT", "AI发展"];

/** 对 img_key + sub_key 混排取前 32 位 */
export function getMixinKey(orig: string): string {
  return MIXIN_KEY_ENC_TAB.map((n) => orig[n]).join("").slice(0, 32);
}

/** WBI 签名：排序参数 + md5(query + mixin_key) */
export function encWbi(params: Record<string, string | number>, imgKey: string, subKey: string): string {
  const mixinKey = getMixinKey(imgKey + subKey);
  const wts = Math.round(Date.now() / 1000);
  Object.assign(params, { wts });
  const query = Object.keys(params)
    .sort()
    .map((key) => {
      const value = String(params[key]).replace(/[!'()*]/g, "");
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join("&");
  return query + "&w_rid=" + md5(query + mixinKey);
}

/** 从 nav 接口获取 WBI 密钥对 */
let cachedKeys: { imgKey: string; subKey: string } | null = null;
let keysFetchedAt = 0;

async function getWbiKeys(): Promise<{ imgKey: string; subKey: string }> {
  if (cachedKeys && Date.now() - keysFetchedAt < 3_600_000) {
    return cachedKeys;
  }
  const { data } = await http.get("https://api.bilibili.com/x/web-interface/nav", {
    headers: { Referer: "https://www.bilibili.com/", "User-Agent": UA },
  });
  const imgUrl: string = data?.data?.wbi_img?.img_url ?? "";
  const subUrl: string = data?.data?.wbi_img?.sub_url ?? "";
  cachedKeys = {
    imgKey: imgUrl.slice(imgUrl.lastIndexOf("/") + 1, imgUrl.lastIndexOf(".")),
    subKey: subUrl.slice(subUrl.lastIndexOf("/") + 1, subUrl.lastIndexOf(".")),
  };
  keysFetchedAt = Date.now();
  return cachedKeys;
}

/** 去除标题中的 <em> 高亮标签 */
function stripEmTags(text: string): string {
  return text.replace(/<\/?em[^>]*>/g, "");
}

/** 格式化播放量 */
function formatPlayCount(n: number): string {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}亿`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(1)}万`;
  return `${n}`;
}

/** 主线：搜索多个 AI 关键词，聚合去重后按播放量排序 */
async function bilibiliPrimary(): Promise<HotItem[]> {
  const { imgKey, subKey } = await getWbiKeys();

  // 并行搜索所有关键词
  const searchResults = await Promise.all(
    SEARCH_KEYWORDS.map(async (kw) => {
      try {
        const params: Record<string, string | number> = {
          search_type: "video",
          keyword: kw,
          order: "pubdate",
        };
        const signedQuery = encWbi(params, imgKey, subKey);
        const { data } = await http.get(
          `https://api.bilibili.com/x/web-interface/wbi/search/type?${signedQuery}`,
          { headers: { Referer: "https://www.bilibili.com/", "User-Agent": UA } }
        );
        return (data?.data?.result ?? []) as any[];
      } catch (e: any) {
        console.warn(`[bilibili] 搜索 "${kw}" 失败:`, e.message);
        return [];
      }
    })
  );

  // 去重（按 bvid）并排序
  const seen = new Set<string>();
  const allVideos: { title: string; bvid: string; play: number; author: string }[] = [];

  for (const results of searchResults) {
    for (const v of results) {
      const bvid: string = v.bvid;
      if (!bvid || seen.has(bvid)) continue;
      seen.add(bvid);
      allVideos.push({
        title: stripEmTags(v.title || ""),
        bvid,
        play: v.play ?? 0,
        author: v.author || "",
      });
    }
  }

  allVideos.sort((a, b) => b.play - a.play);

  return allVideos.slice(0, 50).map((v, i) => ({
    rank: i + 1,
    title: v.title,
    hot: v.play,
    url: `https://www.bilibili.com/video/${v.bvid}`,
    desc: `UP: ${v.author} · ${formatPlayCount(v.play)} 次播放`,
  }));
}

/** 备用线路：综合热门 + AI 关键词过滤，若 AI 过滤结果为空则返回原始热门 */
async function bilibiliFallback(): Promise<HotItem[]> {
  const { data } = await http.get(
    "https://api.bilibili.com/x/web-interface/popular?pn=1&ps=50",
    { headers: { Referer: "https://www.bilibili.com/", "User-Agent": UA } }
  );
  const list: any[] = data?.data?.list ?? [];
  const items = list.map((v, i) => ({
    rank: i + 1,
    title: v.title || "",
    hot: v.stat?.view ?? v.stat?.reply ?? null,
    url: `https://www.bilibili.com/video/${v.bvid}`,
    desc: v.owner?.name ? `UP: ${v.owner.name} · ${formatPlayCount(v.stat?.view ?? 0)} 次播放` : "",
  }));
  const filtered = filterAI(items);
  return filtered.length > 0 ? filtered : items;
}

export const bilibiliAdapter: PlatformAdapter = {
  meta: {
    platformName: "bilibili",
    displayName: "B 站",
    typeLabel: "AI 新闻",
    sourceUrl: "https://search.bilibili.com/all?keyword=AI新闻",
  },
  fetch: bilibiliPrimary,
  fallbackFetch: bilibiliFallback,
};
