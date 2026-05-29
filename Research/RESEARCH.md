# 热搜聚合看板 — 深度调研交叉比对报告

> 生成日期：2026-05-28
> 数据来源：ChatGPT Deep Research + Perplexity Pro 双平台交叉验证

---

## 一、两份报告的可信度评估

### 高度一致（两份报告都确认，可直接采信）

| 结论 | 可信度 |
|------|--------|
| **DailyHotApi** 是聚合 API 的首选项目 | ⭐⭐⭐ 两份报告均列为首要推荐 |
| **next-daily-hot** 是前端看板的最佳起点 | ⭐⭐⭐ 两份报告均提及 |
| 定时轮询（5-10分钟）是主流架构模式 | ⭐⭐⭐ 两份报告一致 |
| PostgreSQL + Redis 是推荐存储组合 | ⭐⭐⭐ 两份报告一致 |
| 微博用网页端 Ajax 接口、知乎抓 HTML、百度解析内嵌 JSON | ⭐⭐⭐ 采集方式一致 |
| 必须做"源适配层 + 多源 fallback"，避免单点依赖 | ⭐⭐⭐ 两份报告均强调 |
| 数据存储应做"当前态 + 历史快照"双层模型 | ⭐⭐⭐ 两份报告均提及 |

### 部分一致（一方详细、另一方未覆盖或简略，需手动验证）

| 结论 | 来源 | 需验证点 |
|------|------|----------|
| TrendRadar（58.4k stars）是最大的聚合项目 | 仅报告一 | 依赖 newsnow API，非独立采集 |
| MediaCrawler（50.2k stars）是通用爬虫框架 | 仅报告一 | 需浏览器驱动，资源消耗大 |
| RSSHub 可作热搜数据源的路由层 | 仅报告一 | 需确认微博/知乎/百度路由是否仍可用 |
| HotPush 支持企微/Telegram 推送通知 | 仅报告一 | Star 仅 77，社区较小 |
| HotList-Web 和 rebang 是较新的聚合项目 | 仅报告二 | 活跃度和稳定性需核验 |
| hot_searches_for_apps 覆盖 65 个平台 | 仅报告二 | 适合归档，不适合实时看板 |

### 存在差异（两份报告描述不同，需要重点关注）

| 差异点 | 报告一 | 报告二 | 判断 |
|--------|--------|--------|------|
| 微博接口路径 | `m.weibo.cn/api/container/getIndex` | `weibo.com/ajax/side/hotSearch` | 两条路径都可能有效，建议都测试 |
| 知乎采集方式 | 调 API `/api/v3/feed/topstory/hot-lists/total` | 抓 HTML 页面 `/hot` 解析 | 报告一的 API 路径更可靠，优先测试 |
| 数据库推荐 | 强调 ClickHouse/TimescaleDB | 强调 SQLite 起步 + PostgreSQL | 报告二更务实，先 SQLite 验证再迁移 |

---

## 二、项目推荐最终排名

综合两份报告的重合度、Star 数、活跃度和部署难度：

| 优先级 | 项目 | 定位 | 推荐理由 |
|--------|------|------|----------|
| **P0** | [DailyHotApi](https://github.com/imsyy/DailyHotApi) | 数据 API 中台 | 两份报告共同首推，多平台支持，Vercel 一键部署 |
| **P0** | [next-daily-hot](https://github.com/baiwumm/next-daily-hot) | 前端看板 | 17+ 平台覆盖，Next.js 现代化栈，UI 漂亮 |
| **P1** | [RSSHub](https://github.com/DIYgod/RSSHub) | 通用 RSS 数据源 | 44k stars，社区活跃，可作多源 fallback 层 |
| **P1** | [HotPush](https://github.com/JackyST0/hotpush) | 聚合 + 推送 | 完整前后端，支持企微/Telegram 通知 |
| **P2** | [TrendRadar](https://github.com/SANSAN0/TrendRadar) | 大型聚合平台 | Star 最高但依赖外部 API，部署复杂 |
| **P2** | [hot_searches_for_apps](https://github.com/WShuai123/hot_searches_for_apps) | 归档型采集 | 65 平台覆盖，适合做历史数据补充 |

---

## 三、推荐实施方案

### 方案 A：最快上线（1-2 天）

```
DailyHotApi (Vercel 部署) → 直接调用其 API → 简单 HTML 面板展示
```

- 优点：零运维，写完前端就能用
- 缺点：依赖上游 API 稳定性，无法自定义采集逻辑
- 适合：验证想法、个人使用、原型演示

### 方案 B：平衡方案（1-2 周，推荐）

```
采集层：Python 脚本（每平台独立适配器）
  ├─ 微博：weibo.com/ajax/side/hotSearch
  ├─ 知乎：/api/v3/feed/topstory/hot-lists/total
  └─ 百度：top.baidu.com/board 解析内嵌 JSON
       ↓
调度层：Cron / GitHub Actions（5-10 分钟间隔）
       ↓
API 层：FastAPI（提供统一 REST 接口）
       ↓
存储层：PostgreSQL（当前态 + 历史快照双表）+ Redis（缓存最新榜单，TTL 5分钟）
       ↓
前端层：Next.js + Tailwind + ECharts（趋势图）
```

- 优点：自主可控、可扩展、支持历史趋势分析
- 缺点：需要开发 + 服务器
- 适合：长期运营、需要历史数据、团队使用

### 方案 C：轻量自建（最小依赖）

```
采集：Python 脚本（requests + BeautifulSoup）
调度：GitHub Actions（免费，无需服务器）
存储：SQLite（单文件数据库）
前端：纯静态 HTML（参考三体系项目的单文件架构）
```

---

## 四、关键工程决策

### 4.1 采集策略

| 平台 | 主线路 | 备用线路 |
|------|--------|----------|
| 微博 | `weibo.com/ajax/side/hotSearch` | `m.weibo.cn/api/container/getIndex?containerid=102803` |
| 知乎 | `/api/v3/feed/topstory/hot-lists/total?limit=50` | 抓取 `/hot` 页面 HTML 解析 |
| 百度 | `top.baidu.com/board?tab=realtime` 解析 `<!--s-data:-->` | 第三方 API（如 aa1.cn） |

### 4.2 数据库表结构（最小可用）

```sql
-- 当前态表：存每个平台的最新 Top N
CREATE TABLE hot_current (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,    -- weibo / zhihu / baidu
    rank INT NOT NULL,
    title VARCHAR(500) NOT NULL,
    hot_score VARCHAR(50),
    url VARCHAR(500),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 历史快照表：每次抓取打一个时间戳
CREATE TABLE hot_snapshot (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,
    title VARCHAR(500) NOT NULL,
    rank INT NOT NULL,
    hot_score VARCHAR(50),
    url VARCHAR(500),
    captured_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_snapshot_platform_time ON hot_snapshot(platform, captured_at);
CREATE INDEX idx_snapshot_title ON hot_snapshot(title);
```

### 4.3 反爬与容错

- 请求间隔 ≥ 5 分钟，每个平台之间错开 1 分钟
- UA 伪装 + Referer 补齐
- 每个平台至少保留 2 条数据线路（主 + 备）
- 连续失败 3 次触发告警，自动切换备用线路
- 缓存最新结果，即使抓取失败也不影响前端展示

### 4.4 合规边界

- 定位为"个人/内部信息聚合工具"
- 仅展示标题、热度、链接、更新时间，不缓存全文内容
- 检查目标站 robots.txt，遵守抓取边界
- 控制频率，不给源站增加压力

---

## 五、验证结果（2026-05-28 已执行）

DailyHotApi 已在本机克隆并启动验证，三个核心接口全部通过：

| 接口 | 路径 | 状态 | 数据量 | 采集来源 |
|------|------|------|--------|----------|
| 微博热搜 | `GET /weibo` | ✅ 通过 | 52 条 | `weibo.com/ajax/side/hotSearch` |
| 知乎热榜 | `GET /zhihu` | ✅ 通过 | 30 条 | `api.zhihu.com/topstory/hot-lists/total?limit=50` |
| 百度热搜 | `GET /baidu` | ✅ 通过 | 51 条 | `top.baidu.com/board?tab=realtime` |

**返回格式**：
```json
{
  "code": 200,
  "name": "weibo",
  "title": "微博",
  "type": "热搜榜",
  "link": "https://s.weibo.com/top/summary/",
  "total": 52,
  "updateTime": "2026-05-27T17:12:05.657Z",
  "data": [
    { "id": "...", "title": "...", "desc": "...", "hot": 4390000, "url": "...", "mobileUrl": "..." }
  ]
}
```

**注意事项**：
- Redis 非必须，NodeCache 会自动降级兜底
- 端口默认 **6688**（非 3000）
- 启动需设置 `NODE_ENV=development`
- 接口自带 1 小时缓存（`CACHE_TTL: 3600`），不会频繁请求源站

**结论：数据源通路已确认，可以进入方案选型和开发阶段。**

## 六、下一步行动

1. ~~克隆 DailyHotApi，验证 API 可用性~~ ✅ 已完成
2. ~~测试三条线路的接口是否正常返回~~ ✅ 已完成
3. **待决定**：选择方案 A（直接用 DailyHotApi）还是方案 B（自建采集层），或先 A 后 B 渐进演化
4. **原型搭建**：基于 DailyHotApi 做一个最简前端看板（参考三体系项目的单文件架构）
5. **持续关注**：RSSHub 的微博/知乎路由变化，作为免费备用数据源
