import axios from "axios";
import type { HotItem, PlatformAdapter } from "./weibo.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const http = axios.create({ timeout: 15000, headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" } });

/** Invidious 实例列表（备线） */
const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://yewtu.be",
  "https://vid.puffyan.us",
];

interface VideoData {
  title: string;
  videoId: string;
  author: string;
  viewCount: number;
}

function formatViewCount(n: number): string {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}亿`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(1)}万`;
  return `${n}`;
}

function parseViewCount(text: string): number {
  // "1.2M views" / "123K views" / "4.5B views" / "567,890 views" / "No views"
  const cleaned = text.replace(/,/g, "").replace(/ views?/i, "").trim();
  if (cleaned === "No" || cleaned === "0") return 0;
  const num = parseFloat(cleaned);
  if (cleaned.endsWith("B")) return num * 1e9;
  if (cleaned.endsWith("M")) return num * 1e6;
  if (cleaned.endsWith("K")) return num * 1e3;
  return num || 0;
}

export function toItem(v: VideoData, i: number): HotItem {
  return {
    rank: i + 1,
    title: v.title,
    hot: v.viewCount,
    url: `https://www.youtube.com/watch?v=${v.videoId}`,
    desc: `${v.author} · ${formatViewCount(v.viewCount)} 次观看`,
  };
}

/* ====== 主线：直接抓取 YouTube Trending 页面 ====== */

function extractVideos(ytData: any): VideoData[] {
  const gridContents =
    ytData?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]
      ?.tabRenderer?.content?.richGridRenderer?.contents;
  if (!Array.isArray(gridContents)) return [];

  const renderers: any[] = [];
  for (const item of gridContents) {
    // richItemRenderer → 直接包含 videoRenderer
    const v1 = item?.richItemRenderer?.content?.videoRenderer;
    if (v1?.videoId) { renderers.push(v1); continue; }
    // richSectionRenderer → 包含多个 richItemRenderer
    const sub = item?.richSectionRenderer?.content?.richShelfRenderer?.contents;
    if (Array.isArray(sub)) {
      for (const s of sub) {
        const v2 = s?.richItemRenderer?.content?.videoRenderer;
        if (v2?.videoId) renderers.push(v2);
      }
    }
  }

  return renderers.map((v) => ({
    title: v.title?.runs?.[0]?.text || v.title?.simpleText || "",
    videoId: v.videoId,
    author: v.ownerText?.runs?.[0]?.text || "",
    viewCount: parseViewCount(v.viewCountText?.simpleText || v.viewCountText?.runs?.map((r: any) => r.text).join("") || "0"),
  }));
}

async function youtubePrimary(): Promise<HotItem[]> {
  const { data } = await http.get("https://www.youtube.com/feed/trending?gl=US&hl=en");
  // 从 HTML 中提取 ytInitialData JSON（30 万字符），用括号计数找结尾
  const startIdx = data.indexOf("var ytInitialData = ");
  if (startIdx === -1) {
    console.error("[youtube] 未找到 ytInitialData, body 长度:", data.length);
    return [];
  }
  const jsonStart = data.indexOf("{", startIdx);
  if (jsonStart === -1) return [];

  let depth = 0;
  let jsonEnd = -1;
  for (let i = jsonStart; i < data.length; i++) {
    const ch = data[i];
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) { jsonEnd = i + 1; break; } }
  }
  if (jsonEnd === -1) {
    console.error("[youtube] JSON 括号未闭合");
    return [];
  }

  let ytData: any;
  try {
    ytData = JSON.parse(data.substring(jsonStart, jsonEnd));
  } catch (e: any) {
    console.error("[youtube] JSON.parse 失败:", e.message);
    return [];
  }
  const videos = extractVideos(ytData);
  if (videos.length === 0) {
    console.error("[youtube] extractVideos 返回空, ytData keys:", Object.keys(ytData).slice(0, 5));
  }
  return videos.map(toItem);
}

/* ====== 备线：Invidious API ====== */

async function fetchInvidious(instance: string, region: string): Promise<VideoData[]> {
  const { data } = await http.get(`${instance}/api/v1/trending?region=${region}`);
  return Array.isArray(data) ? data.map((v: any) => ({
    title: v.title,
    videoId: v.videoId,
    author: v.author,
    viewCount: v.viewCount ?? 0,
  })) : [];
}

async function youtubeFallback(): Promise<HotItem[]> {
  const regions = ["US", "GB", "JP"];
  for (const instance of INVIDIOUS_INSTANCES) {
    for (const region of regions) {
      try {
        const videos = await fetchInvidious(instance, region);
        if (videos.length > 0) return videos.map(toItem);
        console.warn(`[youtube] Invidious ${instance} region=${region} 返回空`);
      } catch (e: any) {
        console.warn(`[youtube] Invidious ${instance} region=${region} 失败:`, e.message);
        continue;
      }
    }
  }
  return [];
}

export const youtubeAdapter: PlatformAdapter = {
  meta: {
    platformName: "youtube",
    displayName: "YouTube",
    typeLabel: "热门视频",
    sourceUrl: "https://www.youtube.com/feed/trending",
  },
  fetch: youtubePrimary,
  fallbackFetch: youtubeFallback,
};
