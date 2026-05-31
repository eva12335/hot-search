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

const PLATFORM_NAMES: Record<string, string> = {
  weibo: "微博",
  zhihu: "知乎",
  bilibili: "B 站",
  huggingface: "HuggingFace",
  github: "GitHub",
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
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const W = rect.width;
  const H = rect.height;
  const padding = { top: 24, right: 24, bottom: 36, left: 52 };
  const plotW = W - padding.left - padding.right;
  const plotH = H - padding.top - padding.bottom;

  ctx.clearRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (plotH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(W - padding.right, y);
    ctx.stroke();
  }

  const maxHot = Math.max(...data.map((d) => d.hot), 1);
  const minHot = Math.min(...data.map((d) => d.hot), 0);
  const range = maxHot - minHot || 1;

  // Data points
  const points = data.map((d, i) => ({
    x: padding.left + (plotW / Math.max(data.length - 1, 1)) * i,
    y: padding.top + ((maxHot - d.hot) / range) * plotH,
    ...d,
  }));

  // Area gradient fill
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

  // Glow line
  ctx.strokeStyle = color + "30";
  ctx.lineWidth = 6;
  ctx.lineJoin = "round";
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  // Main line
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  // Data points
  points.forEach((p, i) => {
    if (i === points.length - 1) {
      ctx.fillStyle = "#e8e4dd";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // X-axis time labels
  ctx.fillStyle = "#5c5a55";
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  const step = Math.max(1, Math.floor(data.length / 6));
  data.forEach((d, i) => {
    if (i % step === 0 || i === data.length - 1) {
      const time = d.time.slice(11, 16);
      ctx.fillText(time, points[i].x, H - 8);
    }
  });

  // Y-axis labels
  ctx.fillStyle = "#5c5a55";
  ctx.font = "10px 'SF Mono', monospace";
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const val = maxHot - (range / 4) * i;
    const y = padding.top + (plotH / 4) * i + 3;
    const label = val >= 10000 ? `${(val / 10000).toFixed(0)}万` : val >= 1000 ? val.toFixed(0) : val.toString();
    ctx.fillText(label, padding.left - 8, y);
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
      <div className="trend-panel">
        <div className="trend-panel-header">
          <h3>{title}</h3>
          <button className="trend-close" onClick={onClose}>✕</button>
        </div>

        <div className="trend-chart-wrap">
          {!data || data.data.length < 2 ? (
            <div className="trend-empty">
              <span className="trend-empty-icon">📊</span>
              {data && data.data.length === 0 ? "数据积累中，请稍后再试" : "加载中..."}
            </div>
          ) : (
            <canvas ref={canvasRef} />
          )}
        </div>

        <div className="trend-meta">
          <span><strong>平台</strong> {PLATFORM_NAMES[platform] || platform}</span>
          <span><strong>当前排名</strong> #{data?.data?.[data.data.length - 1]?.rank ?? "—"}</span>
          {peak != null && <span><strong>24h 峰值</strong> {peak >= 10000 ? `${(peak / 10000).toFixed(1)}万` : peak}</span>}
        </div>
      </div>
    </div>
  );
}
