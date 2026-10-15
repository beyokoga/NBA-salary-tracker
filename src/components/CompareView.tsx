"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { league } from "@/lib/data";
import { useLang } from "@/i18n";
import { int, moneyM, record as fmtRecord } from "@/lib/format";
import type { TeamSummary } from "@/lib/types";
import { StatusBadge } from "./TeamsView";

const MAX = 3;
const DEFAULT_SLUGS = ["golden-state-warriors", "new-york-knicks"];

export function CompareView() {
  const router = useRouter();
  const params = useSearchParams();
  const { t, lang } = useLang();
  const teams = league.teams;
  const bySlug = useMemo(() => new Map(teams.map((x) => [x.slug, x])), [teams]);

  const sel = useMemo(() => {
    const raw = [...new Set((params.get("teams") ?? "").split(",").filter((s) => bySlug.has(s)))].slice(0, MAX);
    return raw.length ? raw : DEFAULT_SLUGS.filter((s) => bySlug.has(s));
  }, [params, bySlug]);

  const payRank = useMemo(() => {
    const m = new Map<string, number>();
    teams.slice().sort((a, b) => b.payroll - a.payroll).forEach((tm, i) => m.set(tm.slug, i + 1));
    return m;
  }, [teams]);
  const picked = sel.map((s) => bySlug.get(s)!);

  const setTeams = (next: string[]) => {
    router.replace(`/?tab=compare&teams=${next.join(",")}`);
  };
  const changeAt = (i: number, slug: string) => {
    const next = sel.slice();
    if (next.includes(slug)) return;
    next[i] = slug;
    setTeams(next);
  };
  const removeAt = (i: number) => setTeams(sel.filter((_, j) => j !== i));
  const addTeam = () => {
    const used = new Set(sel);
    const nextSlug = teams.find((x) => !used.has(x.slug))?.slug;
    if (nextSlug) setTeams([...sel, nextSlug]);
  };

  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = `${window.location.origin}/?tab=compare&teams=${sel.join(",")}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const seasons = useMemo(() => {
    const cur = league.season;
    const keys = new Set<string>();
    picked.forEach((tm) => Object.keys(tm.scheduled ?? {}).forEach((k) => keys.add(k)));
    return [...keys].filter((k) => k !== cur).sort().slice(0, 4);
  }, [picked]);

  return (
    <div className="space-y-4">
      {/* header + picker */}
      <div className="panel space-y-3.5 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight sm:text-xl">{t("compare.title")}</h1>
            <p className="mt-1 text-xs leading-relaxed text-fog">{t("compare.sub")}</p>
          </div>
          <button type="button" className="btn shrink-0" onClick={share}>
            {copied ? t("compare.copied") : t("compare.share")}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sel.map((slug, i) => (
            <span key={i} className="flex items-center gap-1 rounded-lg border border-line bg-panel-2 py-1 pl-2 pr-1">
              <select
                aria-label={`${t("compare.team")} ${i + 1}`}
                value={slug}
                onChange={(e) => changeAt(i, e.target.value)}
                className="max-w-[46vw] bg-transparent text-sm font-semibold outline-none sm:max-w-none"
              >
                {teams.map((o) => (
                  <option key={o.slug} value={o.slug} className="bg-panel text-chalk">
                    {o.abbr} · {o.name}
                  </option>
                ))}
              </select>
              {sel.length > 2 && (
                <button
                  type="button"
                  aria-label={t("compare.remove")}
                  onClick={() => removeAt(i)}
                  className="grid h-6 w-6 place-items-center rounded-md text-fog transition hover:bg-panel hover:text-rose"
                >
                  ×
                </button>
              )}
            </span>
          ))}
          {sel.length < MAX && (
            <button type="button" className="btn" onClick={addTeam}>
              {t("compare.add")}
            </button>
          )}
        </div>
      </div>

      {/* team header cards */}
      <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        {picked.map((tm) => (
          <div key={tm.slug} className="panel space-y-2 p-3.5">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tm.logo} alt="" className="h-9 w-9 shrink-0" />
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{tm.abbr}</div>
                <div className="truncate text-[11px] text-fog">
                  {tm.city} {tm.nickname}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge level={tm.apronLevel} repeater={tm.repeater} />
              <span className="chip">
                {t("compare.rank")} #{int(payRank.get(tm.slug) ?? tm.rank, lang)}
              </span>
            </div>
            <div className="space-y-0.5 border-t border-line/70 pt-2 text-[11px] text-fog">
              <div className="flex justify-between gap-2">
                <span className="truncate">{t("compare.record")}</span>
                <span className="tnum shrink-0 font-semibold text-chalk">
                  {tm.wins != null ? fmtRecord(tm.wins, tm.losses) : "—"}
                  {tm.confSeed ? ` (${int(tm.confSeed, lang)})` : ""}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="truncate">{t("compare.top")}</span>
                <span className="tnum shrink-0 font-semibold text-chalk">
                  {moneyM(tm.topSalary, lang)} {tm.topPlayer.split(" ").slice(-1)[0]}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* metric panels */}
      <MetricPanel title={t("compare.payroll")} rows={picked.map((tm) => ({ tm, value: tm.payroll, sub: `#${int(payRank.get(tm.slug) ?? tm.rank, lang)} / ${int(teams.length, lang)}` }))} lang={lang} />
      <MetricPanel
        title={t("compare.tax")}
        rows={picked.map((tm) => ({ tm, value: tm.taxEstimate, sub: `${t("compare.allIn")} ${moneyM(tm.taxAllIn, lang)}` }))}
        lang={lang}
      />
      <div className="grid gap-2.5 lg:grid-cols-2">
        <MetricPanel
          title={t("compare.expiring")}
          rows={picked.map((tm) => ({ tm, value: tm.expiringSalary, sub: `${int(tm.expiringCount, lang)} ${t("compare.contracts")}` }))}
          lang={lang}
        />
        <MetricPanel
          title={t("compare.dead")}
          rows={picked.map((tm) => ({ tm, value: tm.deadCap + tm.capHolds, sub: `${t("compare.holds")} ${moneyM(tm.capHolds, lang)}` }))}
          lang={lang}
        />
      </div>
      <MetricPanel
        title={t("compare.cpw")}
        rows={picked.map((tm) => ({
          tm,
          value: tm.wins ? tm.payroll / tm.wins : 0,
          sub: tm.wins != null ? fmtRecord(tm.wins, tm.losses) : "—",
          dec: 2,
        }))}
        lang={lang}
      />

      {/* future committed payroll */}
      <div className="panel p-4 sm:p-5">
        <h2 className="text-sm font-bold">{t("compare.future")}</h2>
        <p className="mt-0.5 text-[11px] text-fog">{t("compare.futureSub")}</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[430px] text-sm">
            <thead>
              <tr className="text-[11px] text-fog">
                <th className="pb-1.5 text-left font-medium">{t("compare.team")}</th>
                {seasons.map((s) => (
                  <th key={s} className="tnum pb-1.5 text-right font-medium">
                    {s.slice(2, 4)}-{s.slice(5)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-hair">
              {picked.map((tm) => (
                <tr key={tm.slug}>
                  <td className="flex items-center gap-2 py-2 font-semibold">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={tm.logo} alt="" className="h-5 w-5" />
                    {tm.abbr}
                  </td>
                  {seasons.map((s) => {
                    const v = tm.scheduled?.[s] ?? 0;
                    const max = Math.max(...picked.map((x) => x.scheduled?.[s] ?? 0), 1);
                    return (
                      <td key={s} className="py-2 pl-3 text-right">
                        <span className="tnum font-semibold">{v ? moneyM(v, lang, 0) : "—"}</span>
                        <span className="mt-1 block h-1 rounded-full bg-panel-2">
                          <span className="bar-glow block h-1 rounded-full" style={{ width: `${(v / max) * 100}%`, background: tm.color }} />
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricPanel({
  title,
  rows,
  lang,
}: {
  title: string;
  rows: { tm: TeamSummary; value: number; sub?: string; dec?: number }[];
  lang: "ja" | "en";
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="panel p-4 sm:p-5">
      <h2 className="text-sm font-bold">{title}</h2>
      <div className="mt-3 space-y-2.5">
        {rows.map(({ tm, value, sub, dec }) => (
          <div key={tm.slug} className="grid grid-cols-[2.6rem_1fr_auto] items-center gap-2.5 sm:grid-cols-[3.2rem_1fr_auto]">
            <span className="truncate text-xs font-bold text-fog">{tm.abbr}</span>
            <span className="min-w-0">
              <span className="block h-2.5 rounded-full bg-panel-2">
                <span
                  className="bar-glow block h-2.5 rounded-full transition-all"
                  style={{ width: `${Math.max((value / max) * 100, 2)}%`, background: tm.color }}
                />
              </span>
              {sub && <span className="mt-0.5 block truncate text-[10px] text-fog">{sub}</span>}
            </span>
            <span className="tnum text-right text-sm font-bold" style={{ color: value === max ? tm.color : undefined }}>
              {value ? moneyM(value, lang, dec ?? 1) : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
