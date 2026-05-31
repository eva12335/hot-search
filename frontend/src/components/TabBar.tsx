export type TabFilter = "all" | "social" | "ai";

const TABS: { key: TabFilter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "social", label: "社交平台" },
  { key: "ai", label: "AI 原生" },
];

interface TabBarProps {
  active: TabFilter;
  onChange: (tab: TabFilter) => void;
}

export default function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div className="flex justify-center py-6">
      <div className="tab-capsule">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${active === tab.key ? "active" : ""}`}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
