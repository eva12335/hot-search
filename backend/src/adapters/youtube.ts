import axios from "axios";
import type { HotItem, PlatformAdapter } from "./weibo.js";

const http = axios.create({ timeout: 15000 });

/** Invidious 公共实例列表（按优先级排列） */
const INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.privacyredirect.com",
  "https://vid.puffyan.us",
  "https://invidious.tiekoetter.com",
  "https://yewtu.be",
];

interface InvidiousVideo {
  title: string;
  videoId: string;
  author: string;
  viewCount: number;
  lengthSeconds: number;
  publishedText?: string;
}

function formatViewCount(n: number): string {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}亿`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(1)}万`;
  return `${n}`;
}

export function toItem(v: InvidiousVideo, i: number): HotItem {
  return {
    rank: i + 1,
    title: v.title,
    hot: v.viewCount,
    url: `https://www.youtube.com/watch?v=${v.videoId}`,
    desc: `${v.author} · ${formatViewCount(v.viewCount)} 次观看`,
  };
}

async function fetchFromInstance(
  instance: string,
  region: string
): Promise<InvidiousVideo[]> {
  const { data } = await http.get(`${instance}/api/v1/trending?region=${region}`);
  return Array.isArray(data) ? data : [];
}

/** 主线：US 区 trending */
async function youtubePrimary(): Promise<HotItem[]> {
  for (const instance of INSTANCES) {
    try {
      const videos = await fetchFromInstance(instance, "US");
      if (videos.length > 0) return videos.map(toItem);
    } catch {
      continue;
    }
  }
  return [];
}

/** 备线：全球 trending + 更多实例 */
async function youtubeFallback(): Promise<HotItem[]> {
  const regions = ["US", "GB", "JP", "KR"];
  for (const instance of INSTANCES.slice().reverse()) {
    for (const region of regions) {
      try {
        const videos = await fetchFromInstance(instance, region);
        if (videos.length > 0) return videos.map(toItem);
      } catch {
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
