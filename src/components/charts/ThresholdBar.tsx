"use client";

import { moneyM } from "@/lib/format";
import { useLang } from "@/i18n";
import type { ApronLevel, SeasonLines } from "@/lib/types";
import { APRON_COLOR } from "./PayrollBars";

/**
 * Where one team sits on the floor → cap → tax → apron1 → apron2 ladder.
 * The scale is linear in dollars, so the gaps between the lines are to scale.
 * Labels live in a legend below the bar to avoid overlap on narrow screens.
 */
export function ThresholdBar({
  lines,
  payroll,
  taxSalary,
  apronSalary,
  apronLevel,
  color,
}: {
  lines: Pick<SeasonLines, "floor" | "cap" | "tax" | "apron1" | "apron2">;
  payroll: number;
  taxSalary?: number;
  apronSalary?: number;
  apronLevel: ApronLevel;
  color?: string;
}) {
  const { t, lang } = useLang();
  const lo = Math.min(lines.floor, payroll) * 0.97;
  const hi = Math.max(lines.apron2, apronSalary ?? 0, payroll) * 1.02;
  const at = (v: number) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))}%`;

  const marks = [
    { key: "floor", value: lines.floor, color: "#4d5b7c", label: t("th.floor") },
    { key: "cap", value: lines.cap, color: "#35d0e0", label: t("th.cap") },
    { key: "tax", value: lines.tax, color: "#ffc861", label: t("th.tax") },
    { key: "apron1", value: lines.apron1, color: "#f5a524", label: t("th.apron1") },
    { key: "apron2", value: lines.apron2, color: "#ff5d73", label: t("th.apron2") },
  ];
  const accent = color ?? APRON_COLOR[apronLevel];

  return (
    <div>
      <div className="relative h-[52px]">
        <div className="absolute inset-x-0 top-5 h-[7px] rounded-full bg-white/[0.06]" />
        <div
          className="absolute top-5 left-0 h-[7px] rounded-full transition-[width] duration-700"
          style={{ width: at(payroll), background: `linear-gradient(90deg, ${accent}55, ${accent})` }}
        />

        {marks.map((m) => (
          <div key={m.key} className="absolute top-[9px]" style={{ left: at(m.value) }}>
            <div className="h-[22px] w-px -translate-x-1/2" style={{ background: m.color, opacity: 0.75 }} />
            <div className="tnum absolute top-[24px] -translate-x-1/2 text-[0.62rem] whitespace-nowrap" style={{ color: m.color }}>
              {moneyM(m.value, lang, 0)}
            </div>
          </div>
        ))}

        {/* team markers */}
        {typeof apronSalary === "number" && Math.abs(apronSalary - payroll) > 250_000 && (
          <div className="absolute top-[13px] -translate-x-1/2" style={{ left: at(apronSalary) }} title={t("team.apronSalary")}>
            <div className="h-[14px] w-[3px] rounded-full bg-violet/80" />
          </div>
        )}
        <div className="absolute top-[7px] z-10 -translate-x-1/2" style={{ left: at(payroll) }}>
          <div className="h-[24px] w-[3.5px] rounded-full" style={{ background: accent, boxShadow: `0 0 14px -1px ${accent}` }} />
          <div
            className="tnum absolute top-[26px] left-1/2 -translate-x-1/2 rounded-md border px-1.5 py-[1px] text-[0.7rem] font-bold whitespace-nowrap"
            style={{ borderColor: `${accent}66`, background: "#080c18", color: accent }}
          >
            {moneyM(payroll, lang, 1)}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5">
        {marks.map((m) => (
          <span key={m.key} className="flex items-center gap-1.5 text-[0.72rem] text-fog">
            <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
            {m.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[0.72rem] text-fog">
          <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
          {lang === "ja" ? "このチーム" : "This team"}
        </span>
        {typeof apronSalary === "number" && Math.abs(apronSalary - payroll) > 250_000 && (
          <span className="flex items-center gap-1.5 text-[0.72rem] text-fog">
            <span className="h-2 w-2 rounded-full bg-violet/80" />
            {t("team.apronSalary")} {moneyM(apronSalary, lang, 1)}
          </span>
        )}
        {typeof taxSalary === "number" && Math.abs(taxSalary - payroll) > 250_000 && (
          <span className="tnum text-[0.72rem] text-fog">
            {t("team.taxSalary")} {moneyM(taxSalary, lang, 1)}
          </span>
        )}
      </div>
    </div>
  );
}
