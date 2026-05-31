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

/** 本地开发 mock 数据：国内网络不通时占位展示 */
export const MOCK_DATA: HotItem[] = [
  { rank: 1, title: "deepseek-ai/DeepSeek-V3", hot: 28400000, url: "https://huggingface.co/deepseek-ai/DeepSeek-V3", desc: "text-generation · 28.4M downloads" },
  { rank: 2, title: "Qwen/Qwen3-235B-A22B", hot: 19300000, url: "https://huggingface.co/Qwen/Qwen3-235B-A22B", desc: "text-generation · 19.3M downloads" },
  { rank: 3, title: "meta-llama/Llama-4-Maverick-17B-128E-Instruct", hot: 15600000, url: "https://huggingface.co/meta-llama/Llama-4-Maverick-17B-128E-Instruct", desc: "text-generation · 15.6M downloads" },
  { rank: 4, title: "black-forest-labs/FLUX.2-dev", hot: 12800000, url: "https://huggingface.co/black-forest-labs/FLUX.2-dev", desc: "text-to-image · 12.8M downloads" },
  { rank: 5, title: "google/gemma-3-27b-it", hot: 11200000, url: "https://huggingface.co/google/gemma-3-27b-it", desc: "text-generation · 11.2M downloads" },
  { rank: 6, title: "mistralai/Mistral-Large-3", hot: 9800000, url: "https://huggingface.co/mistralai/Mistral-Large-3", desc: "text-generation · 9.8M downloads" },
  { rank: 7, title: "stabilityai/Stable-Diffusion-4", hot: 8700000, url: "https://huggingface.co/stabilityai/Stable-Diffusion-4", desc: "text-to-image · 8.7M downloads" },
  { rank: 8, title: "BAAI/bge-m4", hot: 7500000, url: "https://huggingface.co/BAAI/bge-m4", desc: "feature-extraction · 7.5M downloads" },
  { rank: 9, title: "THUDM/GLM-5-32B", hot: 6200000, url: "https://huggingface.co/THUDM/GLM-5-32B", desc: "text-generation · 6.2M downloads" },
  { rank: 10, title: "Xenova/transformers.js", hot: 5100000, url: "https://huggingface.co/Xenova/transformers.js", desc: "transformers.js · 5.1M downloads" },
];

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
