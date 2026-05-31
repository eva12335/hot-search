import { describe, it, expect } from "vitest";
import { formatHotScore, formatTime } from "../format";

// ===== formatHotScore =====
describe("formatHotScore", () => {
  it("0", () => {
    expect(formatHotScore(0)).toBe("0");
  });

  it("小于 1 万 → 千位分隔", () => {
    expect(formatHotScore(9999)).toBe("9,999");
  });

  it("很小数字", () => {
    expect(formatHotScore(1)).toBe("1");
  });

  it("恰好 1 万 → 1.0万", () => {
    expect(formatHotScore(10000)).toBe("1.0万");
  });

  it("1.2 万", () => {
    expect(formatHotScore(12345)).toBe("1.2万");
  });

  it("接近亿", () => {
    expect(formatHotScore(9999999)).toBe("1000.0万");
  });

  it("恰好 1 亿 → 1.0亿", () => {
    expect(formatHotScore(100_000_000)).toBe("1.0亿");
  });

  it("1.2 亿", () => {
    expect(formatHotScore(123_456_789)).toBe("1.2亿");
  });

  it("10 亿", () => {
    expect(formatHotScore(1_000_000_000)).toBe("10.0亿");
  });
});

// ===== formatTime =====
describe("formatTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const now = new Date("2026-06-15T12:00:00.000Z").getTime();

  it("小于 1 分钟 → 刚刚", () => {
    vi.setSystemTime(now);
    expect(formatTime("2026-06-15T11:59:30.000Z")).toBe("刚刚");
  });

  it("正好当前时间 → 刚刚", () => {
    vi.setSystemTime(now);
    expect(formatTime("2026-06-15T12:00:00.000Z")).toBe("刚刚");
  });

  it("5 分钟前", () => {
    vi.setSystemTime(now);
    expect(formatTime("2026-06-15T11:55:00.000Z")).toBe("5 分钟前");
  });

  it("59 分钟前", () => {
    vi.setSystemTime(now);
    expect(formatTime("2026-06-15T11:01:00.000Z")).toBe("59 分钟前");
  });

  it("1 小时前", () => {
    vi.setSystemTime(now);
    expect(formatTime("2026-06-15T11:00:00.000Z")).toBe("1 小时前");
  });

  it("23 小时前", () => {
    vi.setSystemTime(now);
    expect(formatTime("2026-06-14T13:00:00.000Z")).toBe("23 小时前");
  });

  it("超过 24 小时 → 绝对日期格式", () => {
    vi.setSystemTime(now);
    // 绝对日期使用本地时区，只验证格式
    const result = formatTime("2026-06-14T11:00:00.000Z");
    expect(result).toMatch(/^\d+月\d+日 \d{2}:\d{2}$/);
  });

  it("多天前 → 绝对日期格式", () => {
    vi.setSystemTime(now);
    const result = formatTime("2026-06-12T12:00:00.000Z");
    expect(result).toMatch(/^\d+月\d+日 \d{2}:\d{2}$/);
  });
});
