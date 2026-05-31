import type { HotItem } from "./weibo.js";

/** AI 关键词列表，社交平台三端共用 */
const AI_KEYWORDS = [
  "AI",
  "大模型",
  "GPT",
  "LLM",
  "人工智能",
  "深度学习",
  "机器学习",
  "ChatGPT",
  "AIGC",
  "OpenAI",
  "Transformer",
  "Claude",
  "DeepSeek",
  "智能体",
  "Agent",
  "多模态",
  "文生图",
  "视频生成",
  "具身智能",
  "推理",
  "对齐",
  "扩散模型",
  "神经网络",
  "NLP",
  "CV",
  "自动驾驶",
  "人形机器人",
  "Copilot",
  "Gemini",
  "Llama",
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
