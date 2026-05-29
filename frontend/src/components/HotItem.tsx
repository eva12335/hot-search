import type { HotItem as HotItemType } from "../lib/types";
import { formatHotScore } from "../lib/format";

interface HotItemProps {
  item: HotItemType;
  index: number;
}

function ChampionBadge() {
  return (
    <div className="relative flex-shrink-0">
      <div className="absolute inset-0 w-11 h-11 rounded-full bg-amber-400/40 blur-md animate-glow-breath" />
      <span className="relative z-10 w-11 h-11 flex items-center justify-center rounded-full text-sm font-black text-white
                       bg-gradient-to-br from-yellow-300 via-orange-400 to-red-500
                       shadow-[0_0_20px_rgba(251,146,60,0.5),0_0_40px_rgba(251,146,60,0.2),inset_0_1px_2px_rgba(255,255,255,0.3)]">
        1
      </span>
      <span className="absolute -top-1 -right-1 z-20 w-4 h-4 rounded-full bg-orange-400 animate-champion-pulse
                       shadow-[0_0_6px_rgba(251,146,60,0.8)]" />
    </div>
  );
}

function RunnerUpBadge() {
  return (
    <div className="relative flex-shrink-0">
      <div className="absolute inset-0 w-10 h-10 rounded-full bg-slate-300/30 blur-md" />
      <span className="relative z-10 w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold text-white
                       bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500
                       shadow-[0_0_14px_rgba(148,163,184,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)]">
        2
      </span>
    </div>
  );
}

function ThirdBadge() {
  return (
    <div className="relative flex-shrink-0">
      <div className="absolute inset-0 w-10 h-10 rounded-full bg-amber-500/30 blur-md" />
      <span className="relative z-10 w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold text-white
                       bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600
                       shadow-[0_0_14px_rgba(251,191,36,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)]">
        3
      </span>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <ChampionBadge />;
  if (rank === 2) return <RunnerUpBadge />;
  if (rank === 3) return <ThirdBadge />;
  return (
    <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold
                     bg-gray-100 text-gray-400 group-hover/item:bg-gray-200 transition-colors">
      {rank}
    </span>
  );
}

export default function HotItem({ item, index }: HotItemProps) {
  const isTop3 = item.rank <= 3;

  return (
    <li
      className="flex items-center gap-3.5 px-4 py-3 transition-all duration-300 ease-out
                 hover:scale-[1.03] hover:bg-white hover:shadow-lg hover:rounded-xl
                 animate-fade-in-up group/item relative
                 border-b border-gray-50 last:border-b-0"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <RankBadge rank={item.rank} />

      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex-1 truncate transition-all duration-200
          ${isTop3
            ? "text-sm font-bold text-gray-900"
            : "text-sm font-medium text-gray-600"
          }
          group-hover/item:text-blue-600`}
        title={item.title}
      >
        {isTop3 && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 mr-1.5 align-middle animate-blink-dot
                           shadow-[0_0_4px_rgba(249,115,22,0.6)]" />
        )}
        {item.title}
      </a>

      {item.hot != null ? (
        <span className="flex-shrink-0 text-xs whitespace-nowrap font-bold font-mono
                         bg-gradient-to-r from-red-500 to-orange-500 text-transparent bg-clip-text
                         drop-shadow-sm tabular-nums">
          {item.hot >= 10000 ? "🔥 " : ""}
          {formatHotScore(item.hot)}
        </span>
      ) : (
        <span className="flex-shrink-0 text-xs text-gray-300">—</span>
      )}
    </li>
  );
}
