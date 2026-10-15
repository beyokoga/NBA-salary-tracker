"use client";

import { useMemo, useState } from "react";
import { allPlayers, league } from "@/lib/data";
import { useLang } from "@/i18n";
import type { DictKey } from "@/i18n";
import { int, moneyM } from "@/lib/format";

type Vars = { team?: string; player?: string; value?: number; n?: number; dec?: number };
type Q = {
  key: DictKey;
  vars: Vars;
  choices: string[];
  answer: number;
  xKey: DictKey;
  xVars: Vars;
};

function shuffle<T>(arr: T[]): T[] {
  const r = arr.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
const pick = <T,>(arr: T[], n: number): T[] => shuffle(arr).slice(0, n);

function buildQuiz(): Q[] {
  const teams = league.teams.slice().sort((a, b) => a.rank - b.rank);
  const taxpayers = teams.filter((t) => t.apronLevel !== "belowTax" || t.overTax > 0);
  const withWins = teams.filter((t) => (t.wins ?? 0) > 0);
  const cpwSorted = withWins.slice().sort((a, b) => a.payroll / a.wins! - b.payroll / b.wins!);
  const expSorted = teams.slice().sort((a, b) => b.expiringSalary - a.expiringSalary);
  const deadSorted = teams.slice().sort((a, b) => b.deadCap + b.capHolds - (a.deadCap + a.capHolds));
  const topPlayers = allPlayers.slice().sort((a, b) => (b.salary ?? 0) - (a.salary ?? 0)).slice(0, 8);
  const apron2 = teams.filter((t) => t.apronLevel === "second");
  const qs: Q[] = [];

  const abbrQ = (
    correct: string,
    pool: string[],
    key: DictKey,
    vars: Vars,
    xKey: DictKey,
    xVars: Vars,
  ): Q => {
    const wrong = pick(pool.filter((p) => p !== correct), 3);
    const choices = shuffle([correct, ...wrong]);
    return { key, vars, choices, answer: choices.indexOf(correct), xKey, xVars };
  };
  const numQ = (correct: number, dummies: number[], key: DictKey, vars: Vars, xKey: DictKey, xVars: Vars): Q => {
    const choices = shuffle([correct, ...dummies].slice(0, 4)).map(String);
    return { key, vars, choices, answer: choices.indexOf(String(correct)), xKey, xVars };
  };

  // 1: highest payroll
  qs.push(abbrQ(teams[0].abbr, teams.slice(1, 9).map((t) => t.abbr), "quiz.q.topPayroll", {}, "quiz.x.payroll", { team: teams[0].abbr, value: teams[0].payroll }));
  // 2: rank of a random top team
  {
    const tm = pick(teams.slice(0, 15), 1)[0];
    const d = new Set<number>([tm.rank]);
    while (d.size < 4) {
      const v = tm.rank + pick([-4, -3, -2, -1, 1, 2, 3, 4], 1)[0];
      if (v >= 1 && v <= 30) d.add(v);
    }
    qs.push(numQ(tm.rank, [...d].filter((x) => x !== tm.rank), "quiz.q.teamRank", { team: tm.abbr }, "quiz.x.rank", { team: tm.abbr, n: tm.rank }));
  }
  // 3: which team at rank N
  {
    const r = 1 + Math.floor(Math.random() * 15);
    const tm = teams[r - 1];
    qs.push(abbrQ(tm.abbr, teams.slice(0, 15).filter((t) => t.slug !== tm.slug).map((t) => t.abbr), "quiz.q.rankTeam", { n: r }, "quiz.x.payroll", { team: tm.abbr, value: tm.payroll }));
  }
  // 4: tax amount of a random taxpayer
  {
    const pool = taxpayers.filter((t) => t.taxEstimate > 0);
    const tm = pick(pool, 1)[0];
    const fmt = (v: number, dec = 1) => moneyM(v, "en", dec);
    const seen = new Set([fmt(tm.taxEstimate)]);
    const vals = [tm.taxEstimate];
    for (const o of shuffle(pool.filter((x) => x.slug !== tm.slug))) {
      if (vals.length >= 4) break;
      const label = fmt(o.taxEstimate);
      if (!seen.has(label)) {
        seen.add(label);
        vals.push(o.taxEstimate);
      }
    }
    for (const o of shuffle(pool.filter((x) => x.slug !== tm.slug && !vals.includes(x.taxEstimate)))) {
      if (vals.length >= 4) break;
      const label = fmt(o.taxEstimate, 2);
      if (!seen.has(label)) {
        seen.add(label);
        vals.push(o.taxEstimate);
      }
    }
    const dec = vals.length >= 4 ? 1 : 2;
    const choices = shuffle(vals.map((v) => fmt(v, dec)));
    qs.push({ key: "quiz.q.tax", vars: { team: tm.abbr }, choices, answer: choices.indexOf(fmt(tm.taxEstimate, dec)), xKey: "quiz.x.tax", xVars: { team: tm.abbr, value: tm.taxEstimate } });
  }
  // 5: top salary player
  {
    const top = topPlayers[0];
    qs.push(abbrQ(top.name, topPlayers.slice(1).map((p) => p.name), "quiz.q.topPlayer", {}, "quiz.x.player", { player: top.name, value: top.salary ?? 0 }));
  }
  // 6: taxpayers count
  {
    const n = league.totals.taxpayers;
    qs.push(numQ(n, [n - 2, n + 1, n + 3], "quiz.q.taxpayers", {}, "quiz.x.taxpayers", { n }));
  }
  // 7: most efficient (cost per win)
  {
    const tm = cpwSorted[0];
    qs.push(abbrQ(tm.abbr, cpwSorted.slice(1, 9).map((t) => t.abbr), "quiz.q.cpw", {}, "quiz.x.cpw", { team: tm.abbr, value: tm.payroll / tm.wins!, dec: 2 }));
  }
  // 8: most expiring salary
  {
    const tm = expSorted[0];
    qs.push(abbrQ(tm.abbr, expSorted.slice(1, 9).map((t) => t.abbr), "quiz.q.expiring", {}, "quiz.x.expiring", { team: tm.abbr, value: tm.expiringSalary }));
  }
  // 9: most dead money
  {
    const tm = deadSorted[0];
    qs.push(abbrQ(tm.abbr, deadSorted.slice(1, 9).map((t) => t.abbr), "quiz.q.dead", {}, "quiz.x.dead", { team: tm.abbr, value: tm.deadCap + tm.capHolds }));
  }
  // 10: second-apron team
  if (apron2.length) {
    const tm = apron2[0];
    qs.push(abbrQ(tm.abbr, teams.slice(0, 12).filter((t) => t.slug !== tm.slug).map((t) => t.abbr), "quiz.q.apron2", {}, "quiz.x.apron2", { team: tm.abbr }));
  } else {
    const tm = expSorted[1];
    qs.push(abbrQ(tm.abbr, expSorted.slice(2, 10).map((t) => t.abbr), "quiz.q.expiring", {}, "quiz.x.expiring", { team: tm.abbr, value: tm.expiringSalary }));
  }
  return qs;
}

export function QuizView() {
  const { t, lang } = useLang();
  const [gen, setGen] = useState(0);
  const qs = useMemo(() => {
    void gen; // regeneration trigger for replay
    return buildQuiz();
  }, [gen]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setGen((g) => g + 1);
    setIdx(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  };

  const fmtVars = (v: Vars): Record<string, string | number> => {
    const out: Record<string, string | number> = {};
    if (v.team) out.team = v.team;
    if (v.player) out.player = v.player;
    if (v.n != null) out.n = int(v.n, lang);
    if (v.value != null) out.value = moneyM(v.value, lang, v.dec ?? 1);
    return out;
  };

  const share = async () => {
    const text = `${t("quiz.shareText", { s: int(score, lang), n: int(qs.length, lang) })} ${window.location.origin}/?tab=quiz`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const q = qs[Math.min(idx, qs.length - 1)];

  return (
    <div className="space-y-4">
      <div className="panel flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight sm:text-xl">{t("quiz.title")}</h1>
          <p className="mt-1 text-xs leading-relaxed text-fog">{t("quiz.sub")}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <span className="chip">
            {t("quiz.progress", { q: int(Math.min(idx + 1, qs.length), lang), n: int(qs.length, lang) })}
          </span>
          <span className="chip chip-live">
            {t("quiz.score")}: {int(score, lang)}
          </span>
        </div>
      </div>

      {!done ? (
        <div className="panel space-y-4 p-4 sm:p-5">
          <h2 className="text-sm font-bold leading-relaxed sm:text-base">{t(q.key, fmtVars(q.vars))}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {q.choices.map((c, i) => {
              const isCorrect = i === q.answer;
              const isPicked = picked === i;
              const state =
                picked == null
                  ? "border-line bg-panel-2 hover:border-amber/60"
                  : isCorrect
                    ? "border-mint/70 bg-mint/10"
                    : isPicked
                      ? "border-rose/70 bg-rose/10"
                      : "border-line/60 bg-panel-2/40 opacity-60";
              return (
                <button
                  key={i}
                  type="button"
                  disabled={picked != null}
                  onClick={() => {
                    setPicked(i);
                    if (isCorrect) setScore((s) => s + 1);
                  }}
                  className={`rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold transition ${state}`}
                >
                  {c}
                </button>
              );
            })}
          </div>
          {picked != null && (
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-fog">
                <span className="font-bold text-amber-soft">{t("quiz.answer")}: </span>
                {t(q.xKey, fmtVars(q.xVars))}
              </p>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  if (idx + 1 >= qs.length) setDone(true);
                  else {
                    setIdx((i) => i + 1);
                    setPicked(null);
                  }
                }}
              >
                {idx + 1 >= qs.length ? t("quiz.toResult") : t("quiz.next")} →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="panel space-y-4 p-5 text-center sm:p-8">
          <div className="font-display text-6xl font-black text-amber">
            {int(score, lang)}
            <span className="text-2xl text-fog"> / {int(qs.length, lang)}</span>
          </div>
          <p className="text-sm font-semibold text-chalk">
            {score / qs.length >= 0.8 ? t("quiz.msgGreat") : score / qs.length >= 0.5 ? t("quiz.msgGood") : t("quiz.msgBad")}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className="btn" onClick={reset}>
              {t("quiz.replay")}
            </button>
            <button type="button" className="btn" onClick={share}>
              {copied ? t("quiz.copied") : t("quiz.share")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
