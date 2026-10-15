"use client";

import { league } from "@/lib/data";
import { cls, moneyBig, moneyM, pct } from "@/lib/format";
import { useLang } from "@/i18n";
import type { CapHistoryEntry } from "@/lib/types";
import { Badge, Panel, Stat } from "./ui";
import { LineChart } from "./charts/LineChart";

const SERIES = [
  { key: "cap", color: "#35d0e0", ja: "サラリーキャップ", en: "Salary cap" },
  { key: "tax", color: "#ffc861", ja: "タックスライン", en: "Luxury tax" },
  { key: "apron1", color: "#f5a524", ja: "第1エプロン", en: "First apron" },
  { key: "apron2", color: "#ff5d73", ja: "第2エプロン", en: "Second apron" },
  { key: "floor", color: "#4d5b7c", ja: "最低給与ライン", en: "Salary floor" },
] as const;

const COLUMNS: { key: keyof CapHistoryEntry | "growth" | "taxOverCap"; ja: string; en: string; wide?: boolean }[] = [
  { key: "cap", ja: "サラリーキャップ", en: "Salary cap" },
  { key: "growth", ja: "前年比", en: "YoY" },
  { key: "floor", ja: "最低給与ライン", en: "Salary floor", wide: true },
  { key: "tax", ja: "タックスライン", en: "Tax level" },
  { key: "taxOverCap", ja: "タックス/キャップ", en: "Tax ÷ cap", wide: true },
  { key: "apron1", ja: "第1エプロン", en: "First apron", wide: true },
  { key: "apron2", ja: "第2エプロン", en: "Second apron", wide: true },
  { key: "mleNonTax", ja: "非課税MLE", en: "Non-tax MLE", wide: true },
  { key: "mleTax", ja: "課税MLE＝ブラケット幅", en: "Taxpayer MLE = bracket", wide: true },
];

export function CapHistoryView() {
  const { t, lang } = useLang();
  const seasons = Object.keys(league.capHistory).sort();
  const rows = seasons.map((season, i) => {
    const entry = league.capHistory[season];
    const prev = i > 0 ? league.capHistory[seasons[i - 1]] : null;
    return {
      season,
      ...entry,
      growth: prev ? ((entry.cap - prev.cap) / prev.cap) * 100 : null,
      taxOverCap: (entry.tax / entry.cap) * 100,
    };
  });

  const latest = rows[rows.length - 1];
  const current = league.lines;
  const totalPayroll = league.totals.payroll;

  return (
    <div className="space-y-5">
      <header className="panel px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="amber">{league.season}</Badge>
          <span className="chip tnum">{t("th.cap")} {moneyM(current.cap, lang, 3)}</span>
          <span className="chip tnum">{t("th.tax")} {moneyM(current.tax, lang, 3)}</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-chalk">{t("cap.title")}</h1>
        <p className="mt-1.5 max-w-3xl text-[0.85rem] text-fog">{t("cap.subtitle", { season: league.season })}</p>
      </header>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label={`${t("th.cap")} ${latest.season}`} value={moneyM(current.cap, lang, 3)} tone="cyan"
          note={`${t("cap.growth")} ${latest.growth !== null ? `+${latest.growth.toFixed(1)}%` : "—"}`} />
        <Stat label={`${t("th.tax")} ${latest.season}`} value={moneyM(current.tax, lang, 3)} tone="amber"
          note={`${pct((current.tax / current.cap) * 100, lang, 1)} ${lang === "ja" ? "of cap" : "of the cap"}`} />
        <Stat label={t("dash.leaguePayroll")} value={moneyBig(totalPayroll, lang)} tone="rose"
          note={`${lang === "ja" ? "リーグ全体の" : "League-wide"} ${pct((totalPayroll / (current.cap * 30)) * 100, lang, 1)} ${lang === "ja" ? "of 30×cap" : "of 30×cap"}`} />
        <Stat label={t("th.apron2")} value={moneyM(current.apron2, lang, 3)} tone="rose"
          note={`${moneyM(current.apron2 - current.tax, lang, 1)} ${lang === "ja" ? "タックスラインから" : "above the tax line"}`} />
      </div>

      <Panel title={t("cap.chart")} subtitle={lang === "ja" ? "公式発表額の推移。2023-24以降は新CBAの下でエプロンが導入されました。" : "Officially announced figures. Both aprons arrived with the 2023 CBA."}>
        <LineChart
          categories={seasons}
          series={SERIES.map((s) => ({
            id: s.key,
            label: lang === "ja" ? s.ja : s.en,
            color: s.color,
            area: s.key === "cap",
            width: s.key === "cap" ? 3 : 2,
            points: seasons.map((season) => ({
              x: season,
              y: league.capHistory[season][s.key] ?? null,
            })),
          }))}
          formatY={(v) => moneyM(v, lang, 0)}
          height={340}
        />
      </Panel>

      <div className="grid gap-5">
        <Panel title={t("cap.growth")} subtitle={lang === "ja" ? "CBAは年10%までと上限を定めています（キャップスムージング）。" : "The CBA limits annual growth to 10% (cap smoothing)."}>
          <LineChart
            categories={seasons}
            series={[
              {
                id: "growth",
                label: lang === "ja" ? "キャップ上昇率" : "Cap growth",
                color: "#3ddc97",
                area: true,
                points: rows.map((r) => ({ x: r.season, y: r.growth })),
              },
            ]}
            formatY={(v) => `${v.toFixed(0)}%`}
            height={240}
            yTicks={4}
          />
          <p className="mt-3 text-[0.78rem] leading-relaxed text-fog">{t("cap.smoothingBody")}</p>
        </Panel>

        <Panel title={t("cap.table")}>
          <div className="scroll-x">
            <table className="grid-table text-[0.79rem]">
              <thead>
                <tr>
                  <th>{t("common.season")}</th>
                  {COLUMNS.map((c) => (
                    <th key={c.key} className={cls("right whitespace-nowrap", c.wide && "hidden sm:table-cell")}>
                      {lang === "ja" ? c.ja : c.en}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.season}>
                    <td className={cls("tnum font-semibold", r.season === league.season ? "text-amber-soft" : "text-chalk")}>
                      {r.season}
                    </td>
                    {COLUMNS.map((c) => {
                      const v = r[c.key as keyof typeof r];
                      return (
                        <td key={c.key} className={cls("right tnum text-fog-2", c.wide && "hidden sm:table-cell")}>
                          {c.key === "growth"
                            ? v === null
                              ? "—"
                              : `+${Number(v).toFixed(1)}%`
                            : c.key === "taxOverCap"
                              ? pct(Number(v), lang, 1)
                              : v === null || v === undefined
                                ? "—"
                                : moneyM(Number(v), lang, 1)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[0.74rem] leading-relaxed text-fog">{t("cap.note2023")}</p>
        </Panel>
      </div>

      <Panel title={`${t("dash.leagueLines", { season: league.season })} — ${lang === "ja" ? "全項目" : "every figure"}`}>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["th.floor", current.floor],
              ["th.cap", current.cap],
              ["th.tax", current.tax],
              ["th.apron1", current.apron1],
              ["th.apron2", current.apron2],
              ["th.mleNonTax", current.mleNonTax],
              ["th.mleTax", current.mleTax],
              ["th.roomMle", current.roomMle],
              ["th.bae", current.bae],
              ["th.max0_6", current.max0_6],
              ["th.max7_9", current.max7_9],
              ["th.max10", current.max10],
              ["th.twoWay", current.twoWay],
              ["th.earlyBird", current.earlyBird],
              ["th.tradeCashLimit", current.tradeCashLimit],
              ["th.expandedTpe", current.expandedTpe],
            ] as const
          ).map(([key, value]) => (
            <div key={key} className="panel-flat px-3 py-2.5">
              <div className="label-xs truncate">{t(key)}</div>
              <div className="tnum mt-1 text-[0.95rem] font-semibold text-chalk">
                {value >= 1_000_000 ? moneyM(value, lang, 3) : `$${value.toLocaleString()}`}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[0.74rem] leading-relaxed text-fog">
          {lang === "ja"
            ? `推定平均年俸は ${moneyM(current.estAvgSalary, lang, 3)}。ベテラン延長の上限は推定平均年俸の140%（${moneyM(
                current.estAvgSalary * 1.4,
                lang,
                3,
              )}）です。`
            : `Estimated average salary is ${moneyM(current.estAvgSalary, lang, 3)}; veteran extensions for below-average earners can start at 140% of it (${moneyM(
                current.estAvgSalary * 1.4,
                lang,
                3,
              )}).`}
        </p>
      </Panel>
    </div>
  );
}
