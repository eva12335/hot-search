import { describe, it, expect } from "vitest";
import { toItem } from "../src/adapters/huggingface.js";

function trendingItem(overrides: Record<string, any> = {}) {
  const defaults: Record<string, any> = {
    id: "org/model",
    downloads: 5_000_000,
    likes: 100,
    pipeline_tag: "text-generation",
    repoType: "model",
    author: "org",
  };
  // 允许显式传 undefined 覆盖默认值
  const merged = { ...defaults };
  for (const key of Object.keys(overrides)) {
    merged[key] = overrides[key];
  }
  const { repoType, id, downloads, likes, pipeline_tag, author } = merged;
  return {
    repoData: { id, downloads, likes, pipeline_tag, repoType, author },
    repoType,
  };
}

describe("toItem", () => {
  it("完整字段映射 (model)", () => {
    const result = toItem(trendingItem(), 0);
    expect(result.rank).toBe(1);
    expect(result.title).toBe("org/model");
    expect(result.hot).toBe(100);
    expect(result.url).toBe("https://huggingface.co/org/model");
    expect(result.desc).toBe("text-generation · 5000.0K downloads");
  });

  it("dataset 类型 → 显示数据集标签", () => {
    const result = toItem(
      trendingItem({ repoType: "dataset", pipeline_tag: undefined }), 0
    );
    expect(result.desc).toBe("数据集 · 5000.0K downloads");
  });

  it("space 类型 → 显示 Space 标签", () => {
    const result = toItem(
      trendingItem({ repoType: "space", pipeline_tag: undefined }), 0
    );
    expect(result.desc).toBe("Space · 5000.0K downloads");
  });

  it("缺 likes → hot = 10", () => {
    const result = toItem(trendingItem({ likes: undefined }), 0);
    expect(result.hot).toBe(10);
  });

  it("缺 id → 用 model-N 兜底", () => {
    const result = toItem(trendingItem({ id: undefined }), 4);
    expect(result.title).toBe("model-5");
    expect(result.rank).toBe(5);
  });

  it("非零索引", () => {
    const result = toItem(trendingItem(), 9);
    expect(result.rank).toBe(10);
  });
});
