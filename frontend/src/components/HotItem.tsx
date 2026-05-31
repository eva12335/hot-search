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

function rankBadgeClass(rank: number): string {
  if (rank === 1) return "top1";
  if (rank === 2) return "top2";
  if (rank === 3) return "top3";
  return "";
}

export default function HotItem({ item, index, onClick }: HotItemProps) {
  const isTop3 = item.rank <= 3;
  const delta = item.delta;

  const handleClick = (e: React.MouseEvent) => {
    // 点击标题链接时不弹出趋势图，只打开源链接
    if ((e.target as HTMLElement).closest("a")) return;
    onClick(item);
  };

  return (
    <li
      className="hot-item"
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={handleClick}
    >
      <span className={`rank-badge ${rankBadgeClass(item.rank)}`}>
        {item.rank}
      </span>

      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`item-title ${isTop3 ? "top3-title" : ""}`}
        title={item.title}
      >
        {item.title}
      </a>

      {delta && (
        <span className={`rank-delta ${DELTA_CLASSES[delta]}`}
          title={delta === "up" ? "上升" : delta === "down" ? "下降" : delta === "same" ? "不变" : "新上榜"}>
          {DELTA_LABELS[delta]}
        </span>
      )}

      {item.hot != null ? (
        <span className="item-hot">{formatHotScore(item.hot)}</span>
      ) : (
        <span className="item-hot">—</span>
      )}
    </li>
  );
}
