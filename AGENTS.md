# AGENTS.md — AI 协作指南

本文件供 Claude Code、Copilot、Cursor 等 AI 工具读取，确保 AI 理解项目约定。

## 项目概述

"AI 热搜"是一个 AI 垂直领域多平台热搜聚合网站，从社交平台（微博/知乎/B 站）按 AI 关键词过滤 + AI 原生平台（HuggingFace/GitHub Trending/YouTube）采集热门内容，以卡片网格展示。

> 当前版本：V2.0（2026-05-31）| 前一版本 V1.0 为全品类聚合（已归档）

## 技术栈

- **前端**：React 19 + TypeScript + Vite 8 + Tailwind CSS v4
- **后端**：Express (Node.js) + TypeScript
- **缓存**：NodeCache（内存，单条+时间戳）+ SQLite（磁盘历史快照）
- **数据库**：SQLite (better-sqlite3)，7 天自动清理，启用 WAL 模式
- **采集**：axios，每平台独立适配器，集成在后端
- **部署**：Vercel (前端) + Render (后端)
- **图表**：Canvas 2D API（零依赖，趋势图）

## 项目结构

```
├── frontend/                 # React + Vite 前端
│   └── src/
│       ├── components/       # HotCard, HotItem, Header, Footer, PlatformGrid
│       ├── lib/              # api.ts, format.ts, types.ts
│       ├── App.tsx           # 主页面
│       └── index.css         # Tailwind v4 + 全局样式
├── backend/                  # Express + TypeScript 后端
│   └── src/
│       ├── adapters/         # 平台适配器 (6 个)
│       │   ├── weibo.ts         (改造：+AI 过滤)
│       │   ├── zhihu.ts         (改造：+AI 过滤)
│       │   ├── bilibili.ts      (新增，WBI 签名)
│       │   ├── huggingface.ts   (新增)
│       │   ├── github-trending.ts (新增)
│       │   ├── youtube.ts         (新增，Invidious API)
│       │   └── filter.ts        (AI 关键词过滤工具)
│       ├── routes/
│       │   └── hot.ts        # /api/hot/* 路由
│       ├── cache.ts          # NodeCache 封装
│       ├── cron.ts           # 定时刷新
│       ├── db.ts             # SQLite (新增)
│       └── index.ts          # 入口
│   └── data/                 # SQLite 数据文件 (gitignore)
├── DailyHotApi/              # 参考实现 (50+ 平台，仅参考)
├── PRD.md                    # V1.0 产品需求文档 (已归档)
├── PRD-v2.md                 # V2.0 产品需求文档
├── TECH_DESIGN.md            # V1.0 技术设计文档 (已归档)
├── TECH_DESIGN-v2.md         # V2.0 技术设计文档
├── ARCHITECTURE.md           # V2.0 架构图 (Mermaid)
├── v2-showcase.html          # V2.0 视觉样板间 (设计基线)
├── AGENTS.md                 # 本文件
└── README.md
```

## 编码约定

### 通用
- 中文注释，解释设计意图而非字面含义
- 前后端统一 TypeScript
- 新增平台只需在 `adapters/` 下添加一个文件，实现 `PlatformAdapter` 接口
- 每个适配器至少保留 2 条数据线路（主 fetch + 备 fallbackFetch）
- 请求头必须包含合理 UA 和 Referer
- 硬编码配置一律提取到环境变量
- **写完适配器后必须 `curl` 实网验证字段映射**（参见 `feedback-verify-real-data` 记忆）
- 社交平台（微博/知乎/B 站）适配器输出前必须过 `filter.ts` 的 `filterAI()`

### 前端
- 所有样式用 Tailwind + CSS 自定义属性 (--gold, --weibo 等)
- 组件以功能拆分，单文件不超过 250 行
- 数据获取用 SWR + 3min 轮询
- 卡片状态判断只看 `success` 和 `stale` 两个布尔值
- 3D 视差用 CSS Transform，不引入 Three.js
- 趋势图用 Canvas 2D，不引入图表库
- 骨架屏用 CSS shimmer 动画

### 后端
- TypeScript 类型注解全覆盖
- 采集异常必须打日志，不吞错误
- API 响应统一格式 `{ success, stale, platform, title, type, lastSuccessAt, data }`
- 适配器采集失败时走降级链：fetch → fallbackFetch → NodeCache → SQLite → empty
- 采集失败时标记具体错误类型：`timeout` / `http_5xx` / `http_4xx` / `parse_error` / `network_error`（用于前端精确提示）
- 缓存条目统一结构 `{ data, fetchedAt: number, expiresAt: number }`
  - fresh: now < expiresAt (< 10min)
  - stale: 10–20min，前端显示"数据更新于 X 分钟前"
  - invalid: > 20min，丢弃，走 SQLite 兜底

### 设计规范 (来自 v2-showcase.html)

- **主题**：深空蓝 `#060b1a` + 香槟金 `#c9a96e` + 暖灰白 `#e8e4dd`
- **卡片**：玻璃拟态 (`backdrop-filter: blur(24px)`) + `perspective: 1200px` 3D 视差
- **字体**：标题 `Georgia, 'Noto Serif SC'` | 正文 system fonts | 数字 monospace
- **响应式**：桌面 3 列 / 平板 2 列 / 手机 1 列
- **平台色**：微博 `#f97316` | 知乎 `#6366f1` | B 站 `#ec4899` | HuggingFace `#ffbd59` | GitHub `#8b949e` | YouTube `#ff0000`

## 常用命令

```bash
# 前端开发
cd frontend && npm run dev          # 启动前端 (localhost:5173)

# 后端开发
cd backend && npm run dev           # 启动 API (localhost:3001)

# 适配器实网验证
curl -s "https://weibo.com/ajax/side/hotSearch" -H "User-Agent: ..." | python3 -m json.tool
curl -s "https://huggingface.co/api/models?sort=trending&limit=5" | python3 -m json.tool

# 单文件测试
cd backend && npx tsx src/adapters/weibo.ts
cd backend && npx tsx src/adapters/huggingface.ts

# 参考实现
cd DailyHotApi && NODE_ENV=development pnpm dev  # 启动 (localhost:6688)
```

## 数据源矩阵

| 适配器 | 平台 | 类型 | 主线路 | 备用线路 | 鉴权 |
|------|------|------|------|------|------|
| `weibo.ts` | 微博 | 社交·AI 过滤 | `weibo.com/ajax/side/hotSearch` | `m.weibo.cn/api/container/getIndex` | 无 |
| `zhihu.ts` | 知乎 | 社交·AI 过滤 | `api.zhihu.com/topstory/hot-lists/total` | 页面解析 `/hot` | Cookie (可选) |
| `bilibili.ts` | B 站 | 社交·AI 过滤 | `api.bilibili.com/x/web-interface/ranking/v2` | `/ranking?jsonp=jsonp` | WBI 签名 |
| `huggingface.ts` | HuggingFace | AI 原生 | `/api/trending` (hf-mirror) | `models?sort=lastModified` | 无 |
| `github-trending.ts` | GitHub | AI 原生 | 社区 API / HTML 解析 | GitHub Search API | 无 |
| `youtube.ts` | YouTube | 热门视频 | Invidious `/api/v1/trending?region=US` | 多区域多实例轮询 | 无 |

## 降级链

```
fetch → fallbackFetch → NodeCache(stale) → SQLite(最近快照) → empty
```

API 响应字段 `{ success, stale, lastSuccessAt }` 允许前端只用两个布尔值判断所有展示状态。

## 重要约束

- 仅采集公开数据，不抓取用户隐私
- 采集间隔 ≥ 10 分钟，各平台请求错峰
- 页脚必须标注数据来源和非商业声明
- 单平台失效不影响其他平台，有旧数据比没数据好
- 不引入图表库、Three.js、CSS-in-JS、UI 组件库
- 渲染前必须 filter AI 关键词（社交平台），重新排名
- 前端所有效果移动端可降级
- 生产环境错误信息脱敏，开发环境返回完整异常
- 缓存 TTL 默认 600s（`CACHE_TTL` 环境变量），过期后走降级链

## 测试要求

### 适配器验证
- 每完成一个适配器，必须手动 `curl` 实网验证，确认返回 ≥ 10 条有效数据
- 打印所有字段名，确保字段映射完整（参照 `feedback-verify-real-data` 记忆）
- 验证主线路和备用线路都能独立返回数据

### 容错验证
- 模拟单平台挂掉（改错 API 地址），确认其他平台正常展示
- 清空 NodeCache（重启服务），确认 SQLite 历史快照兜底
- 10 分钟内连续刷新，确认不重复打上游（查看日志中请求次数）
- 多源部分失败时，全局展示"降级运行"横幅（degraded 状态）

### 端到端验证
- 前端 3 列/2 列/1 列布局分别走通
- 趋势图弹窗打开/关闭正常
- 心跳保活日志确认
