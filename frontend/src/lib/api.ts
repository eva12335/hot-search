import type { AllPlatformsData, HistoryResponse } from "./types";

const API_URL = import.meta.env.VITE_API_URL || "/api";

/** 获取所有平台热搜数据 */
export async function fetchAllHot(): Promise<AllPlatformsData> {
  const res = await fetch(`${API_URL}/hot/all`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/** 获取单平台历史趋势 */
export async function fetchPlatformHistory(
  platform: string,
  title: string,
  hours: number = 24
): Promise<HistoryResponse> {
  const params = new URLSearchParams({ title, hours: String(hours) });
  const res = await fetch(`${API_URL}/hot/${platform}/history?${params}`);
  if (!res.ok) throw new Error(`History API error: ${res.status}`);
  return res.json();
}

/** 心跳保活 */
export function fetchHealth(): Promise<Response> {
  return fetch(`${API_URL}/health`);
}
