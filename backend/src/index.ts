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
  const results: any = {};

  // 测试 Piped API
  try {
    const r = await http.get("https://pipedapi.kavin.rocks/trending?region=US");
    results.piped = { status: r.status, items: Array.isArray(r.data) ? r.data.length : 'not_array' };
    if (Array.isArray(r.data) && r.data.length > 0) {
      results.piped_sample = r.data.slice(0, 3).map((v: any) => ({
        title: v.title, videoId: v.videoId, views: v.views, uploadedDate: v.uploadedDate
      }));
    }
  } catch (e: any) { results.piped = { error: e.message, code: e.code }; }

  // 测试其他 Invidious 实例
  for (const inst of [
    "https://invidious.fdn.fr",
    "https://inv.us.projectsegfau.lt",
    "https://invidious.slipfox.xyz",
    "https://invidious.nerdvpn.de",
    "https://iv.ggtyler.dev",
  ]) {
    try {
      const r = await http.get(`${inst}/api/v1/trending?region=US`);
      results[inst] = { status: r.status, items: Array.isArray(r.data) ? r.data.length : 'not_array' };
    } catch (e: any) { results[inst] = { error: e.message, code: e.code }; }
  }

  // 看看 iv.ggtyler.dev 返回什么
  try {
    const r2 = await http.get("https://iv.ggtyler.dev/api/v1/trending?region=US");
    results["iv.ggtyler.dev_raw"] = { type: typeof r2.data, isArray: Array.isArray(r2.data), first100: JSON.stringify(r2.data).substring(0, 200) };
  } catch (e: any) { results["iv.ggtyler.dev_raw"] = { error: e.message }; }

  res.json(results);
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
