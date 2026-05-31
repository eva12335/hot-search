import { describe, it, expect } from "vitest";
import { toItem } from "../src/adapters/huggingface.js";

describe("toItem", () => {
  it("完整字段映射", () => {
    const result = toItem(
      { id: "org/model", downloads: 5_000_000, pipeline_tag: "text-gen", description: "A great model" },
      0
    );
    expect(result.rank).toBe(1);
    expect(result.title).toBe("org/model");
    expect(result.hot).toBe(5_000_000);
    expect(result.url).toBe("https://huggingface.co/org/model");
    expect(result.desc).toBe("text-gen · 5.0M downloads");
  });

  it("缺 downloads → hot = 0", () => {
    const result = toItem({ id: "x/y", pipeline_tag: "text-gen" }, 0);
    expect(result.hot).toBe(0);
  });

  it("缺 id → 用 model-N 兜底", () => {
    const result = toItem({ downloads: 100 }, 4);
    expect(result.title).toBe("model-5");
    expect(result.rank).toBe(5);
  });

  it("无 pipeline_tag，有 description → 截取前 80 字符", () => {
    const longDesc = "A".repeat(100);
    const result = toItem({ id: "x/y", downloads: 100, description: longDesc }, 0);
    expect(result.desc).toBe(longDesc.slice(0, 80));
  });

  it("无 pipeline_tag，description 为空 → 空 desc", () => {
    const result = toItem({ id: "x/y", downloads: 100, description: "" }, 0);
    expect(result.desc).toBe("");
  });

  it("downloads = 0（falsy 但保留）", () => {
    const result = toItem({ id: "x/y", downloads: 0, pipeline_tag: "text-gen" }, 0);
    expect(result.hot).toBe(0);
  });

  it("非零索引", () => {
    const result = toItem({ id: "x" }, 9);
    expect(result.rank).toBe(10);
  });
});
