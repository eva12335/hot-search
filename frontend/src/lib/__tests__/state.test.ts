import { describe, it, expect } from "vitest";
import { cardState } from "../state";
import type { PlatformResponse } from "../types";

function resp(overrides: Partial<PlatformResponse>): PlatformResponse {
  return {
    success: true,
    stale: false,
    platform: "test",
    title: "Test",
    type: "t",
    lastSuccessAt: null,
    data: [],
    ...overrides,
  };
}

describe("cardState", () => {
  it("初始加载：无数据 + 加载中 → loading", () => {
    expect(cardState(undefined, true)).toBe("loading");
  });

  it("无数据 + 非加载中 → loading", () => {
    expect(cardState(undefined, false)).toBe("loading");
  });

  it("失败 + 无数据 → error", () => {
    expect(cardState(resp({ success: false, data: [] }), false)).toBe("error");
  });

  it("成功但过期 → stale", () => {
    expect(cardState(resp({ success: true, stale: true, data: [{ rank: 1, title: "a", hot: 100, url: "" }] }), false)).toBe("stale");
  });

  it("成功 + 新数据 → success", () => {
    expect(cardState(resp({ success: true, stale: false, data: [{ rank: 1, title: "a", hot: 100, url: "" }] }), false)).toBe("success");
  });

  it("成功但无数据项 → empty", () => {
    expect(cardState(resp({ success: true, data: [] }), false)).toBe("empty");
  });

  it("失败通用情况 → error", () => {
    expect(cardState(resp({ success: false, data: [] }), false)).toBe("error");
  });

  it("SWR revalidate：加载中 + 有旧数据 → stale", () => {
    const oldData = resp({ success: true, stale: true, data: [{ rank: 1, title: "a", hot: 100, url: "" }] });
    expect(cardState(oldData, true)).toBe("stale");
  });
});
