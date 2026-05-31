import type { PlatformResponse } from "./types";

export type CardState = "loading" | "error" | "empty" | "success" | "stale";

export function cardState(
  resp: PlatformResponse | undefined,
  isLoading: boolean
): CardState {
  if (isLoading && !resp) return "loading";
  if (!resp) return "loading";
  if (!resp.success && !resp.data?.length) return "error";
  if (resp.success && resp.stale) return "stale";
  if (resp.success && resp.data?.length > 0) return "success";
  if (!resp.success) return "error";
  return "empty";
}
