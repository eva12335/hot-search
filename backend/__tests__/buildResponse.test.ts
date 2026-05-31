import { describe, it, expect } from "vitest";
import { buildResponse } from "../src/routes/hot.js";
import type { PlatformAdapter } from "../src/adapters/weibo.js";

const mockAdapter: PlatformAdapter = {
  meta: {
    platformName: "test",
    displayName: "Test",
    typeLabel: "t",
    sourceUrl: "https://test.com",
  },
  fetch: async () => [],
  fallbackFetch: async () => [],
};

const sampleData = [
  { rank: 1, title: "test item", hot: 100, url: "https://example.com" },
];

describe("buildResponse", () => {
  it("成功，新鲜，有数据，无错误", () => {
    const r = buildResponse(mockAdapter, sampleData, true, false, "2024-01-01T00:00:00.000Z");
    expect(r.success).toBe(true);
    expect(r.stale).toBe(false);
    expect(r.data).toHaveLength(1);
    expect(r.lastSuccessAt).toBe("2024-01-01T00:00:00.000Z");
    expect(r).not.toHaveProperty("error");
  });

  it("成功，过期，有数据", () => {
    const r = buildResponse(mockAdapter, sampleData, true, true, "2024-01-01T00:00:00.000Z");
    expect(r.success).toBe(true);
    expect(r.stale).toBe(true);
  });

  it("失败，带错误信息", () => {
    const r = buildResponse(mockAdapter, [], false, false, null, "暂无数据");
    expect(r.success).toBe(false);
    expect(r.error).toBe("暂无数据");
  });

  it("undefined 错误 → 无 error 字段", () => {
    const r = buildResponse(mockAdapter, [], false, false, null, undefined);
    expect(r).not.toHaveProperty("error");
  });

  it("null lastSuccessAt", () => {
    const r = buildResponse(mockAdapter, [], false, false, null, "err");
    expect(r.lastSuccessAt).toBeNull();
  });
});
