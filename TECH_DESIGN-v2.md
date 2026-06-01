# 技术设计文档 — AI 热搜 V2.0

> 版本：v2.0 | 日期：2026-05-31 | 对应 PRD v2.0

## 1. 系统架构

```
┌──────────────────────────────────────────────────────────────┐
│                    前端 (React 19 + Vite 8 + Tailwind v4)      │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │
│  │ 微博   │ │ 知乎   │ │ B站    │ │ Hug    │ │ GitHub │     │
│  │ (过滤) │ │ (过滤) │ │ (过滤)  │ │ Face   │ │ Trend  │     │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘     │
│        SPA + SWR 轮询 (3min) + Canvas 趋势图                    │
│        响应式 3/2/1 列 + 3D 鼠标视差 + 玻璃拟态                    │
└────────────────────────────┬─────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼─────────────────────────────────┐
│                  API 层 (Express + TypeScript)                 │
│  GET /api/hot/all              → 6 平台最新榜单 + 缓存         │
│  GET /api/hot/:platform        → 单平台最新榜单 + 缓存         │
│  GET /api/hot/:platform/history?hours=24  → 历史趋势 (新增)   │
│  GET /api/health               → 心跳保活                      │
│  → 读 NodeCache，miss → SQLite，miss → 触发采集               │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│              采集层 (Cron + 适配器 + 过滤器)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐ │
│  │weibo.ts  │ │zhihu.ts  │ │bilibili  │ │hugging   │ │github│ │youtube│ │
│  │(过滤)    │ │(过滤)    │ │.ts(过滤) │ │face.ts   │ │-trend│ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └──┬───┘ │
│       └─────────────┴────────────┴────────────┴────────┘       │
│                    │ filter.ts (AI 关键词过滤)                   │
│              每 5 分钟轮询 + 失败 fallback                       │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│              NodeCache (内存)  +  SQLite (磁盘)                 │
│  ┌──────────────────┐    ┌──────────────────────────┐        │
│  │   NodeCache      │    │  SQLite (better-sqlite3)  │        │
│  │   内存缓存        │ →  │  每次采集后写入快照          │        │
│  │   单条+时间戳     │    │  按平台分表                 │        │
│  │   5min fresh      │    │  自动清理 7 天前数据         │        │
│  │   15min stale     │    │  服务重启后仍可用            │        │
│  └──────────────────┘    └──────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## 2. 适配器设计

### 2.1 接口（不变）

```typescript
// adapters/weibo.ts 中定义（不变）
export interface HotItem {
  rank: number;
  title: string;
  hot: number | null;     // 各平台统一为数值，不支持 null 时为 0
  url: string;
  desc?: string;
  delta?: 'up' | 'down' | 'same' | 'new';   // V2 新增
}

export interface AdapterMeta {
  platformName: string;    // "weibo"
  displayName: string;     // "微博"
  typeLabel: string;       // "AI 热搜"
  sourceUrl: string;       // 源地址
}

export interface PlatformAdapter {
  meta: AdapterMeta;
  fetch(): Promise<HotItem[]>;
  fallbackFetch(): Promise<HotItem[]>;
}
```

### 2.2 适配器清单

| 文件 | 平台 | 类型 | 鉴权 | 新增/改造 |
|------|------|------|------|------|
| `weibo.ts` | 微博 | 社交平台·AI 过滤 | 无 | 改造：增加 filter AI |
| `zhihu.ts` | 知乎 | 社交平台·AI 过滤 | Cookie（可选） | 改造：增加 filter AI |
| `bilibili.ts` | B 站 | 社交平台·AI 过滤 | WBI 签名 | 新增：替换 baidu |
| `huggingface.ts` | HuggingFace | AI 原生 | 无 | 新增 |
| `github-trending.ts` | GitHub Trending | AI 原生 | 无 | 新增 |
| `youtube.ts` | YouTube | 热门视频 | 无 | 新增：Invidious API |
| `filter.ts` | — | 关键词过滤工具 | — | 新增 |

### 2.3 AI 关键词过滤器

```typescript
// adapters/filter.ts
const AI_KEYWORDS = [
  'AI', '大模型', 'GPT', 'LLM', '人工智能', '深度学习',
  '机器学习', 'ChatGPT', 'AIGC', 'OpenAI', 'Transformer',
  'Claude', 'DeepSeek', '智能体', 'Agent', '多模态',
  '文生图', '视频生成', '具身智能', '推理', '对齐',
];

export function filterAI(items: HotItem[]): HotItem[] {
  return items
    .filter(item => AI_KEYWORDS.some(kw =>
      item.title.toLowerCase().includes(kw.toLowerCase())
    ))
    .map((item, i) => ({ ...item, rank: i + 1 })); // 重新排名
}
```

### 2.4 B 站适配器（WBI 签名）

参考 DailyHotApi 实现，主线路用 WBI 签名 API，备用线路用无签名旧接口：

```
主线路: api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all&{wbi}
备用线路: api.bilibili.com/x/web-interface/ranking?jsonp=jsonp&rid=0&type=all
依赖新增: md5（计算 w_rid 签名）
```

### 2.5 HuggingFace 适配器

```
端点: https://hf-mirror.com/api/trending（主线）/ models?sort=lastModified（备线）
无鉴权，直接 GET
字段映射: id → title, likes → hot, downloads → 描述信息
```

### 2.6 YouTube 适配器

```
端点: Invidious API /api/v1/trending?region=US（主线）/ 多区域轮询（备线）
5 个公共实例 fallback，无鉴权
字段映射: title → title, viewCount → hot, author → 描述信息
```

### 2.7 GitHub Trending 适配器

```
方案: github-trending-api (npm 社区包) 或直接 HTML 解析 github.com/trending
无鉴权
字段映射: fullname → title, stars → hot, currentPeriodStars → 近期热度
DailyHotApi 已有 github.ts 可参考
```

## 3. 数据库设计

### 3.1 SQLite 表结构

```sql
-- 历史快照表（按平台分表，运行时动态创建）
CREATE TABLE IF NOT EXISTS snapshot_weibo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rank INTEGER NOT NULL,
  title TEXT NOT NULL,
  hot_score INTEGER,
  url TEXT,
  captured_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS snapshot_zhihu (...);     -- 同结构
CREATE TABLE IF NOT EXISTS snapshot_bilibili (...);
CREATE TABLE IF NOT EXISTS snapshot_huggingface (...);
CREATE TABLE IF NOT EXISTS snapshot_github (...);

CREATE INDEX IF NOT EXISTS idx_weibo_time ON snapshot_weibo(captured_at);
CREATE INDEX IF NOT EXISTS idx_weibo_title ON snapshot_weibo(title);
-- 其余平台同理
```

### 3.2 数据写入

```
每 10 分钟 cron 采集 →
  1. NodeCache.set(key, { data, fetchedAt, expiresAt })  // 更新内存缓存
  2. INSERT INTO snapshot_xxx                             // 写入历史快照
  3. 对比上一轮快照，计算 delta 字段                       // 排名变化
```

### 3.3 数据清理

```
每小时检查一次 →
  DELETE FROM snapshot_xxx WHERE captured_at < datetime('now', '-7 days')
```

### 3.4 多层降级与缓存策略

V2.0 引入"采集 → 备用采集 → NodeCache → SQLite → 空数据"五级降级链。

#### 3.4.1 缓存结构（单条 + 时间戳）

```typescript
// 缓存条目统一结构
interface CacheEntry {
  data: HotItem[];
  fetchedAt: number;   // 采集时间 (unix ms)
  expiresAt: number;   // 过期时间 (unix ms) = fetchedAt + 300_000
}

// 判断逻辑
function dataState(entry: CacheEntry): 'fresh' | 'stale' | 'invalid' {
  const now = Date.now();
  if (now < entry.expiresAt) return 'fresh';              // < 10min
  if (now < entry.fetchedAt + 1_200_000) return 'stale';   // 10–20min
  return 'invalid';                                         // > 20min，丢弃
}
```

#### 3.4.2 降级链

```
主线路 (fetch) 成功
    ↓ 写入 NodeCache，返回 fresh
主线路 (fetch) 失败
    ↓
备用线路 (fallbackFetch) 成功
    ↓ 写入 NodeCache，返回 fresh
备用线路 (fallbackFetch) 失败
    ↓
NodeCache 命中
    ↓ 按 fetchedAt 判断 fresh / stale，返回
NodeCache 未命中 (服务重启/TTL 到期)
    ↓
SQLite 最近一次快照
    ↓ 查询 captured_at 最近一条，返回 stale
SQLite 也无数据
    ↓
返回 success: false + data: []
```

> 优势：即使 NodeCache 清空或服务重启，SQLite 磁盘数据仍在，用户仍能看到最后一次成功采集的内容。

#### 3.4.3 前端展示策略

| success | stale | data | 前端展示 |
|------|------|------|------|
| true | false | [...] | 正常卡片，实时数据 |
| true | true | [...] | 正常卡片 + "数据更新于 12 分钟前" |
| false | false | [] | 灰色卡片"暂无可展示数据"，其他卡片正常 |
| 全局 false | — | — | 所有平台都失败 → "网络波动中，请稍后刷新" |

> 设计原则：前端只关心 `success` 和 `stale` 两个布尔值，不猜字段组合。有旧数据比没数据好，单平台故障不影响其他平台。

## 4. API 设计

### 4.1 对外 API

| 方法 | 路径 | 说明 | 缓存 |
|------|------|------|------|
| GET | `/api/hot/all` | 5 平台最新榜单 | NodeCache → SQLite |
| GET | `/api/hot/:platform` | 单平台最新榜单 | NodeCache → SQLite |
| GET | `/api/hot/:platform/history?hours=24` | 历史趋势 (新增) | DB 直查 |
| GET | `/api/health` | 心跳保活 | 无缓存 |

### 4.2 GET /api/hot/all — 成功

```json
{
  "weibo": {
    "success": true,
    "stale": false,
    "platform": "weibo",
    "title": "微博",
    "type": "AI 热搜",
    "lastSuccessAt": "2026-05-31T22:00:00Z",
    "data": [
      { "rank": 1, "title": "DeepSeek 发布新一代推理模型", "hot": 4859200, "url": "https://s.weibo.com/weibo?q=...", "desc": "", "delta": "up" },
      { "rank": 2, "title": "OpenAI 宣布 GPT-5 内测", "hot": 3921000, "url": "https://s.weibo.com/weibo?q=...", "desc": "", "delta": "new" }
    ]
  },
  "zhihu": {
    "success": true,
    "stale": false,
    "platform": "zhihu",
    "title": "知乎",
    "type": "AI 热搜",
    "lastSuccessAt": "2026-05-31T22:00:00Z",
    "data": [
      { "rank": 1, "title": "如何评价 DeepSeek 的新模型？", "hot": 28500000, "url": "https://www.zhihu.com/question/...", "desc": "AI 技术讨论", "delta": "up" }
    ]
  },
  "bilibili": {
    "success": true,
    "stale": false,
    "platform": "bilibili",
    "title": "B 站",
    "type": "AI 热搜",
    "lastSuccessAt": "2026-05-31T22:00:00Z",
    "data": [
      { "rank": 1, "title": "【深度评测】Claude 4 vs GPT-5 终极对比", "hot": 3560000, "url": "https://www.bilibili.com/video/...", "desc": "该视频暂无简介", "delta": "up" }
    ]
  },
  "huggingface": {
    "success": true,
    "stale": false,
    "platform": "huggingface",
    "title": "HuggingFace",
    "type": "热门模型",
    "lastSuccessAt": "2026-05-31T22:00:00Z",
    "data": [
      { "rank": 1, "title": "meta-llama/Llama-4-Maverick", "hot": 2450000, "url": "https://huggingface.co/meta-llama/Llama-4-Maverick", "desc": "Text Generation · 2.3M downloads", "delta": "same" }
    ]
  },
  "github": {
    "success": true,
    "stale": false,
    "platform": "github",
    "title": "GitHub Trending",
    "type": "热门仓库",
    "lastSuccessAt": "2026-05-31T22:00:00Z",
    "data": [
      { "rank": 1, "title": "microsoft/autogen", "hot": 45200, "url": "https://github.com/microsoft/autogen", "desc": "Multi-agent AI framework", "delta": "up" }
    ]
  }
}
```

### 4.3 GET /api/hot/all — 部分平台陈旧/失败

```json
{
  "weibo": {
    "success": true,
    "stale": true,
    "platform": "weibo",
    "title": "微博",
    "type": "AI 热搜",
    "lastSuccessAt": "2026-05-31T21:45:00Z",
    "data": [ /* 15 分钟前的数据，来自 NodeCache 备用 */ ]
  },
  "bilibili": {
    "success": false,
    "stale": false,
    "platform": "bilibili",
    "title": "B 站",
    "type": "AI 热搜",
    "lastSuccessAt": null,
    "data": [],
    "error": "主备线路均不可用，且无历史快照"
  },
  "zhihu": {
    "success": true,
    "stale": false,
    "platform": "zhihu",
    "title": "知乎",
    "type": "AI 热搜",
    "lastSuccessAt": "2026-05-31T22:00:00Z",
    "data": [ /* 正常 */ ]
  },
  "huggingface": {
    "success": true,
    "stale": false,
    "platform": "huggingface",
    "title": "HuggingFace",
    "type": "热门模型",
    "lastSuccessAt": "2026-05-31T22:00:00Z",
    "data": [ /* 正常 */ ]
  },
  "github": {
    "success": true,
    "stale": false,
    "platform": "github",
    "title": "GitHub Trending",
    "type": "热门仓库",
    "lastSuccessAt": "2026-05-31T22:00:00Z",
    "data": [ /* 正常 */ ]
  }
}
```

> 单平台故障不影响其他平台。陈旧数据正常展示 + 时间提示，无数据平台展示"暂无可展示数据"。

### 4.4 GET /api/hot/:platform — 成功

```json
{
  "success": true,
  "stale": false,
  "platform": "weibo",
  "title": "微博",
  "type": "AI 热搜",
  "lastSuccessAt": "2026-05-31T22:00:00Z",
  "data": [
    { "rank": 1, "title": "DeepSeek 发布新一代推理模型", "hot": 4859200, "url": "https://s.weibo.com/weibo?q=...", "desc": "", "delta": "up" },
    { "rank": 2, "title": "OpenAI 宣布 GPT-5 内测", "hot": 3921000, "url": "https://s.weibo.com/weibo?q=...", "desc": "", "delta": "new" }
  ]
}
```

### 4.5 GET /api/hot/:platform — 失败

**未知平台：**

```json
{
  "success": false,
  "message": "未知平台: baidu，支持: weibo, zhihu, bilibili, huggingface, github"
}
```

**采集全部失败且无历史数据：**

```json
{
  "success": false,
  "stale": false,
  "platform": "weibo",
  "title": "微博",
  "type": "AI 热搜",
  "lastSuccessAt": null,
  "data": [],
  "error": "主备线路均不可用，且无历史快照"
}
```

> 开发环境（`NODE_ENV=development`）返回具体异常信息，生产环境返回通用文案。

### 4.6 GET /api/hot/:platform/history — 成功

```json
{
  "success": true,
  "platform": "huggingface",
  "title": "meta-llama/Llama-4-Maverick",
  "data": [
    { "time": "2026-05-31T00:00:00Z", "rank": 3, "hot": 2100000 },
    { "time": "2026-05-31T01:00:00Z", "rank": 3, "hot": 2150000 },
    { "time": "2026-05-31T02:00:00Z", "rank": 2, "hot": 2200000 },
    { "time": "2026-05-31T22:00:00Z", "rank": 1, "hot": 2450000 }
  ]
}
```

### 4.7 GET /api/hot/:platform/history — 失败

**数据积累中：**

```json
{
  "success": true,
  "platform": "github",
  "title": "some/new-repo",
  "data": []
}
```

> 平台数据采集不足 24 小时时返回空数组，前端显示"数据积累中"。

### 4.8 GET /api/health

```json
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": "2026-05-31T22:00:00Z"
}
```

## 5. 前端设计

### 5.1 组件树

```
App
├── Starfield (纯 CSS 背景层)
├── Header (Logo + 实时时间 + live dot)
├── TabBar (全部 / 社交平台 / AI 原生)
├── PlatformGrid (响应式 3/2/1 列)
│   ├── HotCard × 5
│   │   ├── CardHeader (平台图标 + 名称)
│   │   ├── HotList
│   │   │   └── HotItem × 10 (排名徽章 + delta + 标题 + 热度)
│   │   └── CardFooter (更新时间)
│   └── SkeletonCard (加载态)
├── TrendOverlay (趋势图弹窗)
│   ├── Canvas (2D 折线图)
│   └── MetaRow (平台/排名/峰值)
└── Footer
```

### 5.2 状态映射

前端只需判断两个布尔值：

```typescript
// lib/api.ts
interface PlatformResponse {
  success: boolean;
  stale: boolean;
  platform: string;
  title: string;
  type: string;
  lastSuccessAt: string | null;
  data: HotItem[];
  error?: string;
}

// 组件中
function renderCardState(resp: PlatformResponse) {
  if (resp.success && !resp.stale) return <HotCard data={resp.data} />;
  if (resp.success && resp.stale)  return <HotCard data={resp.data} staleHint={formatTime(resp.lastSuccessAt)} />;
  return <EmptyCard message={resp.error || "暂无可展示数据"} />;
}
```

### 5.3 技术选型

| 需求 | 方案 | 理由 |
|------|------|------|
| 数据获取 | SWR + 3min 轮询 | 已有依赖，自动去重、缓存 |
| 样式 | Tailwind CSS v4 + CSS 自定义属性 | 已有依赖，v4 原生支持 CSS variables |
| 3D 视差 | CSS Transform (rotateX/Y) | 纯 CSS，无依赖 |
| 趋势图 | Canvas 2D API | 零依赖，HiDPI 适配，与样板间一致 |
| 字体 | Georgia + system fonts | 样板间已确认 |

### 5.4 平台配置

```typescript
const PLATFORM_CONFIG = {
  weibo:       { name: '微博', icon: '🔥', color: '#f97316', tab: 'social' },
  zhihu:       { name: '知乎', icon: '💡', color: '#6366f1', tab: 'social' },
  bilibili:    { name: 'B 站', icon: '🎮', color: '#ec4899', tab: 'social' },
  huggingface: { name: 'HuggingFace', icon: '🤗', color: '#ffbd59', tab: 'ai' },
  github:      { name: 'GitHub Trending', icon: '🐙', color: '#8b949e', tab: 'ai' },
};
```

### 5.5 保活心跳

```typescript
// 前端每 2 分钟发一次心跳请求
setInterval(() => {
  fetch(`${API_URL}/health`);
}, 120_000);
```

## 6. 依赖变更

### 6.1 后端新增

```json
{
  "better-sqlite3": "^11.0.0",
  "md5": "^2.3.0"
}
```

### 6.2 前端不变

React 19、SWR 2.4、Tailwind v4、Vite 8，不引入图表库。

## 7. 部署

```
后端 (Express + SQLite) → Render (免费档)
前端 (Vite SPA)         → Vercel (免费)
```

### 7.1 Render 注意事项

- SQLite 文件存储在 Render 持久磁盘路径 `./data/` 下
- 免费档 15 分钟休眠 → 前端心跳保活缓解
- 冷启动后 NodeCache 为空 → SQLite 历史快照兜底
- 冷启动时间 < 30 秒

### 7.2 环境变量

```bash
# 后端
PORT=3001
CACHE_TTL=600
FETCH_INTERVAL=600
REQUEST_TIMEOUT=10000
ZHIHU_COOKIE=
SQLITE_PATH=./data/hot.db
NODE_ENV=production

# 前端
VITE_API_URL=http://localhost:3001/api
VITE_REFRESH_INTERVAL=180000
```

## 8. 关键设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 数据库 | SQLite 非 PostgreSQL | MVP 零运维，单文件，数据量 < 100MB |
| B 站签名 | 自实现 WBI（参考 DailyHotApi） | 不增加服务依赖 |
| 趋势图 | Canvas 2D 非图表库 | 零依赖，样板间已验证效果 |
| 3D 效果 | CSS Transform 非 Three.js | 性能好，移动端可降级 |
| 关键词过滤 | 静态关键词列表 | 简单可维护，后续可换 LLM 语义过滤 |
| Tab 分组 | 社交平台 / AI 原生 | 语义清晰，帮助用户理解数据来源差异 |
| 降级链 | fetch → fallback → cache → SQLite → empty | 五层兜底，服务重启后 SQLite 仍可用 |
| API 响应 | `success` + `stale` + `lastSuccessAt` | 前端两个布尔值判断所有状态，不猜字段组合 |
| 缓存结构 | 单条 `{data, fetchedAt, expiresAt}` | 不重复存，fresh/stale/invalid 纯时间判断 |
