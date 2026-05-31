/** 单条热搜条目 */
export interface HotItem {
  rank: number;
  title: string;
  hot: number | null;
  url: string;
  desc?: string;
  delta?: 'up' | 'down' | 'same' | 'new';
}

/** V2 单平台 API 响应 */
export interface PlatformResponse {
  success: boolean;
  stale: boolean;
  platform: string;
  title: string;
  type: string;
  lastSuccessAt: string | null;
  data: HotItem[];
  error?: string;
}

/** /api/hot/all 返回结构 */
export type AllPlatformsData = Record<string, PlatformResponse>;

/** 历史趋势数据点 */
export interface HistoryPoint {
  time: string;
  rank: number;
  hot: number;
}

/** 历史趋势 API 响应 */
export interface HistoryResponse {
  success: boolean;
  platform: string;
  title: string;
  data: HistoryPoint[];
}
