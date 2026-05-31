import axios from "axios";
import type { HotItem, PlatformAdapter } from "./weibo.js";
import { filterAI } from "./filter.js";
import dotenv from "dotenv";
dotenv.config();

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const http = axios.create({ timeout: 10000 });

/** 知乎热榜，JSON API */
async function zhihuPrimary(): Promise<HotItem[]> {
  const headers: Record<string, string> = { "User-Agent": UA };
  if (process.env.ZHIHU_COOKIE) {
    headers.Cookie = process.env.ZHIHU_COOKIE;
  }
  const { data } = await http.get(
    "https://api.zhihu.com/topstory/hot-lists/total?limit=50",
    { headers }
  );
  const list: any[] = data?.data ?? [];
  const items = list.map((v, i) => {
    const target = v.target;
    // 解析 detail_text 中的热度数值，如 "1234 万热度" -> 12340000
    const hotStr: string = v.detail_text || "";
    const hotNum = parseFloat(hotStr.split(" ")[0]) || 0;
    const hot = hotStr.includes("万") ? hotNum * 10000 : hotNum;
    const questionId = target.url?.split("/").pop() || "";
    return {
      rank: i + 1,
      title: target.title || "",
      hot: hot || null,
      url: questionId
        ? `https://www.zhihu.com/question/${questionId}`
        : target.url || "https://www.zhihu.com/hot",
      desc: target.excerpt || "",
    };
  });
  return filterAI(items);
}

/** 知乎备用线，HTML 页面解析（脆弱但聊胜于无） */
async function zhihuFallback(): Promise<HotItem[]> {
  const { data: html } = await http.get("https://www.zhihu.com/hot", {
    headers: { "User-Agent": UA },
  });
  const cheerio = await import("cheerio");
  const $ = cheerio.load(html);
  const items: HotItem[] = [];
  $(".HotList-item").each((i, el) => {
    const $el = $(el);
    const title = $el.find(".HotList-itemTitle").text().trim();
    const hotText = $el.find(".HotList-itemMetrics").text().trim();
    const link = $el.find("a").attr("href") || "";
    if (title) {
      items.push({
        rank: i + 1,
        title,
        hot: parseFloat(hotText) || null,
        url: link.startsWith("http") ? link : `https://www.zhihu.com${link}`,
      });
    }
  });
  return filterAI(items.slice(0, 50));
}

export const zhihuAdapter: PlatformAdapter = {
  meta: {
    platformName: "zhihu",
    displayName: "知乎",
    typeLabel: "AI 热搜",
    sourceUrl: "https://www.zhihu.com/hot",
  },
  fetch: zhihuPrimary,
  fallbackFetch: zhihuFallback,
};
