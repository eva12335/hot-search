import { describe, it, expect } from "vitest";
import { toItem } from "../src/adapters/youtube.js";

describe("youtube toItem", () => {
  const video = {
    title: "Test Video",
    videoId: "dQw4w9WgXcQ",
    author: "TestChannel",
    viewCount: 1_234_567,
    lengthSeconds: 300,
  };

  it("完整字段映射", () => {
    const result = toItem(video, 0);
    expect(result.rank).toBe(1);
    expect(result.title).toBe("Test Video");
    expect(result.hot).toBe(1_234_567);
    expect(result.url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result.desc).toBe("TestChannel · 123.5万 次观看");
  });

  it("亿级播放量格式化", () => {
    const result = toItem({ ...video, viewCount: 150_000_000 }, 0);
    expect(result.desc).toContain("1.5亿");
  });

  it("万以下播放量直接显示", () => {
    const result = toItem({ ...video, viewCount: 5000 }, 0);
    expect(result.desc).toContain("5000 次观看");
  });

  it("非零索引", () => {
    const result = toItem(video, 4);
    expect(result.rank).toBe(5);
  });
});
