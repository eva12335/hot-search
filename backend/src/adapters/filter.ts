import type { HotItem } from "./weibo.js";

/** AI 关键词列表，社交平台三端共用 */
const AI_KEYWORDS = [
  // 核心 AI 概念
  "AI", "人工智能", "大模型", "GPT", "LLM", "ChatGPT", "AIGC", "AGI",
  "OpenAI", "DeepSeek", "Claude", "Gemini", "Llama", "Copilot",
  "智能体", "Agent", "多模态", "Transformer", "深度学习", "机器学习",
  "神经网络", "NLP", "CV", "扩散模型", "文生图", "视频生成",
  // 模型/产品
  "Grok", "Mistral", "Qwen", "通义千问", "文心一言", "讯飞星火", "豆包",
  "Midjourney", "DALL-E", "Stable Diffusion", "Sora", "Suno",
  "Anthropic", "Perplexity", "Cursor",
  // 技术关键词
  "微调", "fine-tune", "RAG", "Prompt", "Token", "推理", "对齐",
  "RLHF", "蒸馏", "量化", "开源模型", "预训练",
  // 应用领域
  "具身智能", "人形机器人", "自动驾驶", "无人驾驶", "脑机接口",
  "空间智能", "AI芯片", "GPU", "英伟达", "NVIDIA", "算力",
  // 泛科技（提高覆盖率）
  "芯片", "机器人", "算法", "模型", "编程", "代码", "开源",
  "量子计算", "数字人", "元宇宙", "生成式", "GenAI",
  "数据", "智能", "科技",
];

/**
 * 按 AI 关键词过滤热搜条目，并重新排名
 * 不区分大小写匹配
 */
export function filterAI(items: HotItem[]): HotItem[] {
  return items
    .filter((item) =>
      AI_KEYWORDS.some((kw) =>
        item.title.toLowerCase().includes(kw.toLowerCase())
      )
    )
    .map((item, i) => ({ ...item, rank: i + 1 }));
}
