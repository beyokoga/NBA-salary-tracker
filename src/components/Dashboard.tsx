"use client";

import Link from "next/link";
import { useState } from "react";
import { allPlayers, league } from "@/lib/data";
import { cls, dateLabel, deltaM, moneyBig, moneyM, pct } from "@/lib/format";
import { taxDistribution } from "@/lib/tax";
import { useLang } from "@/i18n";
import type { DictKey } from "@/i18n";
import { Badge, Panel, Stat } from "./ui";
import { Term } from "./Term";
import { TeamLogo } from "./TeamLogo";
import { PayrollBars, APRON_COLOR } from "./charts/PayrollBars";
import { Scatter } from "./charts/Scatter";
import { PlayoffResults } from "./PlayoffResults";

const LINE_KEYS: { key: DictKey; field: "floor" | "cap" | "tax" | "apron1" | "apron2"; color: string; note?: DictKey }[] = [
  { key: "th.floor", field: "floor", color: "#4d5b7c", note: "th.floorNote" },
  { key: "th.cap", field: "cap", color: "#35d0e0" },
  { key: "th.tax", field: "tax", color: "#ffc861" },
  { key: "th.apron1", field: "apron1", color: "#f5a524", note: "th.apron1Note" },
  { key: "th.apron2", field: "apron2", color: "#ff5d73", note: "th.apron2Note" },
];

const AWARDS: { key: string; ja: string; en: string }[] = [
  { key: "mvp", ja: "MVP", en: "MVP" },
  { key: "finalsMvp", ja: "ファイナルMVP", en: "Finals MVP" },
  { key: "roy", ja: "新人王", en: "Rookie of the Year" },
  { key: "dpoy", ja: "最優秀守備選手", en: "Defensive POY" },
  { key: "mip", ja: "最も成長した選手", en: "Most Improved" },
  { key: "sixth", ja: "シックスマン", en: "Sixth Man" },
  { key: "coy", ja: "最優秀監督", en: "Coach of the Year" },
  { key: "eoy", ja: "最優秀フロント", en: "Executive of the Year" },
];

export function Dashboard() {
  const { t, lang } = useLang();
  const [mode, setMode] = useState<"dollars" | "pct">("dollars");

  const lines = league.lines;
  const totals = league.totals;
  const teams = league.teams;
  const sorted = [...teams].sort((a, b) => b.payroll - a.payroll);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const nonTaxpayers = teams.length - totals.taxpayers;
  const perNonTaxpayer = taxDistribution(totals.tax, nonTaxpayers);

  const scatterPoints = teams
    .filter((x) => x.winPct !== null)
    .map((x) => ({
      id: x.abbr,
      x: (x.winPct as number) * 100,
      y: x.payroll / 1e6,
      color: APRON_COLOR[x.apronLevel],
      label: x.name,
      sub: `${x.wins}-${x.losses} · ${moneyM(x.payroll, lang, 1)} · ${t(
        `apron.${x.apronLevel}` as never,
      )}`,
      href: `/teams/${x.slug}`,
    }));

  const topSalaries = allPlayers.slice(0, 10);
  const cpwRows = teams
    .filter((x) => (x.wins ?? 0) > 0)
    .map((tm) => ({ tm, v: tm.payroll / tm.wins! }))
    .sort((a, b) => a.v - b.v);
  const cpwMax = cpwRows.length ? cpwRows[cpwRows.length - 1].v : 1;
  const maxSalary = topSalaries[0]?.capHit ?? 1;

  return (
    <div className="space-y-5">
      {/* ---------------------------------------------------------- hero */}
      <div className="panel relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background: `radial-gradient(720px 260px at 8% -20%, ${top?.color ?? "#f5a524"}55, transparent 65%),
                         radial-gradient(560px 240px at 96% 0%, #f4637a2e, transparent 62%)`,
          }}
        />
        <div className="relative px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="amber">{league.season}</Badge>
            <span className="chip">{t("dash.snapshot", { date: dateLabel(league.rosterSnapshot) })}</span>
            <span className="chip chip-live">{totals.players} {lang === "ja" ? "選手" : "players"}</span>
          </div>
          <div className="kicker mt-4">{t("dash.kicker")}</div>
          <h1 className="mt-1.5 max-w-3xl text-2xl leading-tight font-bold text-chalk sm:text-[2.1rem]">
            {t("app.tagline")}
          </h1>
          <p className="mt-2 max-w-3xl text-[0.85rem] leading-relaxed text-fog">
            {lang === "ja"
              ? `リーグ全体の給与総額は ${moneyBig(totals.payroll, lang)}。${totals.taxpayers} チームがタックスライン（${moneyM(
                  lines.tax,
                  lang,
                  1,
                )}）を超え、推計 ${moneyM(totals.tax, lang, 1)} のラグジュアリータックスが発生します。`
              : `The league is paying out ${moneyBig(totals.payroll, lang)}. ${totals.taxpayers} teams sit above the ${moneyM(
                  lines.tax,
                  lang,
                  1,
                )} tax line for an estimated ${moneyM(totals.tax, lang, 1)} in luxury tax.`}
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------------- stats */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={t("dash.leaguePayroll")} value={moneyBig(totals.payroll, lang)} tone="amber"
          note={`${t("dash.avgPayroll")} ${moneyM(totals.avgPayroll, lang, 1)}`} />
        <Stat label={<Term id="luxtax">{t("dash.taxCollected")}</Term>} value={moneyBig(totals.tax, lang)} tone="rose"
          note={`${lang === "ja" ? "エプロン加算税込み" : "incl. apron surcharges"} ${moneyBig(totals.taxAllIn, lang)}`} />
        <Stat label={t("dash.taxpayers")} value={`${totals.taxpayers} / 30`} tone="rose"
          note={
            <span className="flex flex-wrap items-center gap-x-1">
              <Term id="apron1">{t("th.apron1")}</Term> {totals.apron1} · <Term id="apron2">{t("th.apron2")}</Term> {totals.apron2}
            </span>
          } />
        <Stat label={t("dash.avgSalary")} value={moneyM(totals.avgSalary, lang, 2)}
          note={`${t("dash.medianSalary")} ${moneyM(totals.medianSalary, lang, 2)}`} />
        <Stat label={<Term id="cap">{t("dash.underCap")}</Term>} value={`${totals.underCap}`} tone="cyan"
          note={`${t("th.cap")} ${moneyM(lines.cap, lang, 1)}`} />
        <Stat label={t("dash.taxDistribution")} value={moneyM(perNonTaxpayer, lang, 2)} tone="mint"
          note={`${nonTaxpayers} ${lang === "ja" ? "チームに均等分配" : "teams split it evenly"}`} />
      </div>

      {/* ---------------------------------------------------------- distribution */}
      <Panel
        title={t("dash.distribution")}
        subtitle={t("dash.distributionSub")}
        action={
          <div className="flex overflow-hidden rounded-lg border border-line">
            {(["dollars", "pct"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cls("px-2.5 py-1.5 text-[0.72rem] font-semibold transition", mode === m ? "btn-on" : "text-fog hover:text-chalk")}
              >
                {m === "dollars" ? "USD" : "% of cap"}
              </button>
            ))}
          </div>
        }
      >
        <PayrollBars mode={mode} />
        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          <MiniTeam label={t("dash.highest")} team={top} value={moneyM(top.payroll, lang, 2)} />
          <MiniTeam label={t("dash.lowest")} team={bottom} value={moneyM(bottom.payroll, lang, 2)} />
          <div className="panel-flat px-3.5 py-3">
            <div className="label-xs">{t("dash.spread")}</div>
            <div className="tnum mt-1.5 text-xl font-semibold text-chalk">
              {moneyM(top.payroll - bottom.payroll, lang, 1)}
            </div>
            <div className="mt-1.5 text-[0.7rem] text-fog">
              {lang === "ja"
                ? `${bottom.abbr} の約 ${(top.payroll / bottom.payroll).toFixed(2)} 倍を ${top.abbr} が支出`
                : `${top.abbr} spends ${(top.payroll / bottom.payroll).toFixed(2)}× what ${bottom.abbr} does`}
            </div>
          </div>
        </div>
      </Panel>

      {/* ---------------------------------------------------------- lines + efficiency */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <Panel
          title={t("dash.leagueLines", { season: league.season })}
          subtitle={t("dash.leagueLinesSub")}
        >
          <div className="divide-hair">
            {LINE_KEYS.map((row) => (
              <div key={row.key} className="flex items-start gap-3 py-2.5">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: row.color }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[0.83rem] font-semibold text-chalk">{t(row.key)}</div>
                  {row.note && <div className="mt-0.5 text-[0.71rem] leading-snug text-fog">{t(row.note)}</div>}
                </div>
                <div className="tnum shrink-0 text-right text-[0.92rem] font-semibold text-chalk">
                  {moneyM(lines[row.field], lang, 3).replace(/\.000M$/, "M")}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 text-[0.72rem] sm:grid-cols-3">
            {[
              ["th.mleNonTax", lines.mleNonTax],
              ["th.mleTax", lines.mleTax],
              ["th.roomMle", lines.roomMle],
              ["th.bae", lines.bae],
              ["th.max10", lines.max10],
              ["th.bracket", lines.mleTax],
            ].map(([k, v]) => (
              <div key={k as string} className="panel-flat px-2.5 py-2">
                <div className="label-xs truncate">{t(k as DictKey)}</div>
                <div className="tnum mt-1 font-semibold text-fog-2">{moneyM(v as number, lang, 2)}</div>
              </div>
            ))}
          </div>
          <Link href="/cap-history" className="btn mt-3.5 w-full justify-center">
            {t("nav.capHistory")} →
          </Link>
        </Panel>

        <Panel
          title={t("dash.efficiency")}
          subtitle={t("dash.efficiencySub", { prev: league.prevSeason, season: league.season })}
        >
          <Scatter
            points={scatterPoints}
            xLabel={`${league.prevSeason} win %`}
            yLabel={`${league.season} payroll ($M)`}
            formatX={(v) => `${v.toFixed(0)}%`}
            formatY={(v) => `$${v.toFixed(0)}M`}
            height={330}
          />
        </Panel>
      </div>

      <Panel title={t("dash.cpw")} subtitle={t("dash.cpwSub", { prev: league.prevSeason })}>
        <div className="grid gap-x-6 gap-y-1.5 lg:grid-cols-2">
          {cpwRows.map((r, i) => (
            <div key={r.tm.slug} className="grid grid-cols-[1.4rem_2.6rem_minmax(0,1fr)_auto] items-center gap-2">
              <span className="tnum text-[0.68rem] font-bold text-fog/70">{i + 1}</span>
              <span className="truncate text-xs font-bold text-fog">{r.tm.abbr}</span>
              <span className="block h-2 rounded-full bg-panel-2">
                <span
                  className="bar-glow block h-2 rounded-full"
                  style={{ width: `${Math.max((r.v / cpwMax) * 100, 2)}%`, background: r.tm.color }}
                />
              </span>
              <span className="tnum text-xs font-semibold text-chalk">{moneyM(r.v, lang, 2)}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* ---------------------------------------------------------- top salaries + champion */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Panel
          title={t("dash.topSalaries")}
          subtitle={t("dash.topSalariesSub")}
          action={
            <Link href="/players" className="btn">
              {t("common.viewAll")} →
            </Link>
          }
          dense
        >
          <div className="divide-hair">
            {topSalaries.map((p, i) => (
              <Link
                key={p.id}
                href={`/teams/${p.teamSlug}`}
                className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-white/[0.03] sm:px-5"
              >
                <span className="tnum w-5 shrink-0 text-[0.75rem] font-bold text-fog/70">{i + 1}</span>
                <TeamLogo abbr={p.team} size={20} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[0.86rem] font-semibold text-chalk">{p.name}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[0.7rem] text-fog">
                    <span>{p.teamName}</span>
                    <span className="text-fog/40">·</span>
                    <span>{p.pos}</span>
                    <span className="text-fog/40">·</span>
                    <span className="tnum">{p.age}{lang === "ja" ? "歳" : " yrs"}</span>
                  </div>
                </div>
                <div className="hidden w-28 shrink-0 sm:block">
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${((p.capHit ?? 0) / maxSalary) * 100}%`,
                        background: `linear-gradient(90deg, ${p.teamColor}66, ${p.teamColor})`,
                      }}
                    />
                  </div>
                  <div className="tnum mt-1 text-right text-[0.64rem] text-fog">
                    {pct(p.capShare ?? 0, lang, 1)} {lang === "ja" ? "キャップ比" : "of cap"}
                  </div>
                </div>
                <div className="tnum w-[6.2rem] shrink-0 text-right text-[0.9rem] font-bold text-amber-soft">
                  {moneyM(p.capHit, lang, 2)}
                </div>
              </Link>
            ))}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title={t("dash.playoffResults")} dense>
            <div className="px-4 py-4 sm:px-5">
              <PlayoffResults />
            </div>
          </Panel>
        </div>
      </div>

      {/* ---------------------------------------------------------- awards */}
      <Panel
        title={t("dash.awards", { season: league.prevSeason })}
        subtitle={
          lang === "ja"
            ? "受賞者の今季年俸も合わせて表示。タイトルと給与の相関をチェックできます。"
            : "Each winner's current salary is shown alongside the honour."
        }
        dense
      >
        <div className="grid gap-px bg-line/50 sm:grid-cols-2 lg:grid-cols-4">
          {AWARDS.map((a) => {
            const award = league.awards.list.find((x) => x.key === a.key);
            if (!award) return null;
            const team = teamByAbbrLocal(award.team);
            const player = allPlayers.find((p) => p.name === award.player);
            return (
              <div key={a.key} className="bg-panel px-3.5 py-3">
                <div className="label-xs">{lang === "ja" ? a.ja : a.en}</div>
                <div className="mt-1.5 flex items-center gap-2">
                  {team && <TeamLogo abbr={team.abbr} size={18} />}
                  <span className="truncate text-[0.86rem] font-semibold text-chalk">{award.player}</span>
                </div>
                <div className="tnum mt-1 text-[0.72rem] text-fog">
                  {award.team}
                  {player?.capHit ? ` · ${moneyM(player.capHit, lang, 2)}` : ""}
                  {player?.age ? ` · ${player.age}${lang === "ja" ? "歳" : ""}` : ""}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* ---------------------------------------------------------- movers */}
      <Panel
        title={lang === "ja" ? "前季から最も動かしたチーム" : "Biggest movers vs. last season"}
        subtitle={
          lang === "ja"
            ? `${league.prevSeason} → ${league.season} のキャップ計上額の変化`
            : `Cap payroll change from ${league.prevSeason} to ${league.season}`
        }
        dense
      >
        <div className="grid gap-px bg-line/50 sm:grid-cols-2 lg:grid-cols-3">
          {[...teams]
            .filter((x) => x.payrollDelta !== null)
            .sort((a, b) => Math.abs(b.payrollDelta ?? 0) - Math.abs(a.payrollDelta ?? 0))
            .slice(0, 6)
            .map((team) => (
              <Link
                key={team.slug}
                href={`/teams/${team.slug}`}
                className="flex items-center gap-3 bg-panel px-3.5 py-3 transition hover:bg-panel-2"
              >
                <TeamLogo abbr={team.abbr} size={26} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[0.84rem] font-semibold text-chalk">{team.name}</div>
                  <div className="tnum mt-0.5 text-[0.7rem] text-fog">
                    {moneyM(team.prevPayroll, lang, 1)} → {moneyM(team.payroll, lang, 1)}
                  </div>
                </div>
                <div
                  className={cls(
                    "tnum shrink-0 text-[0.85rem] font-bold",
                    (team.payrollDelta ?? 0) > 0 ? "text-up" : "text-down",
                  )}
                >
                  {deltaM(team.payrollDelta, lang)}
                </div>
              </Link>
            ))}
        </div>
      </Panel>
    </div>
  );
}

function MiniTeam({
  label,
  team,
  value,
}: {
  label: string;
  team: (typeof league.teams)[number];
  value: string;
}) {
  const { t, lang } = useLang();
  return (
    <Link href={`/teams/${team.slug}`} className="panel-flat px-3.5 py-3 transition hover:border-amber/40">
      <div className="label-xs">{label}</div>
      <div className="mt-1.5 flex items-center gap-2">
        <TeamLogo abbr={team.abbr} size={22} />
        <span className="truncate text-[0.86rem] font-semibold text-chalk">{team.name}</span>
      </div>
      <div className="tnum mt-1.5 text-xl font-semibold" style={{ color: APRON_COLOR[team.apronLevel] }}>
        {value}
      </div>
      <div className="mt-1 text-[0.7rem] text-fog">
        {pct(team.capShare, lang, 1)} {t("team.capShare").toLowerCase()} · {team.wins}-{team.losses}
      </div>
    </Link>
  );
}

function teamByAbbrLocal(abbr: string) {
  return league.teams.find((x) => x.abbr === abbr);
}
