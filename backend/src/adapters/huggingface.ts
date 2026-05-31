import axios from "axios";
import type { HotItem, PlatformAdapter } from "./weibo.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const http = axios.create({ timeout: 15000 });
const HF_API = "https://huggingface.co/api/models";

/** HuggingFace 模型热搜，AI 原生数据源 */
async function huggingfacePrimary(): Promise<HotItem[]> {
  const { data } = await http.get(`${HF_API}?sort=trending&limit=30&full=false`, {
    headers: { "User-Agent": UA },
  });
  const list: any[] = Array.isArray(data) ? data : [];
  return list.map((v, i) => ({
    rank: i + 1,
    title: v.id || v.modelId || `model-${i + 1}`,
    hot: v.downloads ?? v.likes ?? null,
    url: v.id ? `https://huggingface.co/${v.id}` : `https://huggingface.co/models`,
    desc: v.pipeline_tag
      ? `${v.pipeline_tag} · ${(v.downloads ?? 0).toLocaleString()} downloads`
      : v.description?.slice(0, 80) || "",
  }));
}

/** 备用线路：搜索 API */
async function huggingfaceFallback(): Promise<HotItem[]> {
  const { data } = await http.get(`${HF_API}?sort=downloads&limit=30&full=false`, {
    headers: { "User-Agent": UA },
  });
  const list: any[] = Array.isArray(data) ? data : [];
  return list.map((v, i) => ({
    rank: i + 1,
    title: v.id || v.modelId || `model-${i + 1}`,
    hot: v.downloads ?? v.likes ?? null,
    url: v.id ? `https://huggingface.co/${v.id}` : `https://huggingface.co/models`,
    desc: v.pipeline_tag
      ? `${v.pipeline_tag} · ${(v.downloads ?? 0).toLocaleString()} downloads`
      : "",
  }));
}

export const huggingfaceAdapter: PlatformAdapter = {
  meta: {
    platformName: "huggingface",
    displayName: "HuggingFace",
    typeLabel: "热门模型",
    sourceUrl: HF_API,
  },
  fetch: huggingfacePrimary,
  fallbackFetch: huggingfaceFallback,
};
