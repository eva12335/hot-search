import axios from "axios";

export interface HotItem {
  rank: number;
  title: string;
  hot: number | null;
  url: string;
  desc?: string;
}

export interface AdapterMeta {
  platformName: string;
  displayName: string;
  typeLabel: string;
  sourceUrl: string;
}

export interface PlatformAdapter {
  meta: AdapterMeta;
  fetch(): Promise<HotItem[]>;
  fallbackFetch(): Promise<HotItem[]>;
}

/** 通用 UA，模拟桌面浏览器 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** 带超时的 axios 实例 */
const http = axios.create({ timeout: 10000 });

/** 微博热搜线，Web 端 JSON API */
async function weiboPrimary(): Promise<HotItem[]> {
  const { data } = await http.get("https://weibo.com/ajax/side/hotSearch", {
    headers: { Referer: "https://weibo.com/", "User-Agent": UA },
  });
  const list: any[] = data?.data?.realtime ?? [];
  return list.map((v, i) => ({
    rank: i + 1,
    title: v.word || v.word_scheme || `热搜${i + 1}`,
    hot: v.num ?? null,
    url: `https://s.weibo.com/weibo?q=${encodeURIComponent(v.word || v.word_scheme || "")}`,
    desc: v.word_scheme || "",
  }));
}

/** 微博备用线，移动端 API */
async function weiboFallback(): Promise<HotItem[]> {
  const { data } = await http.get(
    "https://m.weibo.cn/api/container/getIndex?containerid=102803",
    { headers: { "User-Agent": UA } }
  );
  const cards: any[] = data?.data?.cards?.flatMap((c: any) => c.card_group || c.cards || []) ?? [];
  return cards
    .filter((c: any) => c.itemid)
    .map((v: any, i: number) => ({
      rank: i + 1,
      title: v.desc || v.title || "",
      hot: null,
      url: v.scheme || `https://m.weibo.cn/detail/${v.itemid}`,
      desc: v.desc || "",
    }));
}

export const weiboAdapter: PlatformAdapter = {
  meta: {
    platformName: "weibo",
    displayName: "微博",
    typeLabel: "热搜榜",
    sourceUrl: "https://weibo.com/ajax/side/hotSearch",
  },
  fetch: weiboPrimary,
  fallbackFetch: weiboFallback,
};
