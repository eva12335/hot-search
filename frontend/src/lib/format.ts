/**
 * 将 ISO 时间字符串转为相对中文时间描述
 * 如 "5 分钟前"、"1 小时前"、或精确时间
 */
export function formatTime(isoString: string): string {
  const now = Date.now();
  const diff = now - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const date = new Date(isoString);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * 格式化热度数值为中文习惯表示
 * >= 10000 → "12.3万"，否则直接显示
 */
export function formatHotScore(score: number): string {
  if (score >= 100000000) return `${(score / 100000000).toFixed(1)}亿`;
  if (score >= 10000) return `${(score / 10000).toFixed(1)}万`;
  return score.toLocaleString();
}
