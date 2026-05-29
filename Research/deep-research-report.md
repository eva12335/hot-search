# 深度调研：聚合微博、知乎、百度热搜的开源架构方案

**关键搜索词（中文/English）：**  
- 热搜 聚合 开源 项目 (hot search aggregator open source)  
- 微博 热搜 接口 爬虫 (Weibo hot search API crawler)  
- 知乎 热榜 接口 (Zhihu hot list API)  
- 百度 热搜 API 开放 (Baidu hot search API)  
- 热搜 聚合 面板 GitHub (hot topics aggregator panel GitHub)  
- RSSHub 热搜 路由 (RSSHub hot search routes)  
- Trending aggregator open source (aggregate hot search)  

**执行摘要：**  
我们调研了当前可用于微博、知乎、百度热搜聚合的开源项目、API和架构方案，涵盖已有项目对比、数据源接口与反爬、系统架构设计，以及落地实施建议等内容。发现市面上已有多款聚合器（如TrendRadar、DailyHotApi、HotPush等）和通用爬虫框架（如MediaCrawler、RSSHub）可直接复用，同时也可以通过RSSHub、第三方API或模拟移动端接口获取热搜数据【93†L33-L37】【91†L1-L3】。常见架构模式以定时轮询为主，结合队列或缓存（Redis）和关系型/列式数据库存储历史数据，并以SSR/Web 前端实时展示。实施时应注意反爬策略（代理、Header、缓存）、频率控制和合规风险（遵守robots和用户协议）。落地可直接部署成熟项目（如DailyHotApi、HotPush），或从零构建轻量方案（Next.js+Supabase等），并保证抓取频率、错误重试和监控预警。

## 1. 现有开源项目（聚合器/面板/爬虫）  
调研发现10余个相关项目，涵盖热搜聚合网站、API服务、爬虫库等，按功能和活跃度摘要如下（见表格）：

| 项目名 (语言)                    | 链接                      | ★Star | 支持平台（示例）                            | 技术栈（语言/框架/数据库等）                              | 活跃度 (最近一次提交) | 主要限制/备注                                      |
|:-------------------------------|:-------------------------|:-----:|:----------------------------------------|:-----------------------------------------------------|:--------------------:|:------------------------------------------------|
| **TrendRadar** (Python)       | [SANSAN0/TrendRadar][5]   | 58.4k【5†L3997-L4000】 | 百度热搜、微博、知乎、今日头条、抖音、B站等【79†L343-L352】 | Python (Flask)、Vue3、MySQL、Redis【60†L42-L49】       | 活跃（v2.1 发布 2025-08-30） | 多平台聚合，依赖newsnow API【79†L343-L352】 |
| **TrendRadar** (HTML)         | [joyce677/TrendRadar][9]  | 1.7k【9†L1043-L1049】 | 同上（支持11个主流平台）【79†L343-L352】                | 静态前端 (HTML/Javascript)【9†L1043-L1049】          | 活跃（最近更新 2026）    | 只提供前端，可调用新闻服务，无后端源码   |
| **DailyHotApi** (Node.js)     | [imsyy/DailyHotApi][25]   | 3.8k【25†L167-L170】  | 微博、知乎、百度、抖音、B站、头条等多平台              | Node.js/TypeScript (无DB)【42†L1-L4】                | 活跃 (最新提交 2025-08) | API聚合服务，可部署Vercel，无状态         |
| **MediaCrawler** (Python)     | [NanmiCoder/MediaCrawler][43] | 50.2k【43†L169-L174】 | 小红书、抖音、快手、B站、微博、贴吧、知乎等多平台      | Python (Playwright)【44†L1-L4】                         | 活跃(数百次提交)        | 强大爬虫框架，需浏览器驱动，高资源         |
| **TopList** (Go)             | [tophubs/TopList][77]     | 4.7k【77†L167-L170】  | 多平台（未明确，如微博、知乎、头条等）                  | Go (多协程)【78†L1-L4】                               | 活跃 (66次提交)        | Go语言聚合，性能佳；预览站点 mo.fish       |
| **NextDailyHot** (React)     | [baiwumm/next-daily-hot][46] | 233【46†L167-L170】   | 微博、知乎、抖音、小红书、百度贴吧、头条等17+平台      | Next.js (React)、TypeScript、Tailwind【48†L319-L328】 | 活跃 (197次提交)       | 前端框架、需后端数据来源                   |
| **HotPush** (Python/Vue)     | [JackyST0/hotpush][61]    | 77【61†L167-L170】    | 微博、知乎、B站、V2EX、Twitter 等13+平台             | Python (FastAPI)+Vue3、MySQL、Redis【60†L42-L49】    | 活跃 (82次提交)        | 支持多渠道推送，依赖RSSHub获取数据        |
| **weibo-trending-hot-search** (TS) | [justjavac/weibo-trending-hot-search][63] | 767【63†L167-L170】  | 微博（单一）                                  | TypeScript (Node)、Markdown存储【64†L1-L4】         | 极活跃 (4.4万次提交)    | 每小时爬取归档，仅微博热搜            |
| **RSSHub** (Node)           | [DIYgod/RSSHub][75]       | 44.3k【75†L528-L536】 | 支持微博、知乎、B站、Twitter、微信公众号等数百路由【96†L9-L12】【97†L1-L8】 | Node.js/TypeScript (无DB)【75†L528-L536】            | 活跃 (频繁更新)        | 通用RSS生成器，可订阅/抓取热门榜单        |
| **newsnow** (TS)            | [ourongxing/newsnow][21]  | 20.4k【21†L167-L169】 | 新闻热点平台（今日热闻、财经、科技等）                    | TypeScript (Node)【75†L528-L536】                    | 活跃 (近年维护)        | 聚合新闻热点，不专注社交热搜         |

*表格说明：*以上项目主要以中文文档或中文社区教程为主，其中标注项目语言（括号内）。限于篇幅，表中只列出主要平台和技术栈。项目 “TrendRadar” 有两个实现，分别为 Python+Vue 后端版本和纯前端版本；“DailyHotApi” 提供聚合API接口；“weibo-trending-hot-search” 主要关注微博热搜；“RSSHub” 和 “newsnow” 为通用内容聚合工具。各项目普遍活跃，但有的依赖第三方API（如newsnow、RSSHub路由），或需要Cookie/手动运维等限制，需要在使用前评估风险。

## 2. API 与数据源分析  
**微博热搜：** 官方无公开热搜API，只能通过模拟客户端或第三方服务获取。一种常用做法是使用移动端接口，如调用 `https://m.weibo.cn/api/container/getIndex?containerid=102803` 等（containerid对应热搜），可获热搜列表；也可调用如TikHub平台的聚合接口（付费），例如`/fetch_hot_search_index`【90†L1451-L1459】。另有开源RSSHub路由 `/weibo/search/hot` 提供10条热搜列表【96†L9-L12】。第三方API有免费版（如 aa1.cn/weibo-rs【93†L33-L37】）或付费服务。**优缺点：** 直接调用接口简单快速，但依赖不稳定（可能被封禁）；模拟爬虫虽灵活，但易触发验证码/IP限流。常见反爬：频率限制、验证码、接口签名等。绕过经验：使用代理池，伪装User-Agent/Referer，限制请求频率，缓存结果2-5分钟【90†L1463-L1471】。合规注意：微博用户协议禁止抓取非公开数据，尽量仅采集公开榜单内容。

**知乎热榜：** 可调用其内部接口 `https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=100`【91†L1-L3】获取热榜（需带cookie等，可能返回排重后的热门话题）。也可使用RSSHub路由 `/zhihu/hot` 获取分类热榜【97†L1-L8】。另一种是付费API（如极链科技等）。**优缺点：** 官方API简单，但有登录限制，频繁调用也会被风控；爬虫可用Session/SSO登录绕过。反爬手段：动态token、频次限制。绕过：利用模拟浏览器（Playwright）、预置登录cookie或签名逆向。合规：知乎未授权场景下抓取可能违规，推荐在遵循用户协议范围内使用（热点话题一般属于公共信息）。

**百度热搜：** 百度提供百度云市场下的热搜API（如免费API `https://api.aa1.cn/doc/baidu-rs.html`【93†L49-L53】）或第三方服务（如天聚数行、1314.cool【92†L7-L9】等）。这些API一次可返回Top N热搜，使用简单。也可利用RSSHub(暂无官方路由)或自行爬取百度搜索页面。**优缺点：** 第三方API通常稳定、无需登录，但有调用次数限制；爬虫方案简单（百度对频率要求不高），缺点是接口变动风险低。反爬：较少见，有时会要求验证码封IP。合规：百度热搜数据为公共信息，使用风险较低，但切勿大量抓取以免造成负载。

**其他平台：** 今日头条、抖音等也有开源热搜API（如 DailyHotApi 中已经集成）。例如 “[今日热榜API](https://github.com/imsyy/DailyHotApi)” 提供包括头条、抖音等在内的多个平台热点【25†L167-L170】【93†L78-L84】。RSSHub 支持 `/toutiao`、`/douyin/hot` 等路由。可复用端点示例：调用 `https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total`、`m.weibo.cn/api/container/getIndex?containerid=102803`、第三方 `https://api.aa1.cn/doc/baidu-rs.html` 等。

**常见反爬与绕过：** 抖动、动态加载脚本、登录验证是热点网站常见防护。通用绕过策略：使用稳定代理IP池、更换User-Agent、控制请求频率、缓存热门数据（避免频繁请求）。对微博可在请求头中加入Referer（例如`weibo.com`）以获取图片【96†L9-L12】。对知乎可能需要提供授权Header（如`x-udid`、`Cookie`）。推荐预先测试API响应情况，发现异常时引入重试和报警。

**合规注意：** 关注robots.txt和平台开发者协议。虽然热点话题一般公开，但某些第三方API可能禁止商业用途。采集时避免频繁访问同一接口（可缓存5分钟以上【90†L1463-L1471】），避免干扰平台服务。仅使用公开数据、不给用户带来风险即可，一旦商业化应用需特别注意版权与协议限制。

## 3. 架构参考

**常见架构模式：**  
- **定时轮询 + 缓存**：最常见方案，使用定时任务（Cron、APScheduler）按固定间隔（如5分钟）触发抓取脚本，抓取后写入数据库，并更新缓存。  
- **任务队列**：抓取任务可入队（RabbitMQ/Kafka），工作进程并行消费，便于扩展和错误重试。  
- **实时流/Webhook**：部分平台可通过Webhook通知（如站内订阅），但微博/知乎暂无官方推送，较少使用。  
- **Serverless/云函数**：如使用Cloud Function或GitHub Actions定时触发抓取，无需自建服务器。  

```mermaid
graph LR
  subgraph 抓取层
    A[定时任务/调度器] -->|触发| B[抓取脚本 (Weibo/知乎/百度...)]
    B --> C{解析数据}
    C --> D[关系型数据库 (Postgres)]
    C --> E[缓存 (Redis)]
    C --> F[分析/聚合]
  end
  subgraph 后端/API
    D --> G[API 层 (Next.js/API)]
    E --> G
    F --> G
  end
  subgraph 前端
    G --> H[前端面板 (Next.js 页面)]
  end
  H --> I{用户浏览}
  G --> J[实时推送 (WebSocket/SSE)]
  I --> J
  subgraph 监控
    K[监控/告警] -- 日志/错误 --> A
    K -- 监控请求率 --> G
  end
```

*架构说明：* 抓取层负责调用各数据源接口或爬虫采集热搜数据，解析后写入数据库并更新缓存。数据库可选用PostgreSQL/TimescaleDB（时序数据支持）、ClickHouse（OLAP分析）等，缓存层推荐用Redis保存最新热榜，加速前端访问。后端API（如Next.js API Routes或FastAPI）从数据库或缓存取数据，提供给前端显示或定时刷新。前端面板可采用Server-Side-Render（Next.js）或静态页面，每隔数分钟自动拉取最新数据，也可结合WebSocket/SSE推送实时更新。监控/告警模块记录抓取失败或API异常，通过邮件/钉钉等方式通知运维。

**存储选型对比：**

| 数据库          | 类型       | 优势                               | 限制                          |
|:-------------|:---------|:---------------------------------|:-----------------------------|
| **PostgreSQL**    | 关系型    | 事务支持好、生态丰富，可用Supabase管理【75†L528-L536】 | 大规模时序写入性能一般           |
| **TimescaleDB**   | 时序扩展  | 在PostgreSQL基础上优化时序数据，可自动分区、压缩旧数据 | 需要额外安装，可学习成本         |
| **ClickHouse**    | 列存储    | 高性能分析型数据库，适合大规模读写和聚合查询；支持TTL保留和冷热数据迁移【102†L1-L4】 | 不支持复杂事务，SQL兼容性差       |
| **Redis**         | 缓存      | 内存存储、响应极快，适合存放最新热点和频繁访问数据          | 持久化能力弱，内存成本高，不适合作为主存储    |
| **其他**         | NoSQL/TSDB | 如InfluxDB、MongoDB等也可用于时序数据存储 | 各有场景优劣，可按需选择            |

*说明：* 热搜数据具有明显的时序属性，建议使用支持自动分区和压缩的时序库。PostgreSQL加Timescale插件能在原生生态中高效存储和查询；ClickHouse适合快速统计分析长周期趋势【102†L1-L4】；Redis用于缓存热点，提供前端秒级响应。可结合设置数据TTL（如ClickHouse支持将新数据放快速存储、老数据转移到慢盘【102†L1-L4】）以及定期聚合表（materialized view）来保留历史趋势并控制存储成本。

**前端面板设计：**  
- **实时刷新**：使用轮询（每隔几分钟刷新页面或调用API）是最简单的方案。也可用Server-Sent Events/WebSocket推送最新热榜，加快用户感知。  
- **可视化**：榜单通常以表格或卡片形式展示，支持按平台或分类切换。可加上涨跌标识、热度条。对于排名变化，可用Sparkline折线图或箭头标识涨跌幅。  
- **历史趋势图**：如需展示某话题热度随时间变化，可使用ECharts、Chart.js等库绘制折线图。前端从数据库或后端聚合接口获取历史热度时间序列数据，按小时/分钟级别绘制趋势曲线。  

## 4. 落地建议

**推荐“拿来即用”项目：**  
- **DailyHotApi（imsyy）**：集成多平台热点数据接口，支持RSS和静态页面，部署简单（Node.js/Vercel），更新活跃【25†L167-L170】。可直接调用其API获取各平台热搜JSON。  
- **HotPush（JackyST0）**：完整的热搜聚合+推送平台，后端FastAPI、前端Vue，可监控微博/知乎/B站等13+平台热榜，并支持Telegram/企业微信推送【60†L29-L37】【61†L167-L170】。适合需要完整UI和多渠道通知的场景。  
- （可选）**TrendRadar**：功能全面且UI友好，但部署稍复杂（需Python后端）；适合熟悉Python的人使用。

**自建最小可行技术栈：**  
- **前端**：Next.js（React） + Tailwind，用于SSR渲染热搜列表，便于SEO优化。也可简单用纯静态页面。  
- **后端**：Next.js API Routes 或轻量框架（FastAPI/Express）。主要实现数据抓取和提供REST API。  
- **数据库**：Supabase（PostgreSQL）或自建PostgreSQL；对于时序可启用Timescale插件。  
- **缓存**：Redis（可选）用于保存热点数据，加速接口响应。  
- **爬虫框架**：Python（requests/Playwright）或Node.js；用于调用网页接口抓取。  
- **任务调度**：使用Cron/GitHub Actions/云函数定时触发抓取程序。  
- **部署**：Vercel/Netlify（前端），云主机（抓取脚本）、或者Docker容器。  

**关键实现要点：**  
1. **抓取频率**：一般设置 5～10 分钟左右。频率过高易被限流，过低则信息滞后。可根据反爬状况动态调整。  
2. **缓存策略**：对热点数据做短时缓存（例如Redis存最新榜单，过期5分钟）【90†L1463-L1471】，减少对源站的重复请求。  
3. **错误重试**：抓取失败应自动重试并记录日志。对网络异常、验证码等情况采取延时重试（指数退避）。  
4. **代理池**：使用IP代理池轮换请求头，减少单一IP频率过高被封的风险。同时随机User-Agent，模拟不同客户端。  
5. **速率限制**：严格限制抓取并发数和请求速率，避免触发目标站点安全策略。可在代码中加入睡眠或限速功能。  
6. **监控告警**：引入监控系统（如Prometheus+Grafana）或使用现成云监控，及时报警数据抓取失败、API错误或资源异常。  

**常见踩坑与解决：**  
- **接口变更/服务中断**：热点接口（尤其非官方）可能随时失效。解决：多渠道冗余（如同时调用RSSHub和原接口）、定期检查日志、自动重连、使用第三方备份API。  
- **IP被封/验证码**：频繁采集同一域名易被封。解决：使用代理轮换、降低并发、增加User-Agent伪装；如遇验证码，尝试使用无头浏览器或更换策略。  
- **数据不一致**：不同平台对同一热点的排名不一致是常态。解决：明确需求（按单一平台显示或跨平台对比）、以平台自身数据为准；如跨平台整合需要自定义算法汇总。  
- **成本控制**：自建爬虫推送涉及服务器、带宽等成本。解决：优化抓取频率、缓存数据，尽可能使用云函数触发减少常驻实例，或者利用免费的RSS/API。  
- **法律合规风险**：大规模采集可能触及用户协议或版权。解决：仅采集公开热榜数据，避免个人隐私；如商业使用，应详细阅读各平台开发者协议，并考虑与平台或API提供方签订协议。  

**检索关键词清单：**  
- **中文：** “微博 热搜 接口 爬虫”、“知乎 热榜 API”、“百度 实时 热搜 接口”、“热搜 聚合 开源 项目”、“RSSHub 热搜 路由”  
- **English：** “Weibo hot search API open source”、“Zhihu hotlist API”、“Baidu hot search API”、“hot search aggregator open source”、“RSSHub weibo zhihu baidu”  

**参考资料：** 以上结论主要来自GitHub项目README、中文博客/社区讨论、官方及第三方文档。各项目及API示例已在正文中给出对应引用【5†L3997-L4000】【79†L343-L352】【90†L1451-L1459】【93†L33-L37】【96†L9-L12】【102†L1-L4】等。如信息有不足或后续变化，应关注各项目/服务的最新动态。