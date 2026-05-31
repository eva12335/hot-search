import { useRef, useCallback, useState } from "react";
import type { PlatformResponse, HotItem as HotItemType } from "../lib/types";
import HotItem from "./HotItem";
import TrendOverlay from "./TrendOverlay";

type CardState = "loading" | "error" | "empty" | "success" | "stale";

interface HotCardProps {
  platformData?: PlatformResponse;
  state: CardState;
  onRetry?: () => void;
}

const platformConfig: Record<string, {
  color: string;
  icon: string;
  headerClass: string;
}> = {
  weibo: {
    color: "#f97316",
    icon: "🔥",
    headerClass: "card-header-weibo",
  },
  zhihu: {
    color: "#6366f1",
    icon: "💡",
    headerClass: "card-header-zhihu",
  },
  bilibili: {
    color: "#ec4899",
    icon: "🎮",
    headerClass: "card-header-bilibili",
  },
  huggingface: {
    color: "#ffbd59",
    icon: "🤗",
    headerClass: "card-header-huggingface",
  },
  github: {
    color: "#8b949e",
    icon: "🐙",
    headerClass: "card-header-github",
  },
};

function getConfig(platform?: string) {
  return platformConfig[platform || ""] ?? platformConfig.weibo;
}

function SkeletonCard() {
  return (
    <div className="glass-card">
      <div className="px-5 py-4" style={{ background: "rgba(255,255,255,0.03)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl skeleton-block" />
          <div>
            <div className="w-20 h-4 rounded skeleton-block mb-1" />
            <div className="w-12 h-3 rounded skeleton-block" />
          </div>
        </div>
      </div>
      <div className="p-3 space-y-2.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3.5 px-3 py-2.5">
            <div className="w-8 h-8 rounded-full skeleton-block" />
            <div className="flex-1 h-4 rounded skeleton-block" style={{ width: `${60 + Math.random() * 35}%` }} />
            <div className="w-12 h-4 rounded skeleton-block" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyCard({ message }: { message?: string }) {
  return (
    <div className="glass-card">
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span className="text-3xl opacity-30">📭</span>
        <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
          {message || "暂无可展示数据"}
        </span>
      </div>
    </div>
  );
}

export default function HotCard({ platformData, state }: HotCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const platform = platformData?.platform;
  const c = getConfig(platform);
  const [trendItem, setTrendItem] = useState<HotItemType | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rotX = (y - 0.5) * -8;
      const rotY = (x - 0.5) * 8;
      card.style.transform = `translateY(-6px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      card.style.boxShadow = `0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,169,110,0.2)`;
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = "";
    cardRef.current.style.boxShadow = "";
  }, []);

  if (state === "loading") return <SkeletonCard />;
  if (state === "error" && !platformData?.data?.length) {
    return <EmptyCard message={platformData?.error || "加载失败"} />;
  }
  if (state === "empty") return <EmptyCard />;

  const staleHint =
    platformData?.stale && platformData?.lastSuccessAt
      ? `数据更新于 ${new Date(platformData.lastSuccessAt).toLocaleTimeString("zh-CN")}`
      : null;

  return (
    <>
      <div
        ref={cardRef}
        className="glass-card perspective-1200 transition-[transform,box-shadow] duration-500 ease-out"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* 卡片头部 */}
        <div className={`px-5 py-4 ${c.headerClass}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                {c.icon}
              </div>
              <div>
                <h2
                  className="text-lg font-bold tracking-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  {platformData?.title || "加载中..."}
                </h2>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {platformData?.type || "..."}
                </span>
              </div>
            </div>
            {staleHint && (
              <span
                className="text-xs rounded-full px-2.5 py-1"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}
              >
                {staleHint}
              </span>
            )}
          </div>
        </div>

        {/* 列表 */}
        <div className="flex-1">
          {platformData?.data && platformData.data.length > 0 ? (
            <ol className="py-1">
              {platformData.data.slice(0, 10).map((item, idx) => (
                <HotItem
                  key={`${item.title}-${item.rank}`}
                  item={item}
                  index={idx}
                  onClick={(it) => setTrendItem(it)}
                />
              ))}
            </ol>
          ) : (
            <div className="flex items-center justify-center py-16">
              <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
                {platformData?.error || "暂无数据"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 趋势图弹窗 */}
      {trendItem && (
        <TrendOverlay
          platform={platformData?.platform || ""}
          title={trendItem.title}
          onClose={() => setTrendItem(null)}
        />
      )}
    </>
  );
}
