import { useState, useEffect } from "react";
import useSWR from "swr";
import Header from "./components/Header";
import Footer from "./components/Footer";
import PlatformGrid from "./components/PlatformGrid";
import HotCard from "./components/HotCard";
import TabBar from "./components/TabBar";
import type { TabFilter } from "./components/TabBar";
import { fetchAllHot, fetchHealth } from "./lib/api";
import type { AllPlatformsData, PlatformResponse } from "./lib/types";

/** 5 平台顺序 + 分类 */
const PLATFORM_ORDER = ["weibo", "zhihu", "bilibili", "huggingface", "github"];
const PLATFORM_TABS: Record<string, TabFilter> = {
  weibo: "social",
  zhihu: "social",
  bilibili: "social",
  huggingface: "ai",
  github: "ai",
};

function getLatestUpdate(data: AllPlatformsData): string {
  let latest = "";
  for (const p of Object.values(data)) {
    if (p.lastSuccessAt && p.lastSuccessAt > latest) latest = p.lastSuccessAt;
  }
  return latest;
}

function cardState(resp: PlatformResponse | undefined, isLoading: boolean): "loading" | "error" | "empty" | "success" | "stale" {
  if (isLoading && !resp) return "loading";
  if (!resp) return "loading";
  if (!resp.success && !resp.data?.length) return "error";
  if (resp.success && resp.stale) return "stale";
  if (resp.success && resp.data?.length > 0) return "success";
  if (!resp.success) return "error";
  return "empty";
}

export default function App() {
  const [tab, setTab] = useState<TabFilter>("all");

  const { data, error, isLoading, mutate } = useSWR("hot:all", fetchAllHot, {
    refreshInterval: Number(import.meta.env.VITE_REFRESH_INTERVAL) || 180000,
    keepPreviousData: true,
  });

  // 心跳保活：每 2 分钟请求 /api/health
  useEffect(() => {
    const interval = setInterval(() => {
      fetchHealth().catch(() => {});
    }, 120_000);
    return () => clearInterval(interval);
  }, []);

  const lastUpdateTime = data ? getLatestUpdate(data) : null;

  // 检查是否所有平台都失败了
  const allFailed =
    data &&
    PLATFORM_ORDER.every((p) => data[p] && !data[p].success);

  // Tab 过滤
  const filteredPlatforms = PLATFORM_ORDER.filter((p) => {
    if (tab === "all") return true;
    return PLATFORM_TABS[p] === tab;
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-deep)" }}>
      {/* 星空 + 星云 + 扫描线 */}
      <div className="starfield" />
      <div className="nebula nebula-1" />
      <div className="nebula nebula-2" />
      <div className="nebula nebula-3" />
      <div className="scanline" />

      <Header lastUpdateTime={lastUpdateTime} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 relative z-10">
        <TabBar active={tab} onChange={setTab} />

        {allFailed && (
          <div className="degraded-banner">
            所有平台数据暂时无法获取，请稍后刷新
          </div>
        )}

        {error && !data && (
          <div className="degraded-banner">
            网络波动中，请稍后刷新
          </div>
        )}

        <PlatformGrid>
          {filteredPlatforms.map((platform) => (
            <div key={platform} className="animate-fade-in-up">
              <HotCard
                platformData={data?.[platform]}
                state={cardState(data?.[platform], isLoading)}
                onRetry={() => mutate()}
              />
            </div>
          ))}
        </PlatformGrid>
      </main>

      <Footer />
    </div>
  );
}
