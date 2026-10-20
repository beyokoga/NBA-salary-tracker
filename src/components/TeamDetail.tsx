"use client";

import Link from "next/link";
import { league as leagueData } from "@/lib/data";
import { cls, dateLabel, deltaM, money, moneyM, pct, record as rec } from "@/lib/format";
import { APRON_RESTRICTIONS } from "@/lib/tax";
import { useLang } from "@/i18n";
import type { DictKey } from "@/i18n";
import type { LeagueDoc, OptionKind, PlayerContract, TeamDetail as Team, TeamRecord, TeamSummary } from "@/lib/types";
import { Badge, Panel, Stat } from "./ui";
import { TeamLogo } from "./TeamLogo";
import { SortableTable, type Column } from "./SortableTable";
import { ThresholdBar } from "./charts/ThresholdBar";
import { LineChart } from "./charts/LineChart";
import { APRON_COLOR } from "./charts/PayrollBars";
import { PlayerDetailGrid } from "./PlayerDetailGrid";
import { StatusBadge } from "./TeamsView";
import { Term } from "./Term";
import { FavoriteButton, FavoritesStorageNotice } from "./FavoriteButton";

const OPTION_LABEL: Record<OptionKind, DictKey> = {
  expiring: "fa.expiring",
  playerOption: "fa.playerOption",
  teamOption: "fa.teamOption",
  mutual: "fa.playerOption",
  eto: "fa.eto",
  nonGuaranteed: "fa.nonGuaranteed",
};

const RESULT_LABEL: Record<string, DictKey> = {
  champion: "result.champion",
  finals: "result.finals",
  confFinals: "result.confFinals",
  confSemis: "result.confSemis",
  firstRound: "result.firstRound",
  missed: "result.missed",
};

export function TeamDetail({ team, lg }: { team: Team; lg: LeagueDoc }) {
  const { t, lang } = useLang();
  const lines = lg.lines;
  const record: TeamRecord | null =
    team.record && "wins" in team.record ? (team.record as TeamRecord) : null;
  const hasRecord = Boolean(record);

  const rivals = lg.teams.filter((x) => x.division === team.division && x.abbr !== team.abbr);
  const maxRivalPayroll = Math.max(...rivals.map((r) => r.payroll), team.payroll);

  const rosterColumns: Column<PlayerContract>[] = [
    {
      key: "name",
      header: t("common.player"),
      sortValue: (p) => p.name,
      render: (p) => (
        <span className="flex max-w-[10rem] items-center gap-2 sm:max-w-none">
          <span className="min-w-0">
            <span className="block truncate text-[0.86rem] font-semibold text-chalk">{p.name}</span>
            <span className="block text-[0.68rem] text-fog">
              {[p.pos, p.age ? `${p.age}${lang === "ja" ? "歳" : ""}` : null, p.height].filter(Boolean).join(" · ")}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: "salary",
      header: t("pos.salary", { season: team.season }),
      align: "right",
      sortValue: (p) => p.salary,
      render: (p) => (
        <span className="block">
          <span className="tnum block text-[0.86rem] font-bold text-chalk">{money(p.salary, lang)}</span>
          {p.salaryDelta ? (
            <span className={cls("tnum block text-[0.66rem]", p.salaryDelta > 0 ? "text-up" : "text-down")}>
              {p.salaryDelta > 0 ? "+" : "−"}
              {money(Math.abs(p.salaryDelta), lang)}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "capHit",
      header: t("pos.capHit"),
      align: "right",
      hideBelow: "xl",
      sortValue: (p) => p.capHit,
      render: (p) => (p.capHit !== p.salary ? <span className="text-fog-2">{money(p.capHit, lang)}</span> : <span className="text-fog/40">=</span>),
    },
    {
      key: "teamShare",
      header: t("pos.payrollShare"),
      align: "right",
      hideBelow: "md",
      sortValue: (p) => p.teamShare,
      render: (p) => (
        <span className="block min-w-[5.5rem]">
          <span className="tnum block text-[0.82rem] text-fog-2">{pct(p.teamShare, lang, 1)}</span>
          <span className="bar-track mt-1 block" style={{ height: 4 }}>
            <span className="bar-fill" style={{ width: `${Math.min(100, p.teamShare ?? 0) * 2}%`, background: team.color }} />
          </span>
        </span>
      ),
    },
    {
      key: "capShare",
      header: t("pos.capShare"),
      align: "right",
      hideBelow: "xl",
      sortValue: (p) => p.capShare,
      render: (p) => <span className={cls((p.capShare ?? 0) > 25 ? "text-amber-soft" : "text-fog-2")}>{pct(p.capShare, lang, 2)}</span>,
    },
    {
      key: "through",
      header: t("pos.contractThrough"),
      align: "right",
      hideBelow: "sm",
      sortValue: (p) => p.contractThrough,
      render: (p) => (
        <span className="block text-right">
          <span className="tnum block text-[0.8rem] text-fog-2">{p.contractThrough}</span>
          {p.optionKind !== "expiring" && (
            <Badge tone={p.optionKind === "playerOption" ? "cyan" : p.optionKind === "teamOption" ? "violet" : "amber"}>
              {t(OPTION_LABEL[p.optionKind])}
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: "value",
      header: t("pos.contractValue"),
      align: "right",
      hideBelow: "lg",
      sortValue: (p) => p.contractValue,
      render: (p) => (
        <span className="block">
          <span className="tnum block text-[0.82rem] text-fog-2">{p.contractValue ? moneyM(p.contractValue, lang, 1) : "—"}</span>
          {p.guaranteed !== null && p.contractValue && p.guaranteed !== p.contractValue && (
            <span className="tnum block text-[0.66rem] text-fog">
              {lang === "ja" ? "保証" : "guar."} {moneyM(p.guaranteed, lang, 1)}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "career",
      header: t("pos.careerEarnings"),
      align: "right",
      hideBelow: "xl",
      sortValue: (p) => p.careerEarnings,
      render: (p) => <span className="text-fog">{p.careerEarnings ? moneyM(p.careerEarnings, lang, 1) : "—"}</span>,
    },
  ];

  const futureColumns: Column<{ label: string; player: string; pos: string | null; cells: { amount: number | null; option: string | null }[] }>[] = [
    {
      key: "player",
      header: t("common.player"),
      sortValue: (r) => r.player,
      render: (r) => (
        <span className="whitespace-nowrap text-[0.82rem] text-fog-2">
          {r.player} <span className="text-[0.68rem] text-fog/70">{r.pos}</span>
        </span>
      ),
    },
    ...team.futureYears.map((year, idx) => ({
      key: year,
      header: year,
      align: "right" as const,
      hideBelow: (idx > 2 ? "xl" : idx > 1 ? "lg" : undefined) as Column<never>["hideBelow"],
      sortValue: (r: { cells: { amount: number | null }[] }) => r.cells[idx]?.amount ?? null,
      render: (r: { cells: { amount: number | null; option: string | null }[] }) => {
        const cell = r.cells[idx];
        if (!cell?.amount) return <span className="text-fog/30">—</span>;
        return (
          <span className="block">
            <span className="tnum block text-[0.8rem] text-chalk">{moneyM(cell.amount, lang, 2)}</span>
            {cell.option && (
              <span
                className={cls(
                  "tnum inline-block rounded px-1 text-[0.6rem] font-bold",
                  cell.option === "PO" ? "bg-cyan/15 text-cyan" : "bg-violet/15 text-violet",
                )}
              >
                {cell.option}
              </span>
            )}
          </span>
        );
      },
    })),
  ];

  const contractCounts = team.futureYears.map((year, idx) => ({
    year,
    all: team.futureRows.filter((r) => (r.cells[idx]?.amount ?? 0) > 0).length,
    firm: team.futureRows.filter((r) => (r.cells[idx]?.amount ?? 0) > 0 && r.cells[idx]?.option !== "PO").length,
    total: team.scheduled[year] ?? 0,
    firmTotal: team.scheduledGuaranteed[year] ?? 0,
  }));
  const maxCount = Math.max(...contractCounts.map((c) => c.all), 1);

  return (
    <div className="space-y-5">
      <FavoritesStorageNotice />
      {/* ------------------------------------------------------------ hero */}
      <div className="panel relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(760px 300px at 6% -30%, ${team.color}66, transparent 62%),
                         radial-gradient(520px 260px at 100% 0%, ${team.color}22, transparent 60%)`,
          }}
        />
        <div className="relative flex flex-wrap items-start gap-4 px-4 py-5 sm:px-6 sm:py-6">
          <TeamLogo abbr={team.abbr} size={76} priority className="drop-shadow-[0_6px_18px_rgba(0,0,0,0.6)]" />
          <div className="min-w-0 flex-1">
            <div className="mb-3">
              <FavoriteButton kind="teams" favoriteKey={team.slug} name={team.name} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="amber">{team.season}</Badge>
              <span className="chip">
                {team.conference === "Eastern" ? (lang === "ja" ? "イースタン" : "Eastern") : lang === "ja" ? "ウェスタン" : "Western"}
                {" · "}
                {team.division}
              </span>
              <span className="chip">{t("detail.leagueRank", { rank: team.rank })}</span>
            </div>
            <h1 className="mt-2 text-2xl leading-tight font-bold text-chalk sm:text-[2.1rem]">{team.name}</h1>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="tnum text-3xl font-bold" style={{ color: APRON_COLOR[team.apronLevel] }}>
                {moneyM(team.payroll, lang, 2)}
              </span>
              <span className="text-[0.82rem] text-fog">
                {pct(team.capShare, lang, 1)} {t("team.capShare").toLowerCase()}
              </span>
              {team.payrollDelta !== null && (
                <span className={cls("tnum text-[0.82rem] font-semibold", team.payrollDelta > 0 ? "text-up" : "text-down")}>
                  {deltaM(team.payrollDelta, lang, 2)} {t("common.vsPrev")}
                </span>
              )}
              <StatusBadge level={team.apronLevel} repeater={team.repeater} />
            </div>
          </div>
          {hasRecord && (
            <div className="panel-flat w-full px-3.5 py-3 sm:w-auto sm:min-w-[11rem]">
              <div className="label-xs">{t("detail.recordTitle", { season: lg.prevSeason })}</div>
              <div className="tnum mt-1 text-2xl font-bold text-chalk">
                {rec(record!.wins, record!.losses)}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.72rem] text-fog">
                {record?.confSeed && (
                  <span className="chip">
                    {lang === "ja" ? "第" : "#"}
                    {record.confSeed}
                    {lang === "ja" ? "シード" : " seed"}
                  </span>
                )}
                {record?.result && (
                  <Badge tone={record.result === "champion" ? "mint" : "neutral"}>
                    {t(RESULT_LABEL[record.result] ?? "result.missed")}
                  </Badge>
                )}
              </div>
              <div className="tnum mt-1.5 text-[0.7rem] text-fog">
                {record?.ppg.toFixed(1)} {lang === "ja" ? "得点" : "ppg"} ·{" "}
                {record?.opppg.toFixed(1)} {lang === "ja" ? "失点" : "opp"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------ stats */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={t("detail.activePayroll")} value={moneyM(team.payrollActive, lang, 2)} tone="amber"
          note={`${team.rosterCount} ${lang === "ja" ? "件のスタンダード契約" : "standard contracts"}`} />
        <Stat label={<Term id="deadcap">{t("team.deadCap")}</Term>} value={team.deadCap ? moneyM(team.deadCap, lang, 2) : "$0"} tone={team.deadCap ? "rose" : "default"}
          note={lang === "ja" ? "放出済選手に残るキャップ計上" : "Cap charges for waived players"} />
        <Stat label={<Term id="caphold">{t("team.capHolds")}</Term>} value={team.capHolds ? moneyM(team.capHolds, lang, 2) : "$0"}
          note={lang === "ja" ? "未契約FAの権利保持枠" : "Unsigned free-agent holds"} />
        <Stat label={t("team.top3Share")} value={pct(team.top3Share, lang, 1)} tone="cyan"
          note={lang === "ja" ? "上位3人でチーム年俸のこの割合" : "Share of payroll held by the top three"} />
        <Stat label={t("team.taxEstimate")} value={moneyM(team.tax.bracketTax, lang, 1)} tone={team.tax.bracketTax ? "rose" : "mint"}
          note={team.tax.bracketTax ? `${t("detail.published")} ${moneyM(team.siteTax, lang, 1)}` : t("tax.noTax")} />
        <Stat label={t("fa.totalExpiring")} value={moneyM(team.expiringSalary, lang, 1)} tone="violet"
          note={`${team.expiring.length} ${lang === "ja" ? "件が今季満了" : "deals end this season"}`} />
      </div>

      {/* ------------------------------------------------------------ cap position */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title={t("detail.position")} subtitle={t("detail.positionSub")}>
          <ThresholdBar
            lines={lines}
            payroll={team.payroll}
            taxSalary={team.taxSalary}
            apronSalary={team.apronSalary}
            apronLevel={team.apronLevel}
            color={team.color}
          />
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {[
              { label: t("th.cap"), amount: team.overCap, line: lines.cap, positiveIsBad: true },
              { label: t("th.tax"), amount: -team.roomToTax, line: lines.tax, positiveIsBad: true },
              { label: t("th.apron1"), amount: -team.roomToApron1, line: lines.apron1, positiveIsBad: true },
              { label: t("th.apron2"), amount: -team.roomToApron2, line: lines.apron2, positiveIsBad: true },
            ].map((row) => {
              const over = row.amount > 0;
              return (
                <div key={row.label} className="panel-flat px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="label-xs">{row.label}</span>
                    <span className="tnum text-[0.78rem] text-fog">{moneyM(row.line, lang, 1)}</span>
                  </div>
                  <div className={cls("tnum mt-1 text-[0.95rem] font-bold", over ? "text-down" : "text-up")}>
                    {over ? `${deltaM(row.amount, lang, 2)} ${t("common.above")}` : `${deltaM(-row.amount, lang, 2)} ${t("common.below")}`}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4">
            <div className="label-xs mb-2">{t("detail.comp")}</div>
            <div className="divide-hair overflow-hidden rounded-lg border border-line/70">
              {[
                { label: t("detail.taxSalary"), value: team.taxSalary },
                { label: t("detail.apronSalary"), value: team.apronSalary },
                { label: t("team.deadCap"), value: team.deadCap },
                { label: t("team.capHolds"), value: team.capHolds },
              ].map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-3 px-3 py-2">
                  <span className="text-[0.76rem] text-fog">{row.label}</span>
                  <span className={cls("tnum text-[0.82rem] font-semibold", row.value > 0 ? "text-chalk" : "text-fog-2")}>
                    {moneyM(row.value, lang, 2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel
          title={t("detail.taxBill")}
          subtitle={t("detail.taxBillSub")}
          action={
            <Link href={`/tax?team=${team.slug}`} className="btn">
              {t("detail.simulate")} →
            </Link>
          }
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="label-xs">{t("detail.bracketTax")}</div>
              <div className="tnum text-3xl font-bold text-rose">{moneyM(team.tax.bracketTax, lang, 2)}</div>
            </div>
            <div className="text-right">
              <div className="label-xs">{t("detail.effective")}</div>
              <div className="tnum text-xl font-semibold text-chalk">
                {team.tax.effectiveRate ? `$${team.tax.effectiveRate.toFixed(2)}` : "—"}
              </div>
              <div className="text-[0.66rem] text-fog">{t("common.perDollar")}</div>
            </div>
          </div>

          {team.tax.rows.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-lg border border-line/70">
              <table className="grid-table text-[0.78rem]">
                <thead>
                  <tr>
                    <th>{t("detail.bracket")}</th>
                    <th className="right">{t("detail.band")}</th>
                    <th className="right">{t("detail.rate")}</th>
                    <th className="right">{t("detail.taxOnBand")}</th>
                  </tr>
                </thead>
                <tbody>
                  {team.tax.rows.map((row) => (
                    <tr key={row.bracket}>
                      <td className="text-fog">{row.bracket}</td>
                      <td className="right tnum text-fog-2">
                        {moneyM(row.from, lang, 1)} – {moneyM(row.to, lang, 1)}
                      </td>
                      <td className="right tnum text-amber-soft">${row.rate.toFixed(2)}</td>
                      <td className="right tnum text-chalk">{moneyM(row.amount, lang, 2)}</td>
                    </tr>
                  ))}
                  {(team.tax.apron1Surcharge > 0 || team.tax.apron2Surcharge > 0) && (
                    <>
                      <tr>
                        <td colSpan={3} className="text-fog">
                          {t("th.apron1")} {lang === "ja" ? "加算税" : "surcharge"} (×2.5)
                        </td>
                        <td className="right tnum text-rose">{moneyM(team.tax.apron1Surcharge, lang, 2)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="text-fog">
                          {t("th.apron2")} {lang === "ja" ? "加算税" : "surcharge"} (×3.5)
                        </td>
                        <td className="right tnum text-rose">{moneyM(team.tax.apron2Surcharge, lang, 2)}</td>
                      </tr>
                      <tr className="border-t border-line">
                        <td colSpan={3} className="font-semibold text-chalk">{t("detail.totalTax")}</td>
                        <td className="right tnum font-bold text-rose">{moneyM(team.tax.total, lang, 2)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4">
            <div className="label-xs mb-1.5">
              <Term id="repeater">{t("detail.repeaterStatus")}</Term> ·{" "}
              {team.repeater ? <span className="text-rose">{t("team.repeater")}</span> : <span className="text-mint">{t("apron.belowTax")}</span>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {team.taxHistory.map((h) => {
                const isTaxpayer = h.status.toLowerCase().includes("taxpayer");
                return (
                  <span
                    key={h.season}
                    className={cls(
                      "chip tnum",
                      isTaxpayer ? "border-rose/40 bg-rose/10 text-rose" : "border-mint/30 bg-mint/8 text-mint",
                    )}
                  >
                    {h.season} {isTaxpayer ? (lang === "ja" ? "課税" : "tax") : lang === "ja" ? "非課税" : "clean"}
                  </span>
                );
              })}
            </div>
            <p className="mt-2 text-[0.74rem] leading-relaxed text-fog">
              {team.repeater
                ? t("detail.repeaterYes", { n: team.taxpayerPrev4 })
                : t("detail.repeaterNo", { n: team.taxpayerPrev4 })}
            </p>
          </div>

          {["first", "second"].includes(team.apronLevel) && (
            <div className="mt-4 rounded-lg border border-amber/30 bg-amber/8 px-3 py-2.5">
              <div className="label-xs mb-1.5 text-amber-soft">
                {team.apronLevel === "second" ? t("tax.restrictionsSecond") : t("tax.restrictionsFirst")}
              </div>
              <ul className="space-y-1 text-[0.74rem] leading-snug text-fog-2">
                {(team.apronLevel === "second"
                  ? [...APRON_RESTRICTIONS.first, ...APRON_RESTRICTIONS.second]
                  : APRON_RESTRICTIONS.first
                ).map((r) => (
                  <li key={r.en} className="flex gap-1.5">
                    <span className="text-amber">·</span>
                    <span>{lang === "ja" ? r.ja : r.en}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      {/* ------------------------------------------------------------ roster */}
      <Panel
        title={t("detail.roster")}
        subtitle={t("detail.rosterSub", { n: team.roster.length })}
        dense
        action={
          <span className="tnum chip">
            {t("common.total")} {money(team.rosterTotal, lang)}
          </span>
        }
      >
        <SortableTable
          columns={rosterColumns}
          rows={team.roster}
          rowConfig={{
            key: (p) => p.id,
            expandable: (p) => <PlayerDetailGrid player={p} season={team.season} />,
          }}
          initialSort="salary"
          initialDir="desc"
        />
      </Panel>

      {/* ------------------------------------------------------------ history */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title={t("detail.history")} subtitle={t("detail.historySub")}>
          <LineChart
            categories={team.history.map((h) => h.season)}
            series={[
              {
                id: "payroll",
                label: lang === "ja" ? "キャップ計上額" : "Cap payroll",
                color: team.color,
                area: true,
                points: team.history.map((h) => ({
                  x: h.season,
                  y: h.payroll,
                  meta: h.basis ?? (h.cash ? `${lang === "ja" ? "現金支給" : "cash"} ${moneyM(h.cash, lang, 1)}` : undefined),
                })),
              },
              {
                id: "cash",
                label: lang === "ja" ? "現金支給額" : "Cash paid",
                color: "#a78bfa",
                dashed: true,
                points: team.history.map((h) => ({ x: h.season, y: h.cash || null })),
              },
              {
                id: "cap",
                label: t("th.cap"),
                color: "#35d0e0",
                dashed: true,
                width: 1.6,
                points: team.history.map((h) => ({ x: h.season, y: h.cap })),
              },
              {
                id: "tax",
                label: t("th.tax"),
                color: "#ffc861",
                dashed: true,
                width: 1.6,
                points: team.history.map((h) => ({ x: h.season, y: h.tax })),
              },
            ]}
            formatY={(v) => moneyM(v, lang, 0)}
            height={280}
          />
        </Panel>

        <Panel title={t("detail.contracts")} subtitle={t("detail.contractsSub")}>
          <div className="space-y-3">
            {contractCounts.map((c) => (
              <div key={c.year}>
                <div className="flex items-baseline justify-between gap-3 text-[0.78rem]">
                  <span className="tnum font-semibold text-fog-2">{c.year}</span>
                  <span className="tnum text-fog">
                    {c.firm} {lang === "ja" ? "件確定" : "firm"} / {c.all} {lang === "ja" ? "件" : "total"}
                  </span>
                  <span className="tnum ml-auto font-bold text-chalk">{moneyM(c.total, lang, 1)}</span>
                </div>
                <div className="relative mt-1 h-[14px] overflow-hidden rounded-[4px] bg-white/[0.05]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-[4px]"
                    style={{ width: `${(c.all / maxCount) * 100}%`, background: `${team.color}44` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-[4px]"
                    style={{ width: `${(c.firm / maxCount) * 100}%`, background: team.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[0.72rem] leading-relaxed text-fog">
            {lang === "ja"
              ? `確定額の合計は ${moneyM(team.scheduled[team.futureYears[1]] ?? 0, lang, 1)}（${team.futureYears[1]}）。プレイヤーオプションを含む場合の合計は ${moneyM(
                  team.scheduled[team.futureYears[1]] ?? 0,
                  lang,
                  1,
                )}、行使されない可能性を除くと ${moneyM(team.scheduledGuaranteed[team.futureYears[1]] ?? 0, lang, 1)} です。`
              : `Scheduled ${team.futureYears[1]} payroll is ${moneyM(team.scheduled[team.futureYears[1]] ?? 0, lang, 1)}, or ${moneyM(
                  team.scheduledGuaranteed[team.futureYears[1]] ?? 0,
                  lang,
                  1,
                )} if every player option is declined.`}
          </p>
        </Panel>
      </div>

      {/* ------------------------------------------------------------ future */}
      <Panel title={t("detail.future")} subtitle={t("detail.futureSub")} dense>
        <SortableTable
          columns={futureColumns}
          rows={team.futureRows}
          rowConfig={{ key: (r) => r.label }}
          initialSort={team.futureYears[0]}
          initialDir="desc"
        />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line/70 px-4 py-2.5 text-[0.74rem]">
          <span className="label-xs">{t("common.total")}</span>
          {team.futureYears.map((y) => (
            <span key={y} className="tnum text-fog-2">
              <span className="text-fog">{y}</span>{" "}
              <span className="font-semibold text-chalk">{moneyM(team.scheduled[y] ?? 0, lang, 1)}</span>
            </span>
          ))}
        </div>
      </Panel>

      {/* ------------------------------------------------------------ league future ranking */}
      <Panel
        title={t("detail.futureLeagueRank", { season: team.futureYears[1] ?? "" })}
        subtitle={
          lang === "ja"
            ? "来季の確定キャップ計上額によるリーグ順位（オプション込み）。"
            : "League ranking by scheduled cap charges for next season, options included."
        }
      >
        <FutureRanking slug={team.slug} season={team.futureYears[1] ?? ""} color={team.color} />
      </Panel>

      {/* ------------------------------------------------------------ expiring */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title={t("detail.expiring")}
          subtitle={t("detail.expiringSub")}
          action={
            <Link href="/free-agency" className="btn">
              {t("common.viewAll")} →
            </Link>
          }
          dense
        >
          {team.expiring.length ? (
            <div className="divide-hair">
              {team.expiring.map((p) => (
                <div key={p.name} className="flex items-center gap-3 px-4 py-2 sm:px-5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.84rem] font-semibold text-chalk">{p.name}</span>
                    <span className="block text-[0.68rem] text-fog">
                      {[p.pos, p.age ? `${p.age}${lang === "ja" ? "歳" : ""}` : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <Badge tone={p.option === "playerOption" ? "cyan" : p.option === "teamOption" ? "violet" : p.option === "nonGuaranteed" ? "amber" : "neutral"}>
                    {t(OPTION_LABEL[p.option])}
                  </Badge>
                  <span className="tnum w-[5.5rem] shrink-0 text-right text-[0.84rem] font-semibold text-fog-2">
                    {moneyM(p.salary, lang, 2)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-fog sm:px-5">
              {lang === "ja" ? "今季満了の契約はありません" : "No contracts expire after this season"}
            </div>
          )}
        </Panel>

        <Panel title={t("detail.rivals")} dense>
          <div className="divide-hair">
            <DivisionRows team={team} rivals={rivals} record={record} maxPayroll={maxRivalPayroll} />
          </div>
        </Panel>
      </div>

      {/* ------------------------------------------------------------ pending options */}
      {team.pendingOptions.length > 0 && (
        <Panel
          title={lang === "ja" ? "将来のオプション年" : "Future option years"}
          subtitle={
            lang === "ja"
              ? "契約に含まれる、まだ行使/破棄が決まっていないオプション年。"
              : "Option years inside current deals that have not been exercised or declined yet."
          }
          dense
        >
          <div className="scroll-x">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>{t("common.player")}</th>
                  <th>{t("common.season")}</th>
                  <th>{t("fa.optionType")}</th>
                  <th className="right">{t("pos.salary", { season: team.season })}</th>
                  <th className="right hidden sm:table-cell">{t("pos.age")}</th>
                </tr>
              </thead>
              <tbody>
                {team.pendingOptions.slice(0, 14).map((o, i) => (
                  <tr key={`${o.name}-${o.season}-${i}`}>
                    <td className="text-[0.84rem] font-semibold text-chalk"><div className="max-w-[9rem] truncate sm:max-w-none">{o.name}</div></td>
                    <td className="tnum text-fog-2">{o.season}</td>
                    <td>
                      <Badge tone={o.kind === "playerOption" ? "cyan" : o.kind === "teamOption" ? "violet" : "amber"}>
                        {t(OPTION_LABEL[o.kind as OptionKind] ?? "fa.playerOption")}
                      </Badge>
                    </td>
                    <td className="right tnum text-fog-2">{moneyM(o.salary, lang, 2)}</td>
                    <td className="right tnum text-fog hidden sm:table-cell">{o.age ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* ------------------------------------------------------------ notes + nav */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {(team.contractNote || team.eraNote) && (
          <Panel title={lang === "ja" ? "契約メモ" : "Contract notes"}>
            <div className="space-y-3 text-[0.82rem] leading-relaxed text-fog-2">
              {team.contractNote && <p>{team.contractNote}</p>}
              {team.eraNote && <p className="text-fog">{team.eraNote}</p>}
              <p className="text-[0.72rem] text-fog">
                {t("detail.note")}: nbasalaries.com · {t("dash.snapshot", { date: dateLabel(team.snapshotDate) })}
              </p>
            </div>
          </Panel>
        )}
        <Panel title={t("detail.switchTeam")} dense>
          <div className="grid grid-cols-5 gap-1.5 p-3 sm:grid-cols-6 lg:grid-cols-10">
            {lg.teams.map((x) => (
              <Link
                key={x.slug}
                href={`/teams/${x.slug}`}
                title={x.name}
                className={cls(
                  "grid place-items-center rounded-lg border border-line/60 bg-panel/60 py-1.5 transition hover:border-amber/50",
                  x.slug === team.slug && "!border-amber/70 bg-amber/12",
                )}
              >
                <TeamLogo abbr={x.abbr} size={22} />
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function FutureRanking({ slug, season, color }: { slug: string; season: string; color: string }) {
  const { t, lang } = useLang();
  const ranking = leagueData.futureRankings?.[season];
  if (!ranking) return <div className="text-sm text-fog">{t("common.noResults")}</div>;
  const max = Math.max(...ranking.teams.map((x) => x.payroll));
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline gap-3">
        <span className="tnum text-[0.85rem] text-fog-2">
          {ranking.teams.find((x) => x.slug === slug)?.name}{" "}
          <span className="font-bold text-chalk">{moneyM(ranking.teamTotal, lang, 2)}</span>
        </span>
        <Badge tone="amber">
          #{ranking.rank} / 30
        </Badge>
      </div>
      <div className="space-y-[3px]">
        {ranking.teams.map((row) => {
          const mine = row.slug === slug;
          return (
            <Link
              key={row.slug}
              href={`/teams/${row.slug}`}
              className={cls(
                "flex items-center gap-2 rounded-md py-[3px] pr-2 transition hover:bg-white/[0.04]",
                mine && "bg-white/[0.05]",
              )}
            >
              <span className="tnum w-6 shrink-0 text-right text-[0.68rem] text-fog/70">{ranking.teams.indexOf(row) + 1}</span>
              <TeamLogo abbr={leagueData.teams.find((x) => x.slug === row.slug)?.abbr ?? row.slug.slice(0, 3).toUpperCase()} size={15} />
              <span className={cls("w-40 shrink-0 truncate text-[0.76rem]", mine ? "font-bold text-chalk" : "text-fog-2")}>
                {row.name}
              </span>
              <span className="relative h-[12px] flex-1">
                <span
                  className="absolute inset-y-0 left-0 rounded-r-[3px]"
                  style={{ width: `${(row.payroll / max) * 100}%`, background: mine ? color : "#2a3752" }}
                />
              </span>
              <span className={cls("tnum w-[5rem] shrink-0 text-right text-[0.76rem]", mine ? "font-bold text-chalk" : "text-fog")}>
                {moneyM(row.payroll, lang, 1)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}


function DivisionRows({
  team,
  rivals,
  record,
  maxPayroll,
}: {
  team: Team;
  rivals: TeamSummary[];
  record: TeamRecord | null;
  maxPayroll: number;
}) {
  const { t, lang } = useLang();
  const rows = [
    {
      slug: team.slug,
      abbr: team.abbr,
      name: team.name,
      payroll: team.payroll,
      capShare: team.capShare,
      color: team.color,
      wins: record?.wins ?? null,
      losses: record?.losses ?? null,
      self: true,
    },
    ...rivals.map((r) => ({
      slug: r.slug,
      abbr: r.abbr,
      name: r.name,
      payroll: r.payroll,
      capShare: r.capShare,
      color: r.color,
      wins: r.wins,
      losses: r.losses,
      self: false,
    })),
  ].sort((a, b) => b.payroll - a.payroll);

  return (
    <>
      {rows.map((r) => (
        <Link
          key={r.slug}
          href={`/teams/${r.slug}`}
          className={cls(
            "flex items-center gap-3 px-4 py-2.5 transition hover:bg-white/[0.03] sm:px-5",
            r.self && "bg-white/[0.045]",
          )}
        >
          <TeamLogo abbr={r.abbr} size={22} />
          <span className="min-w-0 flex-1">
            <span className={cls("block truncate text-[0.85rem]", r.self ? "font-bold text-chalk" : "font-semibold text-fog-2")}>
              {r.name}
            </span>
            <span className="tnum block text-[0.68rem] text-fog">
              {r.wins !== null && r.losses !== null ? `${r.wins}-${r.losses}` : "—"} ·{" "}
              {pct(r.capShare, lang, 1)} {t("team.capShare").toLowerCase()}
            </span>
          </span>
          <span className="w-20 shrink-0 sm:w-28">
            <span className="bar-track block" style={{ height: 5 }}>
              <span className="bar-fill" style={{ width: `${(r.payroll / maxPayroll) * 100}%`, background: r.color }} />
            </span>
          </span>
          <span className="tnum w-[5.5rem] shrink-0 text-right text-[0.85rem] font-bold text-chalk">
            {moneyM(r.payroll, lang, 1)}
          </span>
        </Link>
      ))}
    </>
  );
}
