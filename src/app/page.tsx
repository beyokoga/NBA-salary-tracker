import type { Metadata } from "next";
import { Suspense } from "react";
import { TabbedSite } from "@/components/TabbedSite";

export const metadata: Metadata = {
  title: "ダッシュボード",
};

/** Static skeleton shown until the client tab router hydrates (no blank flash). */
function FirstPaint() {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 border-b border-line/80 bg-ink/85">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5 sm:px-6">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] border border-amber/40 bg-gradient-to-br from-amber/25 to-transparent text-[0.7rem] font-black text-amber-soft">
            $
          </span>
          <span className="h-4 w-40 animate-pulse rounded bg-panel-2/80" />
          <span className="ml-auto h-7 w-24 animate-pulse rounded bg-panel-2/80" />
        </div>
        <div className="border-t border-line/60">
          <div className="mx-auto flex max-w-[1400px] gap-1 px-2 py-1.5 sm:px-4">
            {[88, 72, 72, 80, 88, 64, 80].map((w, i) => (
              <span
                key={i}
                className="h-7 animate-pulse rounded-lg bg-panel-2/70"
                style={{ width: w, animationDelay: `${i * 90}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1400px] space-y-4 px-4 pt-5 sm:px-6">
        <div className="panel h-40 animate-pulse bg-panel-2/50" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="panel h-24 animate-pulse bg-panel-2/50" style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<FirstPaint />}>
      <TabbedSite />
    </Suspense>
  );
}
