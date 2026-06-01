import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import axios from "axios";
import hotRouter from "./routes/hot.js";
import { startCron } from "./cron.js";
import { initDB } from "./db.js";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const FETCH_INTERVAL = parseInt(process.env.FETCH_INTERVAL || "600", 10) * 1000;

// Render 反向代理后正确识别客户端 IP（限流和日志依赖）
app.set("trust proxy", 1);

// 安全响应头
app.use(helmet());

// CORS — 允许多个前端来源（逗号分隔环境变量，生产 + 本地开发 + 预览分支）
const allowedOrigins = (process.env.CORS_ORIGIN || "https://hot-search-rho.vercel.app")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`CORS blocked: ${origin}`));
    }
  }
}));

// 请求频率限制 — 仅作用于热搜 API，排除健康检查
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, message: "请求太频繁，请稍后再试" },
});
app.use("/api/hot", limiter);

app.use(express.json());

// 路由
app.use("/api/hot", hotRouter);

// 健康检查
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// 临时调试
app.get("/api/debug/yt", async (_req, res) => {
  const http = axios.create({ timeout: 10000, headers: { "User-Agent": "Mozilla/5.0" } });
  const { data } = await http.get("https://www.youtube.com/feed/trending", {
    headers: { Cookie: "CONSENT=YES+cb" },
  });
  const startIdx = data.indexOf("var ytInitialData = ");
  if (startIdx === -1) { res.json({ err: "no ytInitialData", len: data.length }); return; }
  const jsonStart = data.indexOf("{", startIdx);
  let depth = 0, jsonEnd = -1;
  for (let i = jsonStart; i < data.length; i++) {
    if (data[i] === "{") depth++;
    else if (data[i] === "}") { depth--; if (depth === 0) { jsonEnd = i + 1; break; } }
  }
  if (jsonEnd === -1) { res.json({ err: "no close brace" }); return; }
  let yt: any;
  try { yt = JSON.parse(data.substring(jsonStart, jsonEnd)); }
  catch (e: any) { res.json({ err: "parse fail: " + e.message }); return; }
  // 提取视频
  // 探索正确的 YouTube 页面结构
  const twoCol = yt?.contents?.twoColumnBrowseResultsRenderer;
  const tabs = twoCol?.tabs;
  const tab0 = tabs?.[0];
  const tabContent = tab0?.tabRenderer?.content;
  const sectionList = tabContent?.sectionListRenderer?.contents;
  const richGrid = tabContent?.richGridRenderer?.contents;

  // 遍历 richGridRenderer.contents 收集所有 videoRenderer
  let items: any[] = [];
  if (Array.isArray(richGrid)) {
    for (const gridItem of richGrid) {
      // 1. richItemRenderer → 直接包含 videoRenderer
      const v1 = gridItem?.richItemRenderer?.content?.videoRenderer;
      if (v1?.videoId) { items.push(v1); continue; }
      // 2. richSectionRenderer → 包含多个视频
      const subItems = gridItem?.richSectionRenderer?.content?.richShelfRenderer?.contents;
      if (Array.isArray(subItems)) {
        for (const si of subItems) {
          const v2 = si?.richItemRenderer?.content?.videoRenderer;
          if (v2?.videoId) items.push(v2);
        }
      }
    }
  }
  const videos = items.slice(0, 5).map(v => ({
    id: v.videoId,
    title: v.title?.runs?.[0]?.text,
    author: v.ownerText?.runs?.[0]?.text,
    views: v.viewCountText?.simpleText,
  }));

  res.json({
    hasTwoCol: !!twoCol,
    tabsCount: tabs?.length,
    tabContentKeys: tabContent ? Object.keys(tabContent) : 'no content',
    richGridLen: richGrid?.length,
    itemsFound: items.length,
    sample: videos,
  });
});

// 全局错误处理 — 不暴露内部错误详情
function isProduction(): boolean {
  return process.env.NODE_ENV !== "development";
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[server] 未捕获错误:", err.message);
  res.status(500).json({
    code: 500,
    message: isProduction() ? "服务繁忙，请稍后重试" : err.message,
  });
});

// 启动服务
try {
  initDB();
} catch (e: any) {
  console.error("[server] DB 初始化失败:", e.message);
}

try {
  startCron(FETCH_INTERVAL);
} catch (e: any) {
  console.error("[server] Cron 启动失败:", e.message);
}

app.listen(PORT, () => {
  console.log(`[server] 今日热搜 API 已启动: http://localhost:${PORT}`);
});
