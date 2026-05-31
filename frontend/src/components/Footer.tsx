export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--glass-border)", marginTop: "auto" }}>
      <div className="max-w-6xl mx-auto px-4 py-4 text-center text-xs space-y-1"
           style={{ color: "var(--text-muted)" }}>
        <p>数据来源于微博、知乎、B 站、HuggingFace、GitHub 等平台公开榜单</p>
        <p>AI 关键词过滤 · 仅供学习参考 · 非商业用途</p>
      </div>
    </footer>
  );
}
