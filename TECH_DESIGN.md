# 技术设计文档 — 今日热搜

> 版本：v1.0 | 日期：2026-05-28 | 对应 PRD v1.0

## 1. 系统架构

```
┌─────────────────────────────────────────────────┐
│                前端 (React + Vite)                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │ 微博卡片 │ │ 知乎卡片 │ │ 百度卡片 │  ...       │
│  └─────────┘ └─────────┘ └─────────┘            │
│        SPA + 客户端轮询 (5min)                     │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────┐
│               API 层 (Express + TypeScript)        │
│  GET /api/hot/:platform                           │
│  GET /api/hot/all                                 │
│  → 读 NodeCache 缓存，miss 则触发采集              │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│          采集层 (Express 内置 Cron)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │weibo.ts  │ │zhihu.ts  │ │baidu.ts  │  ...    │
│  │适配器    │ │适配器    │ │适配器    │         │
│  └──────────┘ └──────────┘ └──────────┘         │
│  每 5-10 分钟轮询 + 失败重试 + 多源 fallback       │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│                   缓存层                            │
│  ┌──────────────┐                                │
│  │  NodeCache   │  内存 TTL 缓存                  │
│  │  (后续可换   │  5 分钟过期                     │
│  │   Redis)     │                                │
│  └──────────────┘                                │
└─────────────────────────────────────────────────┘
```

### 降级方案（生产环境备用）

若自建采集层出现大面积接口失效，可临时切换到此模式紧急恢复服务：

```
前端 (纯静态 HTML) → 直接调 DailyHotApi (Vercel 部署)
```

此模式省去 API 层 + 采集层，仅作为应急降级使用。

### 数据库设计（二期）

MVP 阶段仅使用内存缓存 + 实时采集，不引入数据库。历史快照和排名变化在二期通过 PostgreSQL 实现：

## 2. 数据库设计（二期）

> MVP 阶段仅使用 NodeCache 内存缓存 + 实时采集，不引入数据库。以下表设计供二期参考。

### 2.1 当前态表

```sql
CREATE TABLE hot_current (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,     -- weibo / zhihu / baidu
    rank INT NOT NULL,                 -- 排名 (1-based)
    title VARCHAR(500) NOT NULL,       -- 话题标题
    hot_score BIGINT,                  -- 热度值 (平台不同含义不同)
    url VARCHAR(500),                  -- 源链接
    captured_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(platform, rank)
);
```

### 2.2 历史快照表

```sql
CREATE TABLE hot_snapshot (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,
    title VARCHAR(500) NOT NULL,
    rank INT NOT NULL,
    hot_score BIGINT,
    url VARCHAR(500),
    captured_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_platform_time ON hot_snapshot(platform, captured_at);
CREATE INDEX idx_title ON hot_snapshot(title);
```

### 2.3 数据写入逻辑

```
每次采集 →
  1. DELETE FROM hot_current WHERE platform = ?
  2. INSERT INTO hot_current (批量写入新 Top N)
  3. INSERT INTO hot_snapshot (快照留存，不删除)
```

## 3. API 设计

### 3.1 对外 API（MVP）

| 方法 | 路径 | 说明 | 缓存 |
|------|------|------|------|
| GET | `/api/hot/all` | 所有平台最新榜单 | NodeCache 5min |
| GET | `/api/hot/:platform` | 单平台最新榜单 | NodeCache 5min |

### 3.2 对外 API（二期）

| 方法 | 路径 | 说明 | 缓存 |
|------|------|------|------|
| GET | `/api/hot/:platform/history?hours=24` | 某平台 24h 历史趋势 | DB 直查 |
| GET | `/api/hot/:platform/topic?title=xxx` | 某话题的历史热度曲线 | DB 直查 |

### 3.3 返回格式

```json
{
  "code": 200,
  "platform": "weibo",
  "title": "微博",
  "type": "热搜榜",
  "updateTime": "2026-05-28T12:00:00Z",
  "data": [
    {
      "rank": 1,
      "title": "话题标题",
      "hot": 1234567,
      "url": "https://s.weibo.com/weibo?q=...",
      "trend": "up"      // up / down / new / same (P1 功能)
    }
  ]
}
```

## 4. 采集适配器设计

每个平台一个独立的 TypeScript 文件，实现统一接口。参考 DailyHotApi 的适配器模式：

```typescript
// adapters/base.ts
export interface HotItem {
  rank: number;
  title: string;
  hot: number | null;
  url: string;
  desc?: string;
}

export interface AdapterResult {
  updateTime: string;
  data: HotItem[];
}

export interface PlatformAdapter {
  platformName: string;     // "weibo"
  displayName: string;      // "微博"
  typeLabel: string;        // "热搜榜"
  fetch(): Promise<HotItem[]>;
  fallbackFetch(): Promise<HotItem[]>;
}
```

```typescript
// adapters/weibo.ts
export const weiboAdapter: PlatformAdapter = {
  platformName: "weibo",
  displayName: "微博",
  typeLabel: "热搜榜",

  async fetch() {
    // 主线路：微博 PC 端 JSON API
    const resp = await axios.get("https://weibo.com/ajax/side/hotSearch", {
      headers: { "User-Agent": "...", "Referer": "https://weibo.com/" }
    });
    return parseWeiboResponse(resp.data);
  },

  async fallbackFetch() {
    // 备用线路：m.weibo.cn 移动端 API
    const resp = await axios.get("https://m.weibo.cn/api/container/getIndex?containerid=102803");
    return parseWeiboMobileResponse(resp.data);
  }
};
```

## 5. 前端组件树

```
App
├── Header (Logo + 最后更新时间)
├── PlatformGrid
│   ├── HotCard (微博)
│   │   ├── CardHeader (平台图标 + 名称 + 榜单类型)
│   │   └── HotList
│   │       └── HotItem × 10 (排名徽标 + 标题链接 + 热度)
│   ├── HotCard (知乎)
│   └── HotCard (百度)
└── Footer (数据来源声明 + 非商用说明)
```

### 组件层级

| 组件 | 职责 | 状态 |
|------|------|------|
| `App` | 页面容器，管理全局刷新 | `lastUpdate` |
| `PlatformGrid` | 响应式网格布局 | 无状态 |
| `HotCard` | 单平台卡片容器 | 无状态 |
| `HotItem` | 单条热搜行 | 无状态 (纯展示) |

## 6. 部署方案

```
后端 (Express) → Railway / Render (免费档)
前端 (Vite SPA) → Vercel (免费)
```

### 6.3 环境变量

```bash
# 后端
PORT=3001
CACHE_TTL=300               # 缓存时长（秒）
FETCH_INTERVAL=300           # 采集间隔（秒）
REQUEST_TIMEOUT=10000        # 请求超时（毫秒）
ZHIHU_COOKIE=                # 知乎 Cookie（可选，提高稳定性）

# 前端
VITE_API_URL=http://localhost:3001/api
VITE_REFRESH_INTERVAL=300000   # 毫秒
```
