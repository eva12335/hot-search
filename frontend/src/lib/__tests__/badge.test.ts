import { describe, it, expect } from "vitest";
import { rankBadgeClass } from "../badge";

describe("rankBadgeClass", () => {
  it("第 1 名 → top1", () => {
    expect(rankBadgeClass(1)).toBe("top1");
  });

  it("第 2 名 → top2", () => {
    expect(rankBadgeClass(2)).toBe("top2");
  });

  it("第 3 名 → top3", () => {
    expect(rankBadgeClass(3)).toBe("top3");
  });

  it("第 4 名 → 空字符串", () => {
    expect(rankBadgeClass(4)).toBe("");
  });

  it("rank = 0 → 空", () => {
    expect(rankBadgeClass(0)).toBe("");
  });

  it("大排名 → 空", () => {
    expect(rankBadgeClass(100)).toBe("");
  });
});
