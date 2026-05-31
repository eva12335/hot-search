import { describe, it, expect } from "vitest";
import { filterAI } from "../src/adapters/filter.js";
import type { HotItem } from "../src/adapters/weibo.js";

function item(rank: number, title: string): HotItem {
  return { rank, title, hot: rank * 100, url: `https://example.com/${title}` };
}

describe("filterAI", () => {
  it("空输入 → 空输出", () => {
    expect(filterAI([])).toEqual([]);
  });

  it("无关键词匹配 → 空输出", () => {
    expect(filterAI([item(1, "今天天气真好")])).toEqual([]);
  });

  it("英文关键词大小写不敏感匹配", () => {
    const result = filterAI([item(1, "deepseek发布新模型")]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("deepseek发布新模型");
  });

  it("中文关键词匹配", () => {
    const result = filterAI([item(1, "人工智能新突破")]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("人工智能新突破");
  });

  it("多匹配 + 重排编号", () => {
    const result = filterAI([
      item(3, "nothing here"),
      item(7, "GPT-5来了"),
      item(9, "大模型进展"),
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].rank).toBe(1);
    expect(result[0].title).toBe("GPT-5来了");
    expect(result[1].rank).toBe(2);
    expect(result[1].title).toBe("大模型进展");
  });

  it("子串匹配（关键词在标题中间）", () => {
    const result = filterAI([item(1, "最新ChatGPT Plus更新发布")]);
    expect(result).toHaveLength(1);
  });

  it("重排从 1 开始连续递增", () => {
    const result = filterAI([
      item(5, "GPT-5来了"),
      item(10, "OpenAI又搞事情"),
      item(15, "大模型"),
    ]);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.rank)).toEqual([1, 2, 3]);
  });
});
