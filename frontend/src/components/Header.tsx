interface HeaderProps {
  lastUpdateTime: string | null;
}

export default function Header({ lastUpdateTime }: HeaderProps) {
  return (
    <header className="relative" style={{ borderBottom: "1px solid var(--glass-border)" }}>
      <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
               style={{
                 background: "linear-gradient(135deg, rgba(201,169,110,0.3), rgba(201,169,110,0.1))",
                 boxShadow: "0 0 20px rgba(201,169,110,0.2)"
               }}>
            🔥
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight"
                style={{ fontFamily: "Georgia, 'Noto Serif SC', serif", color: "var(--gold)" }}>
              AI 热搜
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
              微博 · 知乎 · B 站 · HuggingFace · GitHub
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdateTime && (
            <div className="flex items-center gap-3 rounded-full px-4 py-2"
                 style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                      style={{ background: "var(--gold)" }} />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5"
                      style={{ background: "var(--gold-bright)" }} />
              </span>
              <span className="text-sm" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                {new Date(lastUpdateTime).toLocaleTimeString("zh-CN")}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
