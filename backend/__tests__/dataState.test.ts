import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { CacheEntry } from "../src/cache.js";
// dataState reads CACHE_TTL env var at module load time
// default is 600 (10 min), so fresh→stale at +10min, stale→invalid at +20min

let dataState: (entry: CacheEntry) => "fresh" | "stale" | "invalid";

describe("dataState", () => {
  beforeAll(async () => {
    // Set CACHE_TTL before importing so the module uses our value
    process.env.CACHE_TTL = "600";
    const mod = await import("../src/cache.js");
    dataState = mod.dataState;
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const fetchedAt = 1700000000000;
  const expiresAt = fetchedAt + 600_000; // +10 min

  it("fresh：过期前（<10 分钟）", () => {
    vi.setSystemTime(fetchedAt + 100_000); // 100s after fetch
    expect(dataState({ data: [], fetchedAt, expiresAt })).toBe("fresh");
  });

  it("stale：过期后，失效前（10-20 分钟）", () => {
    vi.setSystemTime(fetchedAt + 700_000); // 700s after fetch, 100s past expiry
    expect(dataState({ data: [], fetchedAt, expiresAt })).toBe("stale");
  });

  it("invalid：超过 20 分钟", () => {
    vi.setSystemTime(fetchedAt + 1_300_000); // 1300s after fetch
    expect(dataState({ data: [], fetchedAt, expiresAt })).toBe("invalid");
  });

  it("边界：恰好等于 expiresAt → stale", () => {
    vi.setSystemTime(expiresAt);
    expect(dataState({ data: [], fetchedAt, expiresAt })).toBe("stale");
  });

  it("边界：恰好等于 fetchedAt + 2*TTL → invalid", () => {
    const invalidBoundary = fetchedAt + 600_000 * 2;
    vi.setSystemTime(invalidBoundary);
    expect(dataState({ data: [], fetchedAt, expiresAt })).toBe("invalid");
  });
});
