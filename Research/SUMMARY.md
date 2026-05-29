# 热搜聚合看板 — 调研总结

> 2026-05-28 | 双 AI 平台交叉验证 | 接口实测通过

## 调研结论

**做这件事，最省力的路径是：DailyHotApi（数据层）+ 自建前端面板。**

## 推荐项目

| 优先级 | 项目 | 用途 | 亮点 |
|--------|------|------|------|
| 首选 | [DailyHotApi](https://github.com/imsyy/DailyHotApi) | 数据 API | 微博/知乎/百度等 30+ 平台已集成，Vercel 一键部署 |
| 参考 | [next-daily-hot](https://github.com/baiwumm/next-daily-hot) | 前端看板 | Next.js 现代化栈，17+ 平台覆盖，UI 漂亮 |

## 接口实测

三个核心数据源均已验证通过：

| 平台 | 采集方式 | 数据量 |
|------|----------|--------|
| 微博热搜 | `weibo.com/ajax/side/hotSearch` | 52 条 |
| 知乎热榜 | `api.zhihu.com/topstory/hot-lists/total` | 30 条 |
| 百度热搜 | `top.baidu.com/board?tab=realtime` | 51 条 |

## 推荐技术栈

| 层 | 选型 |
|----|------|
| 数据采集 | Python（requests + BeautifulSoup），每平台独立适配器，5-10 分钟轮询 |
| 缓存 | NodeCache / Redis（最新榜单缓存 5 分钟） |
| 存储 | PostgreSQL（当前态 + 历史快照双表） |
| 后端 | FastAPI 或直接用 DailyHotApi |
| 前端 | Next.js + Tailwind + ECharts（趋势图） |
| 部署 | Vercel（前端）+ 云主机（采集脚本） |

## 关键设计决策

- 每个平台保留 2 条数据线路（主 + 备），接口失效时自动切换
- 数据做快照化存储（不只存最新榜，保留历史才能做趋势分析）
- 采集频率 5-10 分钟，热榜变化不快，高频无意义且增加封禁风险
- 定位为个人/内部工具，仅展示标题、热度、链接，不缓存全文

## 两个方案

**方案 A（1-2 天上线）**：DailyHotApi + 简单 HTML 面板，零运维，适合验证想法

**方案 B（1-2 周，推荐）**：自建采集层 + FastAPI + PostgreSQL + Next.js，自主可控，支持历史趋势
