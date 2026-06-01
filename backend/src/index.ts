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
  const http = axios.create({ timeout: 10000 });
  // 尝试不同的 header 组合
  const { data } = await http.get("https://www.youtube.com/feed/trending?gl=US&hl=en", {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
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
  const tabContent = yt?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content;
  const richGrid = tabContent?.richGridRenderer?.contents;

  // 列出 richGrid 中每一项的 renderer 类型
  const itemTypes: string[] = [];
  if (Array.isArray(richGrid)) {
    for (const item of richGrid) {
      const keys = Object.keys(item);
      itemTypes.push(keys[0] || 'empty');
    }
  }
  // 检查是否有 continuation
  const cont = richGrid?.find((i: any) => i?.continuationItemRenderer);
  const contToken = cont?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;

  // 取前 5 项深入看
  const details = (richGrid || []).slice(0, 5).map((item: any) => {
    const type = Object.keys(item)[0];
    const content = item[type]?.content;
    const contentKeys = content ? Object.keys(content) : [];
    return { type, contentKeys: contentKeys.slice(0, 5) };
  });

  res.json({ richGridLen: richGrid?.length, itemTypes, hasCont: !!cont, contToken: contToken?.substring(0, 40), details });
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
