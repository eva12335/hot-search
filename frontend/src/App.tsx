import { useState, useEffect } from "react";
import useSWR from "swr";
import Header from "./components/Header";
import Footer from "./components/Footer";
import PlatformGrid from "./components/PlatformGrid";
import HotCard from "./components/HotCard";
import TabBar from "./components/TabBar";
import type { TabFilter } from "./components/TabBar";
import { fetchAllHot, fetchHealth } from "./lib/api";
import { cardState } from "./lib/state";
import type { AllPlatformsData } from "./lib/types";

/** 全局 3D 视差：所有卡片随鼠标位置倾斜（对齐样板间算法） */
function applyGlobalParallax(e: MouseEvent) {
  const cards = document.querySelectorAll<HTMLElement>(".glass-card");
  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (window.innerWidth / 2);
    const dy = (e.clientY - cy) / (window.innerHeight / 2);
    const rotY = dx * 4;
    const rotX = dy * -5;
    const hovered = card.hasAttribute("data-hovered");
    const lift = hovered ? -14 : -6;
    card.style.transform = `translateY(${lift}px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    card.style.boxShadow = hovered
      ? "0 24px 48px rgba(0,0,0,0.45), 0 6px 16px rgba(0,0,0,0.3), 0 0 0 1px var(--glass-border), inset 0 1px 0 rgba(255,255,255,0.08)"
      : "";
  });
}

function resetGlobalParallax() {
  const cards = document.querySelectorAll<HTMLElement>(".glass-card");
  cards.forEach((card) => {
    card.style.transform = "";
    card.style.boxShadow = "";
  });
}

/** 5 平台顺序 + 分类 */
const PLATFORM_ORDER = ["weibo", "zhihu", "bilibili", "baidu", "huggingface", "github"];
const PLATFORM_TABS: Record<string, TabFilter> = {
  weibo: "social",
  zhihu: "social",
  bilibili: "social",
  baidu: "social",
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

export default function App() {
  const [tab, setTab] = useState<TabFilter>("all");

  const { data, error, isLoading, mutate } = useSWR("hot:all", fetchAllHot, {
    refreshInterval: Number(import.meta.env.VITE_REFRESH_INTERVAL) || 180000,
    keepPreviousData: true,
  });

  // 全局 3D 视差（对齐样板间）
  useEffect(() => {
    document.addEventListener("mousemove", applyGlobalParallax, { passive: true });
    document.addEventListener("mouseleave", resetGlobalParallax);
    return () => {
      document.removeEventListener("mousemove", applyGlobalParallax);
      document.removeEventListener("mouseleave", resetGlobalParallax);
    };
  }, []);

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

  // Tab 过滤（分类维度）
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
          {filteredPlatforms.map((platform, i) => (
            <div key={platform} className="animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
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
