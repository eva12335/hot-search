# 今日热搜

多平台 AI 热搜聚合看板，6 个数据源（微博/知乎/B站/百度/HuggingFace/GitHub），暗色科技风 V2 主题。

## 技术栈

- 前端：React + TypeScript + Vite + Tailwind v4 + SWR
- 后端：Express + TypeScript，Vercel Serverless Function（`api/index.ts` 入口）
- 部署：Vercel Hobby（前后端同域 `/api/*`），域名 `www.zzxfxy.top`，外部 cron-job.org 每 10min 预热缓存
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
  App.tsx                 — 首页（左侧栏 + 翻书布局，桌面 3D rotateY / 手机淡入淡出）
  components/
    HotCard.tsx           — 单平台卡片（骨架屏 / 空状态 / 热搜列表）
    TrendOverlay.tsx      — 趋势图浮层 (Canvas 2D)
    PlatformGrid.tsx      — 已废弃（布局整合进 App.tsx）
    TabBar.tsx            — 已废弃（tab 整合进侧栏）
  lib/
    api.ts                — fetchAllHot / fetchPlatformHistory
    types.ts              — PlatformResponse / HistoryResponse
    state.ts              — cardState 枚举
```

## 关键约定

- 后端 TS 用 `.js` 扩展名引用（ESM 规范）
- 根 `package.json` 有 `"type": "module"`，但 `api/index.ts` 不能顶层 import ESM（`@vercel/node` 编译后 CJS `require()` 无法加载 ESM），必须用动态 `await import()`
- `filterAI` 过滤为空时直接返回空数组，前端显示"暂无 AI 相关热搜"（不再兜底泄露非 AI 内容）
- `fetchPlatform` / `fetchPlatformForce` 用 `Array.isArray()` 区分 fetch 失败与合法空结果
- Vercel 函数硬超时 10s，`refreshAll` 采用 5s primary + 3s fallback / 全局 9s 超时

## 已知坑位

1. **Vercel 多实例缓存不一致**：`/all` 不能纯读缓存，已改为缓存全空时自拉取兜底
2. **B站 API**：`ranking/v2` 全线返回 -352，只有 `popular` 可用
3. **微博链接**：`weibo.com/search` 强制跳 App，用 `s.weibo.com/weibo`
4. **百度**：热门列表 AI 关键词命中率极低，通常 0 条 AI 结果，不显示非 AI 内容
5. **趋势图**：历史数据存内存快照，冷启动后从零积累，前几次 cron 数据点不足

## 重启项目

1. `git clone` → `npm install`（根目录 + backend + frontend 各装一次）
2. Vercel 部署：`vercel --prod`，域名 `www.zzxfxy.top` 已绑定，无需重新配置
3. 持久化：若需要，接入 Upstash Redis 免费层替换内存 Map
4. 外部 cron：cron-job.org → `GET https://www.zzxfxy.top/api/hot/cron?token=hotsearch2026abc`
5. `.git/hooks/pre-push` 需手动复制到新克隆的仓库（git 不追踪 hooks）

## 重要记录

- 2026-06-02 封笔
- 2026-06-11 最终更新：域名绑定、翻书 UI、AI 过滤修复、手机适配
- 完整总结在项目记忆文件 `[[project-summary]]` `[[project-closure]]`
