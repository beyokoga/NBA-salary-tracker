"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { league } from "@/lib/data";
import { cls, moneyBig, moneyM, pct } from "@/lib/format";
import { APRON_RESTRICTIONS, luxuryTax, rateForBracket, taxDistribution } from "@/lib/tax";
import { useLang } from "@/i18n";
import { Badge, Panel, Stat } from "./ui";
import { Term } from "./Term";
import { TeamLogo } from "./TeamLogo";
import { TaxCurve } from "./charts/TaxCurve";
import { APRON_COLOR } from "./charts/PayrollBars";

const FLOOR = 120_000_000;
const CEILING = 280_000_000;

export function TaxLab() {
  const { t, lang } = useLang();
  const params = useSearchParams();
  const lines = league.lines;

  const initial = league.teams.find((x) => x.slug === params.get("team")) ?? league.teams[0];
  const urlSlug = params.get("team");

  // `picked` / `repeaterOverride` are explicit user choices; everything else is
  // derived so the URL, the team select and the slider can never disagree.
  const [picked, setPicked] = useState<string | null>(null);
  const [custom, setCustom] = useState<number | null>(null);
  const [repeaterOverride, setRepeaterOverride] = useState<boolean | null>(null);
  const [includeApron, setIncludeApron] = useState(true);

  const slug = picked ?? (urlSlug && league.teams.some((x) => x.slug === urlSlug) ? urlSlug : initial.slug);
  const team = league.teams.find((x) => x.slug === slug) ?? league.teams[0];
  const taxSalary = custom ?? team.taxSalary;
  const repeater = repeaterOverride ?? team.repeater;

  const result = luxuryTax(taxSalary, lines, repeater);
  const bill = includeApron ? result.total : result.bracketTax;
  const plusOne = luxuryTax(taxSalary + 1_000_000, lines, repeater);
  const nextDollar = includeApron ? plusOne.total - result.total : plusOne.bracketTax - result.bracketTax;

  const build = (salary: number) => {
    const r = luxuryTax(salary, lines, repeater);
    return { salary, bill: includeApron ? r.total : r.bracketTax };
  };
  const base = build(taxSalary);
  const scenarios = [
    { key: "duck", label: t("tax.scenario.duck"), ...build(lines.tax - 1) },
    { key: "apron1", label: t("tax.scenario.toApron1"), ...build(lines.apron1) },
    { key: "apron2", label: t("tax.scenario.toApron2"), ...build(lines.apron2) },
    { key: "p10", label: t("tax.scenario.plus10"), ...build(taxSalary + 10_000_000) },
    { key: "m10", label: t("tax.scenario.minus10"), ...build(Math.max(FLOOR, taxSalary - 10_000_000)) },
  ].map((sc) => ({ ...sc, diff: sc.bill - base.bill, salaryDiff: sc.salary - base.salary }));

  const leagueTaxTeams = [...league.teams]
    .filter((x) => x.taxEstimate > 0)
    .sort((a, b) => b.taxEstimate - a.taxEstimate);
  const nonTaxpayers = league.teams.length - leagueTaxTeams.length;
  const perNonTaxpayer = taxDistribution(league.totals.tax, nonTaxpayers);

  return (
    <div className="space-y-5">
      <header className="panel px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="amber">{league.season}</Badge>
          <span className="chip tnum">
            {t("th.tax")} {moneyM(lines.tax, lang, 3)}
          </span>
          <span className="chip tnum">
            <Term id="mle">{t("th.bracket")}</Term> {moneyM(lines.mleTax, lang, 3)}
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-chalk">{t("tax.title")}</h1>
        <p className="mt-1.5 max-w-3xl text-[0.85rem] text-fog">{t("tax.subtitle")}</p>
      </header>

      {/* ------------------------------------------------------- controls */}
      <Panel title={t("tax.team")}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <label className="label-xs" htmlFor="team-select">
              {t("tax.team")}
            </label>
            <select
              id="team-select"
              className="input mt-1.5"
              value={slug}
              onChange={(e) => {
                setPicked(e.target.value);
                setCustom(null);
                setRepeaterOverride(null);
              }}
            >
              {[...league.teams]
                .sort((a, b) => b.payroll - a.payroll)
                .map((x) => (
                  <option key={x.slug} value={x.slug}>
                    {x.abbr} — {x.name} ({moneyM(x.taxSalary, lang, 1)})
                  </option>
                ))}
            </select>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="chip tnum">
                {t("team.taxSalary")}: {moneyM(team.taxSalary, lang, 2)}
              </span>
              <span className="chip tnum">
                {t("team.apronSalary")}: {moneyM(team.apronSalary, lang, 2)}
              </span>
              <span className="chip" style={{ color: APRON_COLOR[team.apronLevel] }}>
                {t(`apron.${team.apronLevel}` as never)}
              </span>
              <button
                type="button"
                className={cls("btn", custom === null && "btn-on")}
                onClick={() => {
                  setCustom(null);
                  setRepeaterOverride(null);
                }}
              >
                {t("tax.useTeamActual")}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label className="label-xs" htmlFor="payroll">
                {t("tax.customPayroll")}
              </label>
              <span className="tnum text-lg font-bold text-amber-soft">{moneyM(taxSalary, lang, 2)}</span>
            </div>
            <input
              id="payroll"
              type="range"
              min={FLOOR}
              max={CEILING}
              step={100_000}
              value={taxSalary}
              onChange={(e) => setCustom(Number(e.target.value))}
              className="mt-2 w-full"
              style={{ accentColor: "#f5a524" }}
            />
            <div className="relative mt-1 h-9">
              {[
                { v: lines.tax, label: t("th.tax"), color: "#ffc861", tier: 0 },
                { v: lines.apron1, label: t("th.apron1"), color: "#f5a524", tier: 1 },
                { v: lines.apron2, label: t("th.apron2"), color: "#ff5d73", tier: 0 },
              ].map((m) => (
                <span
                  key={m.label}
                  className={cls(
                    "absolute -translate-x-1/2 text-[0.6rem] font-semibold whitespace-nowrap",
                    m.tier === 1 ? "top-4" : "top-0",
                  )}
                  style={{ left: `${((m.v - FLOOR) / (CEILING - FLOOR)) * 100}%`, color: m.color }}
                >
                  {moneyM(m.v, lang, 0)}
                </span>
              ))}
              <span className="tnum absolute left-0 top-4 text-[0.6rem] text-fog/60">{moneyM(FLOOR, lang, 0)}</span>
              <span className="tnum absolute right-0 top-4 text-[0.6rem] text-fog/60">{moneyM(CEILING, lang, 0)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className={cls("btn", repeater && "btn-on")} onClick={() => setRepeaterOverride(!repeater)}>
                {t("tax.repeater")}
              </button>
              <button
                type="button"
                className={cls("btn", includeApron && "btn-on")}
                onClick={() => setIncludeApron((v) => !v)}
              >
                {t("tax.includeApron")}
              </button>
            </div>
            <p className="mt-2 text-[0.72rem] leading-relaxed text-fog">{t("tax.repeaterHint")}</p>
          </div>
        </div>
      </Panel>

      {/* ------------------------------------------------------- results */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
        <Stat
          label={t("tax.overage")}
          value={result.overage > 0 ? moneyM(result.overage, lang, 2) : "$0"}
          tone={result.overage > 0 ? "rose" : "mint"}
        />
        <Stat label={t("detail.bracketTax")} value={moneyM(result.bracketTax, lang, 2)} tone="amber" />
        <Stat
          label={t("detail.apronSurcharge")}
          value={moneyM(result.apron1Surcharge + result.apron2Surcharge, lang, 2)}
          tone="rose"
          note={`×2.5 ${moneyM(result.apron1Surcharge, lang, 1)} · ×3.5 ${moneyM(result.apron2Surcharge, lang, 1)}`}
        />
        <Stat label={t("tax.bill")} value={moneyM(bill, lang, 2)} tone="rose" note={`${t("detail.effective")} $${(bill / Math.max(1, result.overage)).toFixed(2)} ${t("common.perDollar")}`} />
        <Stat label={t("tax.totalCost")} value={moneyM(taxSalary + bill, lang, 2)} tone="cyan" note={`${t("tax.marginal")} $${(nextDollar / 1e6).toFixed(2)}M / +$1M`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Panel title={t("tax.curve")} subtitle={t("tax.curveSub")}>
          <TaxCurve lines={lines} taxSalary={taxSalary} repeater={repeater} includeApron={includeApron} height={300} />
        </Panel>

        <Panel title={t("tax.bracketTable")} subtitle={`${repeater ? t("tax.ratesRepeater") : t("tax.ratesStandard")} · ${t("th.bracket")} = ${moneyM(lines.mleTax, lang, 2)}`}>
          {result.rows.length === 0 ? (
            <div className="rounded-lg border border-mint/30 bg-mint/8 px-3 py-6 text-center text-[0.85rem] text-mint">
              {t("tax.noTax")}
            </div>
          ) : (
            <div className="scroll-x -mx-1 px-1">
            <table className="grid-table min-w-[360px] text-[0.8rem]">
              <thead>
                <tr>
                  <th>{t("detail.bracket")}</th>
                  <th className="right">{t("detail.band")}</th>
                  <th className="right">{t("detail.rate")}</th>
                  <th className="right">{t("detail.taxOnBand")}</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.bracket}>
                    <td className="text-fog">{row.bracket}</td>
                    <td className="right tnum text-fog-2">
                      {moneyM(row.from, lang, 2)} – {moneyM(row.to, lang, 2)}
                    </td>
                    <td className="right tnum font-semibold text-amber-soft">${row.rate.toFixed(2)}</td>
                    <td className="right tnum text-chalk">{moneyM(row.amount, lang, 2)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} className="pt-2 text-fog">{t("th.apron1")} ×2.5</td>
                  <td className="right tnum pt-2 text-rose">{moneyM(result.apron1Surcharge, lang, 2)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-fog">{t("th.apron2")} ×3.5</td>
                  <td className="right tnum text-rose">{moneyM(result.apron2Surcharge, lang, 2)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="pt-2 font-semibold text-chalk">{includeApron ? t("detail.totalTax") : t("detail.bracketTax")}</td>
                  <td className="right tnum pt-2 text-lg font-bold text-rose">{moneyM(bill, lang, 2)}</td>
                </tr>
              </tbody>
            </table>
            </div>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="panel-flat flex items-center gap-2 px-2.5 py-1.5 text-[0.72rem]">
                <span className="tnum w-5 text-fog">{i + 1}</span>
                <span className="text-fog-2">
                  {i < 4
                    ? `${moneyM(lines.mleTax * i, lang, 1)} – ${moneyM(lines.mleTax * (i + 1), lang, 1)}`
                    : `${moneyM(lines.mleTax * 4, lang, 1)} +`}
                </span>
                <span className="tnum ml-auto text-chalk">
                  ${rateForBracket(i, false).toFixed(2)} <span className="text-fog/60">/</span>{" "}
                  <span className="text-rose">${rateForBracket(i, true).toFixed(2)}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[0.7rem] text-fog">
            {lang === "ja"
              ? "左が標準税率、右がリピーター税率。第5ブラケット以降はそれぞれ +$0.50 ずつ上がります。"
              : "Standard rate on the left, repeater on the right. Each bracket beyond the fourth adds $0.50."}
          </p>
        </Panel>
      </div>

      {/* ------------------------------------------------------- scenarios */}
      <Panel title={t("tax.scenarios")} subtitle={lang === "ja" ? "現在の設定からの差分" : "Difference from the current setting"} dense>
        <div className="grid gap-px bg-line/50 sm:grid-cols-2 lg:grid-cols-5">
          {scenarios.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setCustom(Math.max(FLOOR, Math.min(CEILING, s.salary)))}
              className="bg-panel px-3.5 py-3 text-left transition hover:bg-panel-2"
            >
              <div className="label-xs">{s.label}</div>
              <div className="tnum mt-1.5 text-[1.05rem] font-bold text-chalk">{moneyM(s.salary, lang, 1)}</div>
              <div className="tnum mt-1 text-[0.82rem] font-semibold text-amber-soft">
                {t("tax.bill")} {moneyM(s.bill, lang, 1)}
              </div>
              <div className={cls("tnum mt-0.5 text-[0.72rem]", s.diff > 0 ? "text-down" : s.diff < 0 ? "text-up" : "text-fog")}>
                {s.diff > 0 ? `${t("tax.extraCost")} +${moneyM(s.diff, lang, 1)}` : s.diff < 0 ? `${t("tax.saved")} ${moneyM(-s.diff, lang, 1)}` : "—"}
              </div>
            </button>
          ))}
        </div>
      </Panel>

      {/* ------------------------------------------------------- league bills */}
      <Panel
        title={t("tax.leagueBills")}
        subtitle={t("tax.leagueBillsSub")}
        action={
          <span className="tnum chip">
            {t("dash.taxDistribution")} {moneyM(perNonTaxpayer, lang, 2)}
          </span>
        }
      >
        <div className="space-y-[3px]">
          {leagueTaxTeams.map((x) => {
            const max = leagueTaxTeams[0].taxEstimate;
            return (
              <Link
                key={x.slug}
                href={`/teams/${x.slug}`}
                className="flex items-center gap-2 rounded-md py-[3px] pr-2 transition hover:bg-white/[0.04]"
              >
                <TeamLogo abbr={x.abbr} size={17} />
                <span className="w-12 shrink-0 text-[0.76rem] font-semibold text-fog-2">{x.abbr}</span>
                <span className="relative h-[16px] flex-1">
                  <span
                    className="absolute inset-y-0 left-0 rounded-r-[3px]"
                    style={{
                      width: `${(x.taxEstimate / max) * 100}%`,
                      background: `linear-gradient(90deg, ${APRON_COLOR[x.apronLevel]}44, ${APRON_COLOR[x.apronLevel]})`,
                    }}
                  />
                  <span className="tnum absolute inset-y-0 left-2 flex items-center text-[0.68rem] text-chalk/85">
                    {moneyM(x.taxEstimate, lang, 1)}
                  </span>
                </span>
                <span className="tnum hidden w-24 shrink-0 text-right text-[0.72rem] text-fog sm:block">
                  {pct((x.taxEstimate / x.payroll) * 100, lang, 1)} {lang === "ja" ? "給与比" : "of payroll"}
                </span>
                <span className="tnum w-[6.5rem] shrink-0 text-right text-[0.76rem] text-fog-2">
                  {moneyM(x.payroll, lang, 1)}
                </span>
                {x.repeater && <Badge tone="rose">REP</Badge>}
              </Link>
            );
          })}
        </div>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          <Stat label={t("dash.taxCollected")} value={moneyBig(league.totals.tax, lang)} tone="rose" />
          <Stat
            label={lang === "ja" ? "エプロン加算税込み" : "Including apron surcharges"}
            value={moneyBig(league.totals.taxAllIn, lang)}
            tone="amber"
          />
          <Stat label={t("dash.taxpayers")} value={`${leagueTaxTeams.length} / 30`} tone="cyan"
            note={`${nonTaxpayers} ${lang === "ja" ? "チームが分配を受け取る" : "teams receive a share"}`} />
        </div>
      </Panel>

      {/* ------------------------------------------------------- restrictions */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={t("tax.restrictionsFirst")}>
          <ul className="space-y-2 text-[0.82rem] leading-relaxed text-fog-2">
            {APRON_RESTRICTIONS.first.map((r) => (
              <li key={r.en} className="flex gap-2">
                <span className="mt-[0.35rem] h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                <span>{lang === "ja" ? r.ja : r.en}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={t("tax.restrictionsSecond")}>
          <ul className="space-y-2 text-[0.82rem] leading-relaxed text-fog-2">
            {APRON_RESTRICTIONS.second.map((r) => (
              <li key={r.en} className="flex gap-2">
                <span className="mt-[0.35rem] h-1.5 w-1.5 shrink-0 rounded-full bg-rose" />
                <span>{lang === "ja" ? r.ja : r.en}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <p className="px-1 text-[0.74rem] leading-relaxed text-fog">
        {lang === "ja"
          ? `スライダーの位置 ${moneyM(taxSalary, lang, 2)} はチームのキャップホールドを含みません。タックス対象額とエプロン対象額は異なることがあり、実際の判定はシーズン終了時の確定計算で行われます。`
          : `The slider value ${moneyM(taxSalary, lang, 2)} excludes cap holds. Tax salary and apron salary can differ, and the final assessment happens at season's end.`}
      </p>
    </div>
  );
}
