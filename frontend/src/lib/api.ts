import type { AllPlatformsData } from "./types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

/** 获取所有平台热搜数据 */
export async function fetchAllHot(): Promise<AllPlatformsData> {
  const res = await fetch(`${API_URL}/hot/all`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
