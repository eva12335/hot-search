import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
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

// 状态面板
app.get("/", (_req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>今日热搜 - 采集面板</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#060b1a;color:#e8e4dd;font-family:system-ui,-apple-system,sans-serif;padding:24px;min-height:100vh}
  h1{font-family:Georgia,'Noto Serif SC',serif;color:#c9a96e;font-size:24px;margin-bottom:4px}
  .sub{color:#5c5a55;font-size:13px;margin-bottom:24px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
  .card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;backdrop-filter:blur(16px)}
  .card.ok{border-left:3px solid #4ade80}
  .card.err{border-left:3px solid #f87171}
  .card.load{border-left:3px solid #5c5a55}
  .plat-name{font-weight:600;font-size:15px}
  .plat-type{font-size:12px;color:#5c5a55;margin-left:8px}
  .row{display:flex;justify-content:space-between;align-items:center;margin-top:8px}
  .stat{font-size:13px;color:#5c5a55}
  .val{font-size:13px;font-family:monospace}
  .badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600}
  .badge-ok{background:rgba(74,222,128,0.15);color:#4ade80}
  .badge-err{background:rgba(248,113,113,0.15);color:#f87171}
  .badge-stale{background:rgba(201,169,110,0.15);color:#c9a96e}
  .error-msg{font-size:12px;color:#f87171;margin-top:8px;word-break:break-all}
  .refresh{font-size:12px;color:#5c5a55;text-align:right;margin-top:24px}
</style>
</head>
<body>
<h1>今日热搜 · 采集状态</h1>
<p class="sub">刷新 <span id="tick">—</span> · uptime <span id="uptime">—</span></p>
<div class="grid" id="grid"><div class="card load" style="text-align:center;padding:32px"><span class="stat">正在唤醒服务器（Render 冷启动约需 30-60 秒）...</span><br><span class="stat" id="wait" style="font-family:monospace"></span></div></div>
<p class="refresh" id="err"></p>
<script>
const grid=document.getElementById('grid'),errEl=document.getElementById('err'),waitEl=document.getElementById('wait');
let waitSec=0,waitTimer=0;
function startWait(){waitTimer=setInterval(()=>{waitSec++;if(waitEl)waitEl.textContent='已等待 '+waitSec+' 秒'},1000);}
function stopWait(){clearInterval(waitTimer);}
startWait();
async function fetchData(){
  try{
    const r=await fetch('/api/hot/all');
    const d=await r.json();
    const h=await fetch('/api/health').then(r=>r.json());
    document.getElementById('uptime').textContent=Math.round(h.uptime)+'s';
    document.getElementById('tick').textContent=new Date().toLocaleTimeString('zh-CN');
    let html='';
    for(const k of Object.keys(d).sort()){
      const p=d[k],ok=p.success&&p.data?.length>0;
      html+='<div class="card '+(ok?'ok':'err')+'">'
        +'<div><span class="plat-name">'+p.title+'</span><span class="plat-type">'+p.type+'</span></div>'
        +'<div class="row"><span class="stat">状态</span>'
        +(p.stale?'<span class="badge badge-stale">降级</span>':'')
        +(ok?'<span class="badge badge-ok">正常</span>':'<span class="badge badge-err">失败</span>')
        +'</div>'
        +'<div class="row"><span class="stat">数据条数</span><span class="val">'+p.data.length+'</span></div>'
        +(p.lastSuccessAt?'<div class="row"><span class="stat">最后成功</span><span class="val">'+new Date(p.lastSuccessAt).toLocaleString('zh-CN')+'</span></div>':'')
        +(p.error?'<div class="error-msg">'+p.error+'</div>':'')
        +'</div>';
    }
    grid.innerHTML=html;
    errEl.textContent='';
    stopWait();
  }catch(e){
    errEl.textContent='连接失败: '+e.message+'（可刷新重试）';
    stopWait();
    grid.innerHTML='<div class="card err" style="text-align:center;padding:24px"><span style="color:#f87171">获取失败</span><br><span class="stat">'+e.message+'</span></div>';
  }
}
fetchData();setInterval(fetchData,30000);
</script>
</body></html>`);
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
