import { describe, it, expect } from "vitest";
import { computeDelta } from "../src/routes/hot.js";
import type { HotItem } from "../src/adapters/weibo.js";

interface HotItemWithDelta extends HotItem {
  delta: "up" | "down" | "same" | "new";
}

function item(rank: number, title: string, hot = 0): HotItem {
  return { rank, title, hot, url: `https://example.com/${title}` };
}

function items(arr: [number, string][]): HotItem[] {
  return arr.map(([r, t]) => item(r, t));
}

describe("computeDelta", () => {
  it("undefined prevData → 全部标记为 new", () => {
    const current = items([[1, "a"], [2, "b"]]);
    const result = computeDelta(undefined, current) as HotItemWithDelta[];
    expect(result.map((r) => r.delta)).toEqual(["new", "new"]);
  });

  it("空数组 prevData → 全部标记为 new", () => {
    const current = items([[1, "x"]]);
    const result = computeDelta([], current) as HotItemWithDelta[];
    expect(result[0].delta).toBe("new");
  });

  it("全无重叠 → 全部 new", () => {
    const prev = items([[1, "old"]]);
    const current = items([[1, "a"], [2, "b"]]);
    const result = computeDelta(prev, current) as HotItemWithDelta[];
    expect(result.map((r) => r.delta)).toEqual(["new", "new"]);
  });

  it("混合变化：same / new / down", () => {
    const prev = items([[1, "a"], [2, "b"], [3, "c"]]);
    const current = items([[1, "a"], [2, "d"], [3, "c"], [4, "b"]]);
    const result = computeDelta(prev, current) as HotItemWithDelta[];
    // a: rank 1→1 same, d: 新出现 new, c: rank 3→3 same, b: rank 2→4 down
    expect(result[0].delta).toBe("same");  // a
    expect(result[1].delta).toBe("new");   // d
    expect(result[2].delta).toBe("same");  // c
    expect(result[3].delta).toBe("down");  // b
  });

  it("全部上升", () => {
    const prev = items([[5, "a"], [6, "b"]]);
    const current = items([[1, "a"], [2, "b"]]);
    const result = computeDelta(prev, current) as HotItemWithDelta[];
    expect(result[0].delta).toBe("up"); // 5→1
    expect(result[1].delta).toBe("up"); // 6→2
  });

  it("全部下降", () => {
    const prev = items([[1, "a"], [2, "b"]]);
    const current = items([[5, "a"], [6, "b"]]);
    const result = computeDelta(prev, current) as HotItemWithDelta[];
    expect(result[0].delta).toBe("down"); // 1→5
    expect(result[1].delta).toBe("down"); // 2→6
  });

  it("全部不变", () => {
    const prev = items([[1, "a"], [2, "b"]]);
    const current = items([[1, "a"], [2, "b"]]);
    const result = computeDelta(prev, current) as HotItemWithDelta[];
    expect(result[0].delta).toBe("same");
    expect(result[1].delta).toBe("same");
  });
});
