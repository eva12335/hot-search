# AGENTS.md — AI 协作指南

本文件供 Claude Code、Copilot、Cursor 等 AI 工具读取，确保 AI 理解项目约定。

## 项目概述

"今日热搜"是一个多平台热搜聚合网站，首页以卡片网格展示微博、知乎、百度等平台的热搜榜单。

## 技术栈

- **前端**：React + TypeScript + Vite + Tailwind CSS
- **后端**：Express (Node.js) + TypeScript
- **缓存**：NodeCache（内存 TTL，开发阶段；后续可换 Redis）
- **数据库**：暂无（MVP 仅缓存 + 实时采集，二期引入 PostgreSQL）
- **采集**：axios + cheerio，每平台独立适配器，集成在后端
- **部署**：Vercel (前端) + Railway/Render (后端)

## 项目结构

```
├── frontend/          # React + Vite 前端
│   ├── src/
│   │   ├── components/    # React 组件
│   │   ├── lib/           # 工具函数、API 调用、类型定义
│   │   └── App.tsx        # 主页面
│   └── index.html
├── backend/           # Express + TypeScript 后端
│   ├── src/
│   │   ├── adapters/      # 平台采集适配器
│   │   ├── routes/        # API 路由
│   │   ├── cache.ts       # 内存缓存
│   │   └── index.ts       # 入口
│   └── package.json
├── DailyHotApi/       # 第三方数据 API (参考实现)
├── Research/          # 调研报告
├── PRD.md             # 产品需求文档
├── TECH_DESIGN.md     # 技术设计文档
└── README.md          # 项目概览
```

## 编码约定

### 通用
- 中文注释，解释设计意图而非字面含义
- 前后端统一 TypeScript，类型定义可共享
- 新增平台只需在 `adapters/` 下添加一个文件，实现 `PlatformAdapter` 接口
- 每个适配器至少保留 2 条数据线路（主 + 备 fallback）
- 请求头必须包含合理 UA 和 Referer
- 硬编码配置一律提取到环境变量

### 前端
- 所有样式用 Tailwind 工具类，禁止内联 style
- 组件以功能拆分，单文件不超过 200 行
- 数据获取用 fetch + SWR 轮询
- 不使用 CSS-in-JS

### 后端
- TypeScript 类型注解全覆盖
- 采集异常必须打日志，不吞错误
- 接口返回统一 JSON 格式 `{ code, data, message }`
- 适配器采集失败时返回空数组，不抛异常

## 常用命令

```bash
# 前端开发
cd frontend && npm run dev          # 启动前端 (localhost:5173)

# 后端开发
cd backend && npm run dev           # 启动 API (localhost:3001)

# 参考实现：DailyHotApi（已验证接口可用，作为适配器开发参考）
cd DailyHotApi && NODE_ENV=development pnpm dev  # 启动 (localhost:6688)

# 采集脚本测试
cd backend && npx tsx src/adapters/weibo.ts
cd backend && npx tsx src/adapters/zhihu.ts
cd backend && npx tsx src/adapters/baidu.ts
```

## 数据源参考

| 平台 | 主线路 | 备用线路 |
|------|--------|----------|
| 微博 | `weibo.com/ajax/side/hotSearch` | `m.weibo.cn/api/container/getIndex` |
| 知乎 | `api.zhihu.com/topstory/hot-lists/total` | 页面解析 `/hot` |
| 百度 | `top.baidu.com/board?tab=realtime` | 第三方 API |

## 重要约束

- 仅采集公开热搜数据，不抓取用户隐私
- 采集间隔 ≥ 5 分钟
- 页脚必须标注数据来源和非商业声明
- 单平台接口失效时降级展示"暂无数据"，不阻塞其他平台
- 不引入 Tailwind/Bootstrap 之外的 CSS 框架
- 不引入外部弹窗库（统一用 Toast 或内联提示）
