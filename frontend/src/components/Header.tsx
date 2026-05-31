interface HeaderProps {
  lastUpdateTime: string | null;
}

export default function Header({ lastUpdateTime }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-brand">
        <div className="header-logo">🔥</div>
        <div className="header-title">
          <h1 className="header-title-gradient" style={{ margin: 0 }}>AI 热搜</h1>
          <p>微博 · 知乎 · B 站 · HuggingFace · GitHub</p>
        </div>
      </div>

      <div className="header-live">
        <span className="live-dot" />
        {lastUpdateTime && (
          <time style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
            {new Date(lastUpdateTime).toLocaleTimeString("zh-CN")}
          </time>
        )}
      </div>
    </header>
  );
}
