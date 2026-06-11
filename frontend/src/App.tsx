import { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import HotCard from "./components/HotCard";
import { fetchAllHot, fetchHealth } from "./lib/api";
import { cardState } from "./lib/state";

type TabKey = "all" | "social" | "ai";

/** 平台元数据（侧栏 + 翻书卡片共用） */
const PLATFORM_META: Record<string, {
  name: string;
  icon: string;
  iconSuffix: string;
  accentClass: string;
}> = {
  weibo:     { name: "微博", icon: "🔥", iconSuffix: "wb", accentClass: "accent-wb" },
  zhihu:     { name: "知乎", icon: "💡", iconSuffix: "zh", accentClass: "accent-zh" },
  baidu:     { name: "百度", icon: "🔍", iconSuffix: "bd", accentClass: "accent-bd" },
  bilibili:  { name: "B 站", icon: "🎮", iconSuffix: "bl", accentClass: "accent-bl" },
  huggingface: { name: "HuggingFace", icon: "🤗", iconSuffix: "hf", accentClass: "accent-hf" },
  github:    { name: "GitHub Trending", icon: "🐙", iconSuffix: "gh", accentClass: "accent-gh" },
};

const PLATFORM_ORDER = ["weibo", "zhihu", "baidu", "bilibili", "huggingface", "github"];
const PLATFORM_CATEGORY: Record<string, TabKey> = {
  weibo: "social", zhihu: "social", bilibili: "social", baidu: "social",
  huggingface: "ai", github: "ai",
};

const TAB_OPTIONS: { key: TabKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "social", label: "社交平台" },
  { key: "ai", label: "AI 原生" },
];

/** 全局 3D 视差 */
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

export default function App() {
  const [tab, setTab] = useState<TabKey>("all");
  const [currentPlatform, setCurrentPlatform] = useState("weibo");
  const [flipping, setFlipping] = useState(false);
  const [pendingPlatform, setPendingPlatform] = useState<string | null>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const [timeStr, setTimeStr] = useState("");

  const { data, error, isLoading, mutate } = useSWR("hot:all", fetchAllHot, {
    refreshInterval: Number(import.meta.env.VITE_REFRESH_INTERVAL) || 180000,
    keepPreviousData: true,
  });

  // 全局视差
  useEffect(() => {
    document.addEventListener("mousemove", applyGlobalParallax, { passive: true });
    document.addEventListener("mouseleave", resetGlobalParallax);
    return () => {
      document.removeEventListener("mousemove", applyGlobalParallax);
      document.removeEventListener("mouseleave", resetGlobalParallax);
    };
  }, []);

  // 心跳保活
  useEffect(() => {
    const interval = setInterval(() => { fetchHealth().catch(() => {}); }, 120_000);
    return () => clearInterval(interval);
  }, []);

  // 时钟
  useEffect(() => {
    const tick = () => setTimeStr(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Tab 过滤
  const filteredPlatforms = PLATFORM_ORDER.filter((p) => {
    if (tab === "all") return true;
    return PLATFORM_CATEGORY[p] === tab;
  });

  // 翻书：点击侧栏
  const flipTo = useCallback((platform: string) => {
    if (platform === currentPlatform || flipping) return;
    setPendingPlatform(platform);
    setFlipping(true);
  }, [currentPlatform, flipping]);

  // 翻书动画结束
  const onFlipEnd = useCallback(() => {
    if (pendingPlatform) {
      setCurrentPlatform(pendingPlatform);
      setPendingPlatform(null);
    }
    setFlipping(false);
  }, [pendingPlatform]);

  // Tab 切换时跳到筛选后第一个
  const handleTabChange = useCallback((newTab: TabKey) => {
    if (newTab === tab) return;
    setTab(newTab);
    // 找到新 tab 下第一个平台
    const list = PLATFORM_ORDER.filter((p) => {
      if (newTab === "all") return true;
      return PLATFORM_CATEGORY[p] === newTab;
    });
    if (list.length > 0 && list[0] !== currentPlatform) {
      flipTo(list[0]);
    }
  }, [tab, currentPlatform, flipTo]);

  // 键盘导航：在当前筛选列表中上下翻
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const list = filteredPlatforms;
        const curIdx = list.indexOf(currentPlatform);
        const next = e.key === "ArrowDown" ? curIdx + 1 : curIdx - 1;
        if (next >= 0 && next < list.length) {
          flipTo(list[next]);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [filteredPlatforms, currentPlatform, flipTo]);

  // 异常状态
  const allFailed = data && PLATFORM_ORDER.every((p) => data[p] && !data[p].success);

  return (
    <div style={{ background: "var(--bg-deep)", height: "100vh", overflow: "hidden" }}>
      {/* 背景 */}
      <div className="starfield" />
      <div className="nebula nebula-1" />
      <div className="nebula nebula-2" />
      <div className="nebula nebula-3" />
      <div className="scanline" />

      {/* Live badge */}
      <div className="live-badge">
        <span className="live-dot" />
        <span>{timeStr || "--:--"}</span>
      </div>

      {/* 全局异常横幅 */}
      {allFailed && (
        <div className="degraded-banner" style={{ position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 60 }}>
          所有平台数据暂时无法获取，请稍后刷新
        </div>
      )}
      {error && !data && (
        <div className="degraded-banner" style={{ position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 60 }}>
          网络波动中，请稍后刷新
        </div>
      )}

      <div className="app-shell">
        {/* ===== 左侧栏 ===== */}
        <nav className="sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-logo">🔥</div>
            <span className="sidebar-name">当日 AI 热点</span>
          </div>

          <div className="side-tabs">
            {TAB_OPTIONS.map((t) => (
              <button
                key={t.key}
                className={`side-tab${tab === t.key ? " active" : ""}`}
                onClick={() => handleTabChange(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {filteredPlatforms.map((p) => {
            const meta = PLATFORM_META[p];
            const pd = data?.[p];
            const count = pd?.data?.length ?? 0;
            return (
              <div
                key={p}
                className={`side-item${currentPlatform === p ? " active" : ""}`}
                onClick={() => flipTo(p)}
              >
                <div className={`side-icon side-icon-${meta.iconSuffix}`}>{meta.icon}</div>
                <div className="side-label">
                  <span className="sname">{meta.name}</span>
                  <span className="scount">{count} 条 AI 热搜</span>
                </div>
              </div>
            );
          })}
        </nav>

        {/* ===== 右侧翻书舞台 ===== */}
        <main className="main-stage">
          <div className="book" ref={bookRef}>
            {/* 当前页 */}
            <div
              className={`book-page current${flipping ? " flipping-out" : ""}`}
              onTransitionEnd={onFlipEnd}
            >
              <div className={`accent-bar ${PLATFORM_META[currentPlatform]?.accentClass}`} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderRadius: "var(--radius-lg) 0 0 var(--radius-lg)", zIndex: 3 }} />
              <HotCard
                platformData={data?.[currentPlatform]}
                state={cardState(data?.[currentPlatform], isLoading)}
                onRetry={() => mutate()}
              />
            </div>

            {/* 翻入页 */}
            {flipping && pendingPlatform && (
              <div className={`book-page next${flipping ? " flipping-in" : ""}`}>
                <div className={`accent-bar ${PLATFORM_META[pendingPlatform]?.accentClass}`} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderRadius: "var(--radius-lg) 0 0 var(--radius-lg)", zIndex: 3 }} />
                <HotCard
                  platformData={data?.[pendingPlatform]}
                  state={cardState(data?.[pendingPlatform], isLoading)}
                  onRetry={() => mutate()}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
