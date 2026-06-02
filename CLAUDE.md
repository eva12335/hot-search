# 今日热搜

多平台 AI 热搜聚合看板，6 个数据源（微博/知乎/B站/百度/HuggingFace/GitHub），暗色科技风 V2 主题。

## 技术栈

- 前端：React + TypeScript + Vite + Tailwind v4 + SWR
- 后端：Express + TypeScript，Vercel Serverless Function（`api/index.ts` 入口）
- 部署：Vercel Hobby（前后端同域 `/api/*`），外部 cron-job.org 每 10min 预热缓存
- 缓存：内存 `Map<string, CacheEntry>` + 30 条历史快照（无外部存储）

## 启动

```bash
# 后端 (port 3001)
cd backend && npm run dev

# 前端 (port 5173)
cd frontend && npm run dev

# 测试
cd backend && npm test        # 36 个测试
cd frontend && npm test       # 31 个测试
```

## 目录结构

```
api/index.ts              — Vercel Serverless 入口（动态 import ESM app）
backend/src/
  app.ts                  — Express 初始化（中间件/路由/状态面板 HTML）
  index.ts                — 本地开发 listen（不被 Vercel 加载）
  cache.ts                — 内存缓存 Map + 历史快照
  routes/hot.ts           — API 路由 + refreshAll() + fetchPlatformForce()
  adapters/
    weibo.ts              — 微博热搜 ajax/side/hotSearch
    zhihu.ts              — 知乎热榜 API
    bilibili.ts           — B站搜索 (WBI 签名) + popular 兜底
    baidu.ts              — 百度热点 API
    huggingface.ts        — HuggingFace 模型页 HTML 解析
    github-trending.ts    — GitHub Trending HTML 解析
    filter.ts             — AI 关键词过滤 (100+ 关键词)
frontend/src/
  App.tsx                 — 首页（卡片网格/SWR 轮询/降级横幅）
  components/
    HotCard.tsx           — 单平台卡片
    TrendOverlay.tsx      — 趋势图浮层 (Canvas 2D)
  lib/
    api.ts                — fetchAllHot / fetchPlatformHistory
    types.ts              — PlatformResponse / HistoryResponse
    state.ts              — cardState 枚举
```

## 关键约定

- 后端 TS 用 `.js` 扩展名引用（ESM 规范）
- 根 `package.json` 有 `"type": "module"`，但 `api/index.ts` 不能顶层 import ESM（`@vercel/node` 编译后 CJS `require()` 无法加载 ESM），必须用动态 `await import()`
- `filterAI` 过滤为空时返回原始数据兜底（不返回空数组）
- Vercel 函数硬超时 10s，`refreshAll` 采用 5s primary + 3s fallback / 全局 9s 超时

## 已知坑位

1. **Vercel 多实例缓存不一致**：`/all` 不能纯读缓存，已改为缓存全空时自拉取兜底
2. **B站 API**：`ranking/v2` 全线返回 -352，只有 `popular` 可用
3. **微博链接**：`weibo.com/search` 强制跳 App，用 `s.weibo.com/weibo`
4. **百度**：热门列表 AI 关键词命中率低，filterAI 已加兜底
5. **趋势图**：历史数据存内存快照，冷启动后从零积累，前几次 cron 数据点不足

## 重启项目

1. `git clone` → `npm install`（根目录/backend/frontend 各装一次）
2. Vercel 部署：绑定自定义域名（CNAME `cname.vercel-dns.com`），解决国内访问
3. 持久化：接入 Upstash Redis 免费层替换内存 Map
4. 外部 cron：cron-job.org → `GET /api/hot/cron?token=hotsearch2026abc`

## 重要记录

项目 2026-06-02 封笔，完整总结在 Obsidian `01-项目/今日热搜-项目总结.md`。
