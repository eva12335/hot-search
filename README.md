# 今日热搜 (HotSearch)

多平台热搜聚合看板，实时展示微博、知乎、百度等平台的热搜榜单。

## 功能

- **多平台聚合**：首页卡片网格，每张卡片展示一个平台的热搜 Top 10
- **实时更新**：后端每 5-10 分钟轮询一次，前端自动刷新
- **排名变化**：支持查看历史趋势和排名升降（二期）

## 技术栈

| 层 | 选型 | 说明 |
|----|------|------|
| 前端 | React + TypeScript + Vite + Tailwind CSS | SPA + 响应式 |
| 后端 API | Express (Node.js) + TypeScript | RESTful 接口 |
| 数据采集 | TypeScript (axios + cheerio) | 每平台独立适配器，集成在后端 |
| 缓存 | NodeCache | 5 分钟 TTL（开发阶段，后续可换 Redis） |
| 存储 | — | MVP 仅内存缓存 + 实时采集，不引入数据库 |
| 部署 | Vercel (前端) + Railway/Render (后端) | HTTPS 公网访问 |

## 快速开始

```bash
# 1. 启动后端 API
cd backend
npm install
npm run dev                        # 默认端口 3001

# 2. 启动前端
cd frontend
npm install
npm run dev                        # 默认端口 5173

# 3. 验证接口
curl http://localhost:3001/api/hot/weibo
curl http://localhost:3001/api/hot/zhihu
curl http://localhost:3001/api/hot/baidu
```

> 注：后端基于 Express + TypeScript 自建。DailyHotApi（`/DailyHotApi` 目录）已验证数据源可用，作为采集适配器的参考实现。

## 项目结构

```
├── README.md              # 项目概览
├── PRD.md                 # 产品需求文档
├── TECH_DESIGN.md         # 技术设计文档
├── AGENTS.md              # AI 协作指南
├── Research/
│   ├── RESEARCH.md        # 交叉比对完整报告
│   ├── SUMMARY.md         # 调研总结
│   ├── deep-research-report.md
│   └── 深度调研任务：聚合...md
├── DailyHotApi/           # 数据 API（第三方，已克隆验证）
├── backend/               # 自建后端（待开发）
└── frontend/              # 前端面板（待开发）
```

## 许可证

学习项目，非商业用途。数据来源于各平台公开热搜榜单。
