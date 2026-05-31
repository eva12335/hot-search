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
  // 缓存 1 小时
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

/** B 站热门排行榜，AI 关键词过滤 */
async function bilibiliPrimary(): Promise<HotItem[]> {
  const { imgKey, subKey } = await getWbiKeys();
  const params: Record<string, string | number> = { rid: 0, type: "all" };
  const signedQuery = encWbi(params, imgKey, subKey);
  const { data } = await http.get(
    `https://api.bilibili.com/x/web-interface/ranking/v2?${signedQuery}`,
    { headers: { Referer: "https://www.bilibili.com/", "User-Agent": UA } }
  );
  const list: any[] = data?.data?.list ?? [];
  const items = list.map((v, i) => ({
    rank: i + 1,
    title: v.title || "",
    hot: v.stat?.view ?? v.stat?.reply ?? null,
    url: v.short_link_v2
      ? `https://www.bilibili.com/video/${v.bvid}`
      : `https://www.bilibili.com/video/${v.bvid}`,
    desc: v.desc || (v.owner?.name ? `UP: ${v.owner.name}` : ""),
  }));
  return filterAI(items);
}

/** 备用线路：无 WBI 签名的旧接口 */
async function bilibiliFallback(): Promise<HotItem[]> {
  const { data } = await http.get(
    "https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all",
    { headers: { Referer: "https://www.bilibili.com/", "User-Agent": UA } }
  );
  const list: any[] = data?.data?.list ?? [];
  const items = list.map((v, i) => ({
    rank: i + 1,
    title: v.title || "",
    hot: v.stat?.view ?? null,
    url: `https://www.bilibili.com/video/${v.bvid}`,
    desc: v.desc || "",
  }));
  return filterAI(items);
}

export const bilibiliAdapter: PlatformAdapter = {
  meta: {
    platformName: "bilibili",
    displayName: "B 站",
    typeLabel: "AI 热搜",
    sourceUrl: "https://www.bilibili.com/v/popular/rank/all",
  },
  fetch: bilibiliPrimary,
  fallbackFetch: bilibiliFallback,
};
