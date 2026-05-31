import type { HotItem as HotItemType } from "../lib/types";
import { formatHotScore } from "../lib/format";

const DELTA_LABELS: Record<string, string> = {
  up: "↑",
  down: "↓",
  same: "→",
  new: "●",
};
const DELTA_CLASSES: Record<string, string> = {
  up: "delta-up",
  down: "delta-down",
  same: "delta-same",
  new: "delta-new",
};

interface HotItemProps {
  item: HotItemType;
  index: number;
  onClick: (item: HotItemType) => void;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm rank-1">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm rank-2">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm rank-3">
        3
      </span>
    );
  }
  return (
    <span
      className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-xs"
      style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}
    >
      {rank}
    </span>
  );
}

export default function HotItem({ item, index, onClick }: HotItemProps) {
  const isTop3 = item.rank <= 3;
  const delta = item.delta;

  return (
    <li
      className="flex items-center gap-3 px-4 py-3 transition-all duration-300 cursor-pointer"
      style={{
        animationDelay: `${index * 50}ms`,
        borderBottom: "1px solid rgba(255,255,255,0.03)",
      }}
      onClick={() => onClick(item)}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(201,169,110,0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "";
      }}
    >
      <RankBadge rank={item.rank} />

      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 truncate transition-colors duration-200"
        style={{
          color: isTop3 ? "var(--text-primary)" : "var(--text-secondary)",
          fontWeight: isTop3 ? 700 : 400,
          fontSize: 14,
        }}
        title={item.title}
        onClick={(e) => e.stopPropagation()}
      >
        {item.title}
      </a>

      <div className="flex items-center gap-2 flex-shrink-0">
        {delta && (
          <span
            className={`text-xs font-bold ${DELTA_CLASSES[delta]}`}
            title={delta === "up" ? "上升" : delta === "down" ? "下降" : delta === "same" ? "不变" : "新上榜"}
          >
            {DELTA_LABELS[delta]}
          </span>
        )}
        {item.hot != null ? (
          <span
            className="text-xs whitespace-nowrap tabular-nums"
            style={{ color: "var(--text-muted)", fontFamily: "'SF Mono', 'JetBrains Mono', monospace" }}
          >
            {formatHotScore(item.hot)}
          </span>
        ) : (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
        )}
      </div>
    </li>
  );
}
