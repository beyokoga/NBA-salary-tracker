"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { league } from "@/lib/data";
import { cls, moneyM, pct } from "@/lib/format";
import { useLang } from "@/i18n";
import type { ApronLevel } from "@/lib/types";
import { TeamLogo } from "@/components/TeamLogo";

export const APRON_COLOR: Record<ApronLevel, string> = {
  second: "#ff5d73",
  first: "#f5a524",
  tax: "#ffc861",
  belowTax: "#35d0e0",
};

const GRID = "grid grid-cols-[6.25rem_1fr] gap-x-2.5 sm:grid-cols-[8.5rem_1fr]";

/**
 * All 30 payrolls as horizontal bars, with the cap / tax / apron thresholds
 * drawn as vertical rules that span the whole list.
 */
export function PayrollBars({
  mode = "dollars",
  highlight,
}: {
  mode?: "dollars" | "pct";
  highlight?: string | null;
}) {
  const { t, lang } = useLang();
  const [hover, setHover] = useState<string | null>(null);
  const lines = league.lines;
  const teams = [...league.teams].sort((a, b) => b.payroll - a.payroll);

  const maxPayroll = Math.max(...teams.map((x) => x.payroll));
  const axisMax =
    mode === "dollars"
      ? Math.ceil((maxPayroll * 1.06) / 10e6) * 10e6
      : Math.ceil(((maxPayroll / lines.cap) * 106) / 5) * 5;
  const valueOf = (payroll: number) => (mode === "dollars" ? payroll : (payroll / lines.cap) * 100);
  const pos = (payroll: number) => `${(valueOf(payroll) / axisMax) * 100}%`;

  const thresholds = [
    { key: "cap", value: lines.cap, color: "#35d0e0", label: t("th.cap") },
    { key: "tax", value: lines.tax, color: "#ffc861", label: t("th.tax") },
    { key: "apron1", value: lines.apron1, color: "#f5a524", label: t("th.apron1") },
    { key: "apron2", value: lines.apron2, color: "#ff5d73", label: t("th.apron2") },
  ];

  const active = teams.find((x) => x.slug === (hover ?? highlight ?? ""));

  return (
    <div>
      <div className={cls(GRID, "mb-1.5 items-end")}>
        <div className="label-xs">{t("team.payroll")}</div>
        <div className="relative h-10">
          {thresholds.map((th) => (
            <div
              key={th.key}
              className={cls(
                "absolute hidden -translate-x-1/2 text-[0.62rem] font-bold whitespace-nowrap sm:block",
                th.key === "apron1" ? "bottom-4" : "bottom-0",
              )}
              style={{ left: pos(th.value), color: th.color }}
            >
              {mode === "dollars" ? moneyM(th.value, lang, 1) : pct((th.value / lines.cap) * 100, lang, 0)}
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        {/* threshold rules, aligned to the bar column */}
        <div className={cls(GRID, "pointer-events-none absolute inset-0")}>
          <div />
          <div className="relative">
            {thresholds.map((th) => (
              <div
                key={th.key}
                className="absolute inset-y-0 w-px"
                style={{ left: pos(th.value), background: th.color, opacity: 0.3 }}
              />
            ))}
          </div>
        </div>

        <div className={cls(GRID, "relative gap-y-[3px]")}>
          {teams.map((team, i) => {
            const width = (valueOf(team.payroll) / axisMax) * 100;
            const inside = width > 66;
            const color = APRON_COLOR[team.apronLevel];
            const on = hover === team.slug || highlight === team.slug;
            return (
              <Fragment key={team.slug}>
                <Link
                  href={`/teams/${team.slug}`}
                  onMouseEnter={() => setHover(team.slug)}
                  onMouseLeave={() => setHover(null)}
                  className="flex min-w-0 items-center gap-1.5 rounded-md py-[3px] pl-1 transition hover:bg-white/[0.05]"
                >
                  <TeamLogo abbr={team.abbr} size={16} />
                  <span className={cls("truncate text-[0.75rem] font-semibold", on ? "text-chalk" : "text-fog-2")}>
                    {team.abbr}
                  </span>
                  <span className="tnum ml-auto text-[0.64rem] text-fog/60">{i + 1}</span>
                </Link>
                <Link
                  href={`/teams/${team.slug}`}
                  onMouseEnter={() => setHover(team.slug)}
                  onMouseLeave={() => setHover(null)}
                  className="relative h-[18px] rounded-md transition hover:bg-white/[0.035]"
                >
                  <div
                    className="absolute inset-y-[3px] left-0 rounded-r-[3px] transition-[width,box-shadow] duration-500"
                    style={{
                      width: `${width}%`,
                      background: `linear-gradient(90deg, ${color}2e, ${color})`,
                      boxShadow: on ? `0 0 0 1px ${color}, 0 0 18px -4px ${color}` : "none",
                    }}
                  />
                  <span
                    className={cls(
                      "tnum absolute inset-y-0 flex items-center text-[0.7rem] font-semibold",
                      inside ? "text-[#0a1220]" : "text-chalk/90",
                    )}
                    style={
                      inside
                        ? { left: `calc(${width}% - 6px)`, transform: "translateX(-100%)" }
                        : { left: `calc(${width}% + 6px)` }
                    }
                  >
                    {mode === "dollars" ? moneyM(team.payroll, lang, 1) : pct(team.capShare, lang, 1)}
                  </span>
                </Link>
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:hidden">
        {thresholds.map((th) => (
          <div key={th.key} className="flex items-center justify-between gap-2 rounded-md border border-line/60 bg-ink-2/60 px-2 py-1">
            <span className="flex min-w-0 items-center gap-1 text-[0.64rem] text-fog">
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: th.color }} />
              <span className="truncate">{th.label}</span>
            </span>
            <span className="tnum shrink-0 text-[0.66rem] font-semibold text-chalk">
              {mode === "dollars" ? moneyM(th.value, lang, 1) : pct((th.value / lines.cap) * 100, lang, 0)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex min-h-[2.4rem] flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-line/70 bg-ink-2/70 px-3 py-2 text-[0.74rem]">
        {active ? (
          <>
            <span className="flex items-center gap-1.5 font-semibold text-chalk">
              <TeamLogo abbr={active.abbr} size={16} />
              {active.name}
            </span>
            <span className="tnum text-fog-2">
              {moneyM(active.payroll, lang, 2)} · {pct(active.capShare, lang, 1)}
            </span>
            <span className="tnum text-fog-2">
              {t("team.taxEstimate")} {moneyM(active.taxEstimate, lang, 1)}
            </span>
            <span className="tnum text-fog-2">
              {t("team.record")} {active.wins}-{active.losses}
            </span>
            <span className="font-semibold" style={{ color: APRON_COLOR[active.apronLevel] }}>
              {t(`apron.${active.apronLevel}` as never)}
            </span>
          </>
        ) : (
          <span className="text-fog">{t("dash.distributionSub")}</span>
        )}
      </div>
    </div>
  );
}
