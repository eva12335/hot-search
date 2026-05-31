import { useState } from "react";
import { createPortal } from "react-dom";
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
  iconClass: string;
}> = {
  weibo:     { color: "#f97316", icon: "🔥", iconClass: "card-icon-weibo" },
  zhihu:     { color: "#6366f1", icon: "💡", iconClass: "card-icon-zhihu" },
  bilibili:  { color: "#ec4899", icon: "🎮", iconClass: "card-icon-bilibili" },
  huggingface: { color: "#ffbd59", icon: "🤗", iconClass: "card-icon-huggingface" },
  github:    { color: "#8b949e", icon: "🐙", iconClass: "card-icon-github" },
};

function getConfig(platform?: string) {
  return platformConfig[platform || ""] ?? platformConfig.weibo;
}

function SkeletonCard() {
  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-platform">
          <div className="w-9 h-9 rounded-xl skeleton-block" />
          <div>
            <div className="w-20 h-4 rounded skeleton-block mb-1" />
            <div className="w-12 h-3 rounded skeleton-block" />
          </div>
        </div>
      </div>
      <div className="card-body">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
            <div className="w-7 h-7 rounded-md skeleton-block" />
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
  const platform = platformData?.platform;
  const c = getConfig(platform);
  const [trendItem, setTrendItem] = useState<HotItemType | null>(null);

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
      <div className="glass-card">
        <div className="card-header">
          <div className="card-platform">
            <div className={`card-icon ${c.iconClass}`}>{c.icon}</div>
            <div className="card-title">
              <h3>{platformData?.title || "加载中..."}</h3>
              <span>{platformData?.type || "..."}</span>
            </div>
          </div>
          {staleHint ? (
            <span className="card-time">{staleHint}</span>
          ) : (
            <span className="card-time">
              {new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>

        <div className="card-body">
          {platformData?.data && platformData.data.length > 0 ? (
            <ol className="hot-list">
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

      {trendItem &&
        createPortal(
          <TrendOverlay
            platform={platformData?.platform || ""}
            title={trendItem.title}
            onClose={() => setTrendItem(null)}
          />,
          document.body
        )}
    </>
  );
}
