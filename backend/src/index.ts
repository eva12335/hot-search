import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import hotRouter from "./routes/hot.js";
import { startCron } from "./cron.js";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const FETCH_INTERVAL = parseInt(process.env.FETCH_INTERVAL || "300", 10) * 1000;

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use("/api/hot", hotRouter);

// 健康检查
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// 启动服务
app.listen(PORT, () => {
  console.log(`[server] 今日热搜 API 已启动: http://localhost:${PORT}`);
  startCron(FETCH_INTERVAL);
});
