"use client";

import type { ReactNode } from "react";
import { cls } from "@/lib/format";

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
  id,
  dense = false,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  dense?: boolean;
}) {
  return (
    <section id={id} className={cls("panel", className)}>
      {(title || action) && (
        <header
          className={cls(
            "flex flex-wrap items-start justify-between gap-3 border-b border-line/70",
            dense ? "px-4 py-3" : "px-4 py-3.5 sm:px-5",
          )}
        >
          <div className="min-w-0">
            {title && <h2 className="text-[0.98rem] font-semibold text-chalk">{title}</h2>}
            {subtitle && <p className="mt-1 max-w-3xl text-xs leading-relaxed text-fog">{subtitle}</p>}
          </div>
          {action && <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">{action}</div>}
        </header>
      )}
      <div className={dense ? "" : "px-4 py-4 sm:px-5"}>{children}</div>
    </section>
  );
}

export type Tone = "default" | "amber" | "cyan" | "mint" | "rose" | "violet";

export function Stat({
  label,
  value,
  note,
  tone = "default",
  className = "",
}: {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const toneCls: Record<Tone, string> = {
    default: "text-chalk",
    amber: "text-amber",
    cyan: "text-cyan",
    mint: "text-mint",
    rose: "text-rose",
    violet: "text-violet",
  };
  return (
    <div className={cls("panel-flat px-3.5 py-3", className)}>
      <div className="label-xs">{label}</div>
      <div className={cls("font-display mt-1.5 text-[1.5rem] font-semibold leading-none sm:text-[1.75rem]", toneCls[tone])}>{value}</div>
      {note && <div className="mt-1.5 text-[0.7rem] leading-snug text-fog">{note}</div>}
    </div>
  );
}

const BADGE_TONES: Record<string, string> = {
  neutral: "border-line bg-panel-2/70 text-fog-2",
  amber: "border-amber/40 bg-amber/12 text-amber-soft",
  cyan: "border-cyan/40 bg-cyan/12 text-cyan",
  mint: "border-mint/40 bg-mint/12 text-mint",
  rose: "border-rose/40 bg-rose/12 text-rose",
  violet: "border-violet/40 bg-violet/12 text-violet",
};

export function Badge({
  children,
  tone = "neutral",
  title,
  className = "",
}: {
  children: ReactNode;
  tone?: keyof typeof BADGE_TONES;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cls(
        "inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[0.68rem] font-semibold whitespace-nowrap",
        BADGE_TONES[tone] ?? BADGE_TONES.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Delta({ value, suffix = "", invert = false }: { value: number | null; suffix?: string; invert?: boolean }) {
  if (value === null || value === undefined || Number.isNaN(value) || value === 0) {
    return <span className="text-fog">±0{suffix}</span>;
  }
  const up = value > 0;
  const good = invert ? !up : up;
  return (
    <span className={good ? "text-up tnum" : "text-down tnum"}>
      {up ? "▲" : "▼"} {Math.abs(value).toLocaleString()}
      {suffix}
    </span>
  );
}

export function MeterBar({
  value,
  max,
  color = "#f5a524",
  height = 8,
  track = "rgba(255,255,255,0.06)",
}: {
  value: number;
  max: number;
  color?: string;
  height?: number;
  track?: string;
}) {
  const pctVal = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="bar-track" style={{ height, background: track }}>
      <div className="bar-fill" style={{ width: `${pctVal}%`, background: color }} />
    </div>
  );
}
