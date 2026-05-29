interface HeaderProps {
  lastUpdateTime: string | null;
}

export default function Header({ lastUpdateTime }: HeaderProps) {
  return (
    <header className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 animate-gradient-shift">
      {/* 背景装饰光斑 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 left-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 right-1/4 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Logo 图标 */}
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 via-red-500 to-pink-500
                            flex items-center justify-center text-2xl shadow-[0_0_24px_rgba(251,146,60,0.4)]">
              🔥
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400
                            shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-champion-pulse" />
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              今日热搜
            </h1>
            <p className="text-sm text-indigo-200/80 font-medium">
              微博 · 知乎 · 百度 — 实时聚合
            </p>
          </div>
        </div>

        {lastUpdateTime && (
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-full px-4 py-2 border border-white/10">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-sm text-white/80 font-medium">
              {new Date(lastUpdateTime).toLocaleTimeString("zh-CN")}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
