"use client";

import Link from "next/link";
import { league, teamByAbbr } from "@/lib/data";
import { cls } from "@/lib/format";
import { useLang } from "@/i18n";
import { TeamLogo } from "./TeamLogo";

const ROUND_LABELS = {
  firstRound: { ja: "1回戦", en: "First round" },
  confSemis: { ja: "カンファレンス準決勝", en: "Conference semifinals" },
  confFinals: { ja: "カンファレンス決勝", en: "Conference finals" },
  finals: { ja: "ファイナル", en: "NBA Finals" },
} as const;

/** Compact 2025-26 postseason bracket with payroll context for each team. */
export function PlayoffResults() {
  const { t, lang } = useLang();
  const po = league.playoffs;
  const champion = teamByAbbr(po.champion);
  const runnerUp = teamByAbbr(po.runnerUp);

  return (
    <div className="space-y-5">
      {/* finals banner */}
      {champion && runnerUp && (
        <div className="panel-flat relative overflow-hidden px-4 py-4">
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{ background: `radial-gradient(420px 160px at 18% 0%, ${champion.color}, transparent 70%)` }}
          />
          <div className="relative flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-center gap-2.5">
              <TeamLogo abbr={champion.abbr} size={38} />
              <div>
                <div className="label-xs">{t("dash.champion", { season: po.season })}</div>
                <div className="text-[1.02rem] font-bold text-chalk">{champion.name}</div>
              </div>
            </div>
            <div className="tnum rounded-lg border border-amber/40 bg-amber/10 px-3 py-1.5 text-sm font-bold text-amber-soft">
              {po.finals.series}
            </div>
            <div className="flex items-center gap-2.5 opacity-90">
              <TeamLogo abbr={runnerUp.abbr} size={30} />
              <div>
                <div className="label-xs">{runnerUp.name}</div>
                <div className="text-[0.78rem] text-fog">
                  {t("result.finals")} · {runnerUp.wins}-{runnerUp.losses}
                </div>
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className="label-xs">{t("dash.finalsMvp")}</div>
              <div className="text-[0.9rem] font-semibold text-chalk">{po.finalsMvp.name}</div>
            </div>
          </div>
          <div className="relative mt-3 flex flex-wrap gap-1.5">
            {po.finals.games.map((g) => {
              const awayWon = g.awayScore > g.homeScore;
              return (
                <span
                  key={g.n}
                  className="tnum rounded-md border border-line bg-panel-2/60 px-2 py-1 text-[0.68rem] text-fog-2"
                >
                  <span className={cls("font-bold", awayWon ? "text-mint" : "text-fog")}>{g.away} {g.awayScore}</span>
                  <span className="mx-1 text-fog/50">@</span>
                  <span className={cls("font-bold", !awayWon ? "text-mint" : "text-fog")}>{g.home} {g.homeScore}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* rounds */}
      <div className="grid gap-4 lg:grid-cols-3">
        {[...po.rounds].reverse().map((round, idx) => (
          <div key={round.name}>
            <div className="label-xs mb-2">
              {ROUND_LABELS[round.name as keyof typeof ROUND_LABELS]?.[lang] ?? round.name}
              {idx === 0 && ` · ${po.season}`}
            </div>
            <div className="space-y-1.5">
              {round.series.map((s) => {
                const w = teamByAbbr(s.winner);
                const l = teamByAbbr(s.loser);
                if (!w || !l) return null;
                return (
                  <div
                    key={`${round.name}-${s.winner}-${s.loser}`}
                    className="rounded-lg border border-line/70 bg-panel/50 px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="tnum w-4 shrink-0 text-[0.64rem] text-fog/70">{s.winnerSeed}</span>
                      <Link href={`/teams/${w.slug}`} className="flex min-w-0 items-center gap-1.5">
                        <TeamLogo abbr={w.abbr} size={15} />
                        <span className="truncate text-[0.78rem] font-semibold text-chalk">{w.abbr}</span>
                      </Link>
                      <span className="tnum ml-auto rounded bg-mint/15 px-1.5 text-[0.68rem] font-bold text-mint">
                        {s.result.split("-")[0]}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="tnum w-4 shrink-0 text-[0.64rem] text-fog/70">{s.loserSeed}</span>
                      <Link href={`/teams/${l.slug}`} className="flex min-w-0 items-center gap-1.5">
                        <TeamLogo abbr={l.abbr} size={15} />
                        <span className="truncate text-[0.78rem] text-fog">{l.abbr}</span>
                      </Link>
                      <span className="tnum ml-auto px-1.5 text-[0.68rem] text-fog/70">{s.result.split("-")[1]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
