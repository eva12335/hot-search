# AI 热搜 (AI HotSearch)

AI 垂直领域多平台热搜聚合。从社交平台（微博/知乎/B 站）按 AI 关键词过滤 + AI 原生平台（HuggingFace/GitHub Trending/YouTube）采集热门内容，以卡片网格展示。

> V2.0（2026-05-31）：从全品类聚合转型为 AI 垂直热搜。V1.0 归档见 [README-v1.md](README-v1.md)。

## 功能

- **AI 垂直聚焦**：社交平台 AI 关键词过滤 + AI 原生数据源，≥ 80% 内容相关性
- **6 平台聚合**：微博、知乎、B 站（过滤） + HuggingFace、GitHub Trending、YouTube（原生）
- **排名变化**：每轮对比上一轮快照，↑↓→● 实时可见
- **历史趋势**：点击任一话题，弹出 24 小时热度曲线（Canvas 2D 绘制）
- **响应式布局**：桌面 3 列 / 平板 2 列 / 手机 1 列
- **3D 玻璃拟态**：深空蓝 + 香槟金暗色主题，CSS 3D 鼠标视差

## 技术栈

| 层 | 选型 | 说明 |
|------|------|------|
| 前端 | React 19 + TypeScript + Vite 8 + Tailwind v4 | SPA + 响应式 + Canvas 2D |
| 后端 | Express (Node.js) + TypeScript | RESTful API |
| 缓存 | NodeCache（单条+时间戳）| 10min fresh / 20min stale |
| 存储 | SQLite (better-sqlite3，WAL 模式) | 历史快照，7 天自动清理 |
| 部署 | Vercel (前端) + Render (后端) | HTTPS 公网访问 |

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
curl http://localhost:3001/api/hot/all
curl http://localhost:3001/api/hot/weibo
curl http://localhost:3001/api/hot/huggingface
curl http://localhost:3001/api/health
```

## 文档索引

| 文档 | 内容 |
|------|------|
| [PRD-v2.md](PRD-v2.md) | 产品需求：AI 垂直定位，6 平台，视觉设计规范 |
| [TECH_DESIGN-v2.md](TECH_DESIGN-v2.md) | 技术设计：架构、适配器、降级链、API JSON 示例 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 3 张 Mermaid 架构图（系统/数据流/部署） |
| [AGENTS.md](AGENTS.md) | AI 协作指南：编码约定、测试要求、数据源矩阵 |
| [v2-showcase.html](v2-showcase.html) | 视觉样板间（设计基线） |

## 许可证

学习项目，非商业用途。数据来源于各平台公开热搜榜单。
