import { useEffect, useRef } from "react";
import useSWR from "swr";
import { fetchPlatformHistory } from "../lib/api";
import type { HistoryPoint } from "../lib/types";

const PLATFORM_COLORS: Record<string, string> = {
  weibo: "#f97316",
  zhihu: "#6366f1",
  bilibili: "#ec4899",
  huggingface: "#ffbd59",
  github: "#8b949e",
};

interface TrendOverlayProps {
  platform: string;
  title: string;
  onClose: () => void;
}

function drawChart(
  canvas: HTMLCanvasElement,
  data: HistoryPoint[],
  color: string
) {
  const ctx = canvas.getContext("2d");
  if (!ctx || data.length < 2) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const padding = { top: 24, right: 24, bottom: 40, left: 60 };
  const plotW = W - padding.left - padding.right;
  const plotH = H - padding.top - padding.bottom;

  ctx.clearRect(0, 0, W, H);

  // Y 轴刻度线
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = padding.top + (plotH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(W - padding.right, y);
    ctx.stroke();
  }

  const maxHot = Math.max(...data.map((d) => d.hot), 1);
  const minHot = Math.min(...data.map((d) => d.hot), 0);

  // 数据点坐标
  const points = data.map((d, i) => ({
    x: padding.left + (plotW / Math.max(data.length - 1, 1)) * i,
    y: padding.top + plotH - ((d.hot - minHot) / Math.max(maxHot - minHot, 1)) * plotH,
    ...d,
  }));

  // 面积渐变填充
  const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotH);
  gradient.addColorStop(0, color + "40");
  gradient.addColorStop(1, color + "05");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(points[0].x, padding.top + plotH);
  points.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, padding.top + plotH);
  ctx.closePath();
  ctx.fill();

  // 发光底层 + 折线
  ctx.strokeStyle = color + "30";
  ctx.lineWidth = 6;
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  // 数据点
  points.forEach((p, i) => {
    ctx.fillStyle = i === points.length - 1 ? "#fff" : color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, i === points.length - 1 ? 5 : 3, 0, Math.PI * 2);
    ctx.fill();
    if (i === points.length - 1) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // X 轴时间标签
  ctx.fillStyle = "#5c5a55";
  ctx.font = "11px monospace";
  ctx.textAlign = "center";
  const step = Math.max(1, Math.floor(data.length / 6));
  data.forEach((d, i) => {
    if (i % step === 0 || i === data.length - 1) {
      const time = d.time.slice(11, 16);
      ctx.fillText(time, points[i].x, H - 8);
    }
  });

  // Y 轴热度标签
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const val = minHot + ((maxHot - minHot) / 4) * (4 - i);
    const y = padding.top + (plotH / 4) * i;
    const label = val >= 10000 ? `${(val / 10000).toFixed(0)}万` : val.toFixed(0);
    ctx.fillText(label, padding.left - 8, y + 4);
  }
}

export default function TrendOverlay({ platform, title, onClose }: TrendOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const color = PLATFORM_COLORS[platform] || "#c9a96e";

  const { data } = useSWR(
    `history:${platform}:${title}`,
    () => fetchPlatformHistory(platform, title, 24),
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (canvasRef.current && data?.data && data.data.length >= 2) {
      drawChart(canvasRef.current, data.data, color);
    }
  }, [data, color]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const peak = data?.data?.length
    ? Math.max(...data.data.map((d) => d.hot))
    : null;

  return (
    <div className="trend-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="trend-dialog">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ fontFamily: "Georgia, 'Noto Serif SC', serif", color: color }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg cursor-pointer"
            style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}
          >
            ✕
          </button>
        </div>

        {!data || data.data.length < 2 ? (
          <div
            className="flex items-center justify-center text-sm"
            style={{ height: 260, color: "var(--text-muted)" }}
          >
            {data && data.data.length === 0 ? "数据积累中，请稍后再试" : "加载中..."}
          </div>
        ) : (
          <canvas ref={canvasRef} style={{ width: "100%", height: 260 }} />
        )}

        <div className="flex items-center gap-6 mt-4 text-xs" style={{ color: "var(--text-secondary)" }}>
          <span>平台：{platform}</span>
          <span>当前排名：#{data?.data?.[data.data.length - 1]?.rank ?? "—"}</span>
          {peak != null && <span>24h 峰值：{peak >= 10000 ? `${(peak / 10000).toFixed(1)}万` : peak}</span>}
        </div>
      </div>
    </div>
  );
}
