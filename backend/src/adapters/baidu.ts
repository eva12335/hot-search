import axios from "axios";
import type { HotItem, PlatformAdapter } from "./weibo.js";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const http = axios.create({ timeout: 10000 });

/** 百度热搜，HTML 中提取内嵌 JSON */
async function baiduPrimary(): Promise<HotItem[]> {
  const { data: html } = await http.get(
    "https://top.baidu.com/board?tab=realtime",
    { headers: { "User-Agent": UA } }
  );
  // 提取 HTML 注释中的 JSON 数据
  const match = html.match(/<!--s-data:(.*?)-->/s);
  if (!match) {
    console.warn("[baidu] 未找到内嵌 JSON");
    return [];
  }
  const sData = JSON.parse(match[1]);
  // 数据结构有多层嵌套，逐层展开
  const cards: any[] =
    sData?.data?.cards?.[0]?.content ??
    sData?.cards?.[0]?.content ??
    [];
  // 第一项可能自身是包含 content 的容器
  const items: any[] =
    cards.length > 0 && Array.isArray(cards[0]?.content)
      ? cards[0].content
      : cards;

  return items.map((v: any, i: number) => {
    const title = v.word ?? v.title ?? "";
    return {
      rank: i + 1,
      title,
      hot: parseInt(String(v.hotScore ?? v.hotTag ?? "0"), 10) || 0,
      url: `https://www.baidu.com/s?wd=${encodeURIComponent(v.query ?? title)}`,
      desc: v.desc ?? "",
    };
  });
}

/** 百度备用线，换一个 tab 参数 */
async function baiduFallback(): Promise<HotItem[]> {
  const { data: html } = await http.get(
    "https://top.baidu.com/board?tab=novel",
    { headers: { "User-Agent": UA } }
  );
  const match = html.match(/<!--s-data:(.*?)-->/s);
  if (!match) return [];
  const sData = JSON.parse(match[1]);
  const cards: any[] =
    sData?.data?.cards?.[0]?.content ??
    sData?.cards?.[0]?.content ??
    [];
  const items: any[] =
    cards.length > 0 && Array.isArray(cards[0]?.content)
      ? cards[0].content
      : cards;
  return items.map((v: any, i: number) => {
    const title = v.word ?? v.title ?? "";
    return {
      rank: i + 1,
      title,
      hot: parseInt(String(v.hotScore ?? v.hotTag ?? "0"), 10) || 0,
      url: `https://www.baidu.com/s?wd=${encodeURIComponent(v.query ?? title)}`,
      desc: v.desc ?? "",
    };
  });
}

export const baiduAdapter: PlatformAdapter = {
  meta: {
    platformName: "baidu",
    displayName: "百度",
    typeLabel: "热搜",
    sourceUrl: "https://top.baidu.com/board?tab=realtime",
  },
  fetch: baiduPrimary,
  fallbackFetch: baiduFallback,
};
