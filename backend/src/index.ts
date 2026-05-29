import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import hotRouter from "./routes/hot.js";
import { startCron } from "./cron.js";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const FETCH_INTERVAL = parseInt(process.env.FETCH_INTERVAL || "300", 10) * 1000;

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
app.listen(PORT, () => {
  console.log(`[server] 今日热搜 API 已启动: http://localhost:${PORT}`);
  startCron(FETCH_INTERVAL);
});
