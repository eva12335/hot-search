import { type ReactNode } from "react";

export default function PlatformGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7" style={{ perspective: 1200 }}>
      {children}
    </div>
  );
}
