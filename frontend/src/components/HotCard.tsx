import { useRef, useCallback } from "react";
import type { PlatformData } from "../lib/types";
import HotItem from "./HotItem";

type CardState = "loading" | "error" | "empty" | "success";

interface HotCardProps {
  platformData?: PlatformData;
  state: CardState;
  onRetry?: () => void;
}

const platformConfig: Record<string, {
  gradient: string;
  icon: string;
  glow: string;
  bgGlow: string;
}> = {
  weibo: {
    gradient: "from-orange-500 via-red-500 to-pink-500",
    icon: "🔥",
    glow: "rgba(251,146,60,",
    bgGlow: "bg-orange-500/10",
  },
  zhihu: {
    gradient: "from-blue-500 via-indigo-500 to-violet-500",
    icon: "💡",
    glow: "rgba(99,102,241,",
    bgGlow: "bg-blue-500/10",
  },
  baidu: {
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    icon: "📊",
    glow: "rgba(20,184,166,",
    bgGlow: "bg-emerald-500/10",
  },
};

function getConfig(platform?: string) {
  return platformConfig[platform || ""] ?? platformConfig.weibo;
}

function Skeleton() {
  return (
    <div className="p-3 space-y-2.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3.5 px-3 py-2.5">
          <div className="w-7 h-7 rounded-full bg-gray-200 animate-shimmer" />
          <div className="flex-1 h-4 rounded bg-gray-200 animate-shimmer" style={{ width: `${60 + Math.random() * 35}%` }} />
          <div className="w-14 h-4 rounded bg-gray-200 animate-shimmer" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ platform }: { platform?: string }) {
  const c = getConfig(platform);
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className={`w-16 h-16 rounded-2xl ${c.bgGlow} flex items-center justify-center text-3xl`}>
        {c.icon}
      </div>
      <span className="text-sm text-gray-400 font-medium">暂无数据</span>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-3xl">⚠️</div>
      <span className="text-sm text-gray-400 font-medium">加载失败</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2 text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 rounded-full transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          重新加载
        </button>
      )}
    </div>
  );
}

export default function HotCard({ platformData, state, onRetry }: HotCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const platform = platformData?.platform;
  const c = getConfig(platform);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotX = (y - 0.5) * -8;
    const rotY = (x - 0.5) * 8;
    card.style.transform = `translateY(-10px) scale(1.03) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    card.style.boxShadow = `
      0 30px 60px ${c.glow}0.2),
      0 10px 30px ${c.glow}0.12),
      0 2px 8px rgba(0,0,0,0.06)`;
    if (glowRef.current) {
      glowRef.current.style.opacity = "0.5";
      glowRef.current.style.background = `radial-gradient(circle 350px at ${x * 100}% ${y * 100}%, ${c.glow}0.2), transparent 70%)`;
    }
  }, [c.glow]);

  const handleMouseLeave = useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = "";
    cardRef.current.style.boxShadow = "";
    if (glowRef.current) glowRef.current.style.opacity = "0";
  }, []);

  return (
    <div
      ref={cardRef}
      className="bg-white/90 backdrop-blur rounded-2xl overflow-hidden flex flex-col relative
                 shadow-[0_2px_20px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.04)]
                 transition-[transform,box-shadow] duration-500 ease-out
                 perspective-1000 border border-white/50"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 悬浮光斑 */}
      <div ref={glowRef} className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300 opacity-0" />

      {/* 卡片头部 */}
      <div className={`bg-gradient-to-r ${c.gradient} animate-gradient-shift px-5 py-4 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-40 h-full bg-white/15 skew-x-12 translate-x-10" />
        <div className="absolute bottom-0 left-0 w-20 h-full bg-white/5 -skew-x-12 -translate-x-5" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg backdrop-blur">
              {c.icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {platformData?.title || "加载中..."}
              </h2>
              <span className="text-xs text-white/60 font-medium">
                {platformData?.type || "..."}
              </span>
            </div>
          </div>
          {platformData?.updateTime && (
            <span className="text-xs text-white/60 font-medium bg-white/10 rounded-full px-2.5 py-1">
              {new Date(platformData.updateTime).toLocaleTimeString("zh-CN")}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1" style={{ transformStyle: "preserve-3d" }}>
        {state === "loading" && <Skeleton />}
        {state === "error" && <ErrorState onRetry={onRetry} />}
        {state === "empty" && <EmptyState platform={platform} />}
        {state === "success" && platformData && platformData.data.length > 0 && (
          <ol className="py-1">
            {platformData.data.slice(0, 10).map((item, idx) => (
              <HotItem key={item.rank} item={item} index={idx} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
