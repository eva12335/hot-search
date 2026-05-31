import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getMixinKey, encWbi } from "../src/adapters/bilibili.js";

describe("getMixinKey", () => {
  it("长度固定 32 位", () => {
    const input = "a".repeat(64);
    expect(getMixinKey(input)).toHaveLength(32);
  });

  it("确定性：相同输入 → 相同输出", () => {
    const input = "0123456789abcdef".repeat(4); // 64 chars
    expect(getMixinKey(input)).toBe(getMixinKey(input));
  });

  it("输出是原串中字符的混排", () => {
    const input = "0123456789abcdef".repeat(4);
    const result = getMixinKey(input);
    // 每个输出字符都应出现在原串中
    for (const ch of result) {
      expect(input).toContain(ch);
    }
  });
});

describe("encWbi", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("生成正确格式的签名查询串", () => {
    vi.setSystemTime(1700000000000); // wts = 1700000000
    const imgKey = "abcd1234abcd1234abcd1234abcd1234";
    const subKey = "efgh5678efgh5678efgh5678efgh5678";
    const params: Record<string, string | number> = { rid: 0, type: "all" };

    const result = encWbi(params, imgKey, subKey);

    expect(result).toContain("rid=0");
    expect(result).toContain("type=all");
    expect(result).toContain("wts=1700000000");
    expect(result).toMatch(/&w_rid=[a-f0-9]{32}$/);
  });

  it("参数按字母序排列", () => {
    vi.setSystemTime(1700000000000);
    const imgKey = "aaaa".repeat(16);
    const subKey = "bbbb".repeat(16);
    const params: Record<string, string | number> = { zebra: 1, apple: 2 };

    const result = encWbi(params, imgKey, subKey);
    const appleIdx = result.indexOf("apple");
    const zebraIdx = result.indexOf("zebra");
    expect(appleIdx).toBeLessThan(zebraIdx);
  });

  it("特殊字符被移除", () => {
    vi.setSystemTime(1700000000000);
    const imgKey = "aaaa".repeat(16);
    const subKey = "bbbb".repeat(16);
    const params: Record<string, string | number> = { key: "value!with'special*chars" };

    const result = encWbi(params, imgKey, subKey);
    // 值中的 !'()* 应被 strip
    expect(result).toContain(encodeURIComponent("valuewithspecialchars"));
    expect(result).not.toContain("!");
    expect(result).not.toContain("'");
    expect(result).not.toContain("*");
  });
});
