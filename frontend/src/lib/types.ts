/** 单条热搜条目 */
export interface HotItem {
  rank: number;
  title: string;
  hot: number | null;
  url: string;
  desc?: string;
}

/** 单平台返回数据 */
export interface PlatformData {
  code: number;
  platform: string;
  title: string;
  type: string;
  updateTime: string;
  data: HotItem[];
}

/** /api/hot/all 的返回结构 */
export type AllPlatformsData = Record<string, PlatformData>;
