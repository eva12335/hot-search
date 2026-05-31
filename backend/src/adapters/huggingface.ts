import axios from "axios";
import type { HotItem, PlatformAdapter } from "./weibo.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const http = axios.create({ timeout: 15000 });

/** HuggingFace 国内无法直接访问，使用 hf-mirror.com 镜像 */
const MIRROR = "https://hf-mirror.com/api/models";

export function toItem(v: any, i: number): HotItem {
  const downloads = v.downloads ?? 0;
  const hot = v.likes || downloads;
  const id = v.id;
  return {
    rank: i + 1,
    title: id || `model-${i + 1}`,
    hot,
    url: id ? `https://huggingface.co/${id}` : "https://huggingface.co/models",
    desc: v.pipeline_tag
      ? `${v.pipeline_tag} · ${(downloads / 1e6).toFixed(1)}M downloads`
      : v.description?.slice(0, 80) || "",
  };
}

/** 主线：hf-mirror 按 likes 排序（比 downloads 更接近"近期热度"） */
async function huggingfacePrimary(): Promise<HotItem[]> {
  const { data } = await http.get(`${MIRROR}?sort=likes&limit=30&full=false`, {
    headers: { "User-Agent": UA },
  });
  const list: any[] = Array.isArray(data) ? data : [];
  return list.map(toItem);
}

/** 备线：hf-mirror 按 downloads 排序 */
async function huggingfaceFallback(): Promise<HotItem[]> {
  const { data } = await http.get(`${MIRROR}?sort=downloads&limit=30&full=false`, {
    headers: { "User-Agent": UA },
  });
  const list: any[] = Array.isArray(data) ? data : [];
  return list.map(toItem);
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
