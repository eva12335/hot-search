export function rankBadgeClass(rank: number): string {
  if (rank === 1) return "top1";
  if (rank === 2) return "top2";
  if (rank === 3) return "top3";
  return "";
}
