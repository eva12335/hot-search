import axios from "axios";
import * as cheerio from "cheerio";
import type { HotItem, PlatformAdapter } from "./weibo.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const http = axios.create({ timeout: 15000 });

/** GitHub Trending，AI 原生数据源 */
async function githubPrimary(): Promise<HotItem[]> {
  const { data: html } = await http.get("https://github.com/trending?since=daily", {
    headers: { "User-Agent": UA },
  });
  const $ = cheerio.load(html);
  const items: HotItem[] = [];
  // GitHub Trending 仓库卡片是包含 h2 的 .Box-row
  $(".Box-row").each((_i, el) => {
    const $el = $(el);
    const $h2 = $el.find("h2").first();
    // 提取 owner / repo 名称（如 "microsoft / markitdown"）
    const fullName = $h2.text().trim().replace(/\s+/g, " ");
    // 跳过非仓库的 Box-row（导航元素等不含 /）
    if (!fullName.includes("/")) return;
    const desc = $el.find("p").first().text().trim();
    const statsText = $el.text();
    const starMatch = statsText.match(/([\d,]+)\s*stars?/i);
    const stars = starMatch ? parseInt(starMatch[1].replace(/,/g, ""), 10) : 0;

    const ownerRepo = fullName.replace(/\s*\/\s*/g, "/");
    items.push({
      rank: items.length + 1,
      title: ownerRepo,
      hot: stars,
      url: `https://github.com/${ownerRepo}`,
      desc: desc || "",
    });
  });
  return items.slice(0, 30);
}

/** 备用线路：GitHub Search API（AI/ML 话题热门仓库） */
async function githubFallback(): Promise<HotItem[]> {
  const q = "topic:machine-learning+topic:deep-learning+topic:llm+topic:ai";
  const { data } = await http.get("https://api.github.com/search/repositories", {
    params: { q, sort: "stars", order: "desc", per_page: 30 },
    headers: { Accept: "application/vnd.github+json", "User-Agent": "hotsearch" },
  });
  const list: any[] = data?.items ?? [];
  return list.map((v, i) => ({
    rank: i + 1,
    title: v.full_name || "",
    hot: v.stargazers_count ?? null,
    url: v.html_url || `https://github.com/${v.full_name}`,
    desc: v.description?.slice(0, 80) || "",
  }));
}

export const githubTrendingAdapter: PlatformAdapter = {
  meta: {
    platformName: "github",
    displayName: "GitHub Trending",
    typeLabel: "热门仓库",
    sourceUrl: "https://github.com/trending",
  },
  fetch: githubPrimary,
  fallbackFetch: githubFallback,
};
