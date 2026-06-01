import axios from "axios";
import type { HotItem, PlatformAdapter } from "./weibo.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const http = axios.create({ timeout: 15000 });

/** HuggingFace 国内无法直接访问，使用 hf-mirror.com 镜像 */
const MIRROR = "https://hf-mirror.com";

interface TrendingItem {
  repoData: {
    id: string;
    likes?: number;
    downloads?: number;
    pipeline_tag?: string;
    repoType: string;
    author: string;
  };
  repoType: string;
}

export function toItem(v: TrendingItem, i: number): HotItem {
  const d = v.repoData;
  const downloads = d.downloads ?? 0;
  const hot = d.likes ?? 10;
  const id = d.id;
  const typeLabel = d.repoType === "dataset" ? "数据集" : d.repoType === "space" ? "Space" : "";
  return {
    rank: i + 1,
    title: id || `model-${i + 1}`,
    hot,
    url: id ? `https://huggingface.co/${id}` : "https://huggingface.co/models",
    desc: typeLabel
      ? `${typeLabel} · ${(downloads / 1e3).toFixed(1)}K downloads`
      : d.pipeline_tag
        ? `${d.pipeline_tag} · ${(downloads / 1e3).toFixed(1)}K downloads`
        : `${(downloads / 1e3).toFixed(1)}K downloads`,
  };
}

/** 主线：hf-mirror trending API（近期热门，每日变化） */
async function huggingfacePrimary(): Promise<HotItem[]> {
  const { data } = await http.get(`${MIRROR}/api/trending?limit=30`, {
    headers: { "User-Agent": UA },
  });
  const list: TrendingItem[] = data?.recentlyTrending ?? [];
  return list.map(toItem);
}

/** 备线：按最近修改排序（新发布/更新的模型） */
async function huggingfaceFallback(): Promise<HotItem[]> {
  const { data } = await http.get(
    `${MIRROR}/api/models?sort=lastModified&limit=30&full=false&direction=-1`,
    { headers: { "User-Agent": UA } }
  );
  const list: any[] = Array.isArray(data) ? data : [];
  return list.map((v: any, i: number) => {
    const downloads = v.downloads ?? 0;
    const id = v.id;
    return {
      rank: i + 1,
      title: id || `model-${i + 1}`,
      hot: v.likes || downloads || 0,
      url: id ? `https://huggingface.co/${id}` : "https://huggingface.co/models",
      desc: v.pipeline_tag
        ? `${v.pipeline_tag} · ${(downloads / 1e3).toFixed(1)}K downloads`
        : `${(downloads / 1e3).toFixed(1)}K downloads`,
    };
  });
}

export const huggingfaceAdapter: PlatformAdapter = {
  meta: {
    platformName: "huggingface",
    displayName: "HuggingFace",
    typeLabel: "热门模型",
    sourceUrl: "https://hf-mirror.com",
  },
  fetch: huggingfacePrimary,
  fallbackFetch: huggingfaceFallback,
};
