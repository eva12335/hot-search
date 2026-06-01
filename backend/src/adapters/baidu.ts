import axios from "axios";
import type { HotItem, PlatformAdapter } from "./weibo.js";
import { filterAI } from "./filter.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const http = axios.create({ timeout: 15000, headers: { "User-Agent": UA } });

interface BaiduHotItem {
  word: string;
  desc: string;
  hotScore: string;
  url: string;
  index: number;
}

/** 主线：百度实时热点 + AI 关键词过滤 */
async function baiduPrimary(): Promise<HotItem[]> {
  const { data } = await http.get("https://top.baidu.com/api/board?tab=realtime");
  const cards: any[] = data?.data?.cards ?? [];
  const content: BaiduHotItem[] = cards[0]?.content ?? [];

  const items = content.map((v) => ({
    rank: v.index + 1,
    title: v.word || "",
    hot: parseInt(v.hotScore, 10) || 0,
    url: v.url || `https://www.baidu.com/s?wd=${encodeURIComponent(v.word)}`,
    desc: v.desc || "",
  }));

  return filterAI(items);
}

/** 备用线路：尝试 news 标签页 */
async function baiduFallback(): Promise<HotItem[]> {
  try {
    const { data } = await http.get("https://top.baidu.com/api/board?tab=news");
    const cards: any[] = data?.data?.cards ?? [];
    const content: BaiduHotItem[] = cards[0]?.content ?? [];

    const items = content.map((v) => ({
      rank: v.index + 1,
      title: v.word || "",
      hot: parseInt(v.hotScore, 10) || 0,
      url: v.url || `https://www.baidu.com/s?wd=${encodeURIComponent(v.word)}`,
      desc: v.desc || "",
    }));

    return filterAI(items);
  } catch {
    return [];
  }
}

export const baiduAdapter: PlatformAdapter = {
  meta: {
    platformName: "baidu",
    displayName: "百度",
    typeLabel: "AI 热搜",
    sourceUrl: "https://top.baidu.com/board?tab=realtime",
  },
  fetch: baiduPrimary,
  fallbackFetch: baiduFallback,
};
