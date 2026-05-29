import useSWR from "swr";
import Header from "./components/Header";
import Footer from "./components/Footer";
import PlatformGrid from "./components/PlatformGrid";
import HotCard from "./components/HotCard";
import { fetchAllHot } from "./lib/api";
import type { AllPlatformsData } from "./lib/types";

const PLATFORM_ORDER = ["weibo", "zhihu", "baidu"];

function getLatestUpdate(data: AllPlatformsData): string {
  let latest = "";
  for (const p of Object.values(data)) {
    if (p.updateTime > latest) latest = p.updateTime;
  }
  return latest;
}

function cardState(
  isLoading: boolean,
  error: unknown,
  platformData: AllPlatformsData | undefined,
  platform: string
): "loading" | "error" | "empty" | "success" {
  if (isLoading && !platformData?.[platform]) return "loading";
  if (error && !platformData?.[platform]) return "error";
  if (platformData?.[platform] && platformData[platform].data.length === 0) return "empty";
  if (platformData?.[platform] && platformData[platform].data.length > 0) return "success";
  return "loading";
}

export default function App() {
  const { data, error, isLoading, mutate } = useSWR("hot:all", fetchAllHot, {
    refreshInterval: Number(import.meta.env.VITE_REFRESH_INTERVAL) || 300000,
    keepPreviousData: true,
  });

  const lastUpdateTime = data ? getLatestUpdate(data) : null;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-100 via-gray-50 to-indigo-50">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 -left-20 w-72 h-72 bg-purple-300/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-300/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-amber-200/10 rounded-full blur-3xl" />
      </div>

      <Header lastUpdateTime={lastUpdateTime} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-10 relative z-10">
        <PlatformGrid>
          {PLATFORM_ORDER.map((platform, i) => (
            <div key={platform} className="animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
              <HotCard
                platformData={data?.[platform]}
                state={cardState(isLoading, error, data, platform)}
                onRetry={() => mutate()}
              />
            </div>
          ))}
        </PlatformGrid>
      </main>

      <Footer />
    </div>
  );
}
