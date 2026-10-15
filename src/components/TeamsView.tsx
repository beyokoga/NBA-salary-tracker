"use client";

import { useMemo, useState } from "react";
import { league } from "@/lib/data";
import { cls, dateLabel, deltaM, moneyBig, moneyM, pct, record } from "@/lib/format";
import { useLang } from "@/i18n";
import type { DictKey } from "@/i18n";
import type { ApronLevel, TeamSummary } from "@/lib/types";
import { Badge, Panel, Stat } from "./ui";
import { TeamLogo } from "./TeamLogo";
import { SortableTable, type Column } from "./SortableTable";
import { downloadCsv } from "@/lib/csv";
import { APRON_COLOR } from "./charts/PayrollBars";

const APRON_LABEL: Record<ApronLevel, DictKey> = {
  second: "apron.second",
  first: "apron.first",
  tax: "apron.tax",
  belowTax: "apron.belowTax",
};

const RESULT_LABEL: Record<string, DictKey> = {
  champion: "result.champion",
  finals: "result.finals",
  confFinals: "result.confFinals",
  confSemis: "result.confSemis",
  firstRound: "result.firstRound",
  missed: "result.missed",
};

export function StatusBadge({ level, repeater }: { level: ApronLevel; repeater?: boolean }) {
  const { t } = useLang();
  const tone = level === "second" ? "rose" : level === "first" ? "amber" : level === "tax" ? "violet" : "cyan";
  return (
    <span className="inline-flex items-center gap-1">
      <Badge tone={tone}>{t(APRON_LABEL[level])}</Badge>
      {repeater && <Badge tone="rose">REP</Badge>}
    </span>
  );
}

function lgPrevSeason() {
  return league.prevSeason;
}

export function TeamsView({ onOpenTeam }: { onOpenTeam?: (slug: string) => void } = {}) {
  const { t, lang } = useLang();
  const [q, setQ] = useState("");
  const [conf, setConf] = useState<"all" | "Eastern" | "Western">("all");
  const [status, setStatus] = useState<"all" | "taxpayer" | "apron" | "clean">("all");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return league.teams.filter((team) => {
      if (conf !== "all" && team.conference !== conf) return false;
      if (status === "taxpayer" && team.overTax <= 0) return false;
      if (status === "apron" && !["first", "second"].includes(team.apronLevel)) return false;
      if (status === "clean" && team.overTax > 0) return false;
      if (!needle) return true;
      return (
        team.name.toLowerCase().includes(needle) ||
        team.abbr.toLowerCase().includes(needle) ||
        team.city.toLowerCase().includes(needle)
      );
    });
  }, [q, conf, status]);

  const totals = rows.reduce(
    (acc, x) => ({
      payroll: acc.payroll + x.payroll,
      tax: acc.tax + x.taxEstimate,
      players: acc.players + x.rosterCount,
    }),
    { payroll: 0, tax: 0, players: 0 },
  );

  const maxPayroll = Math.max(...league.teams.map((x) => x.payroll));

  const exportCsv = () => {
    downloadCsv(
      `nba-payrolls-${league.season}.csv`,
      [
        "rank", "team", "abbr", "conference", "division", "payroll", "payroll_active",
        "dead_cap", "cap_holds", "pct_of_cap", "top3_share", "change_vs_prior", "prior_payroll",
        "tax_salary", "apron_salary", "over_tax", "apron_level", "repeater",
        "tax_bracket_estimate", "tax_incl_apron", "published_estimate", "roster_size",
        "top_player", "top_salary", "expiring_count", "expiring_salary",
        `${lgPrevSeason()}_wins`, `${lgPrevSeason()}_losses`, `${lgPrevSeason()}_win_pct`,
        `${lgPrevSeason()}_seed`, `${lgPrevSeason()}_result`, "url",
      ],
      rows.map((r) => [
        r.rank, r.name, r.abbr, r.conference, r.division, r.payroll, r.payrollActive,
        r.deadCap, r.capHolds, r.capShare, r.top3Share, r.payrollDelta, r.prevPayroll,
        r.taxSalary, r.apronSalary, r.overTax, r.apronLevel, r.repeater ? 1 : 0,
        r.taxEstimate, r.taxAllIn, r.siteTax, r.rosterCount,
        r.topPlayer, r.topSalary, r.expiringCount, r.expiringSalary,
        r.wins, r.losses, r.winPct, r.confSeed, r.playoffResult ?? "",
        `https://example.invalid/teams/${r.slug}`,
      ]),
    );
  };

  const columns: Column<TeamSummary>[] = [
    {
      key: "rank",
      header: "#",
      align: "right",
      width: "3rem",
      sortValue: (r) => r.rank,
      render: (r) => <span className="text-fog/80">{r.rank}</span>,
    },
    {
      key: "team",
      header: t("common.team"),
      sortValue: (r) => r.name,
      render: (r) => (
        <span className="flex max-w-[8.5rem] items-center gap-2 sm:max-w-none">
          <TeamLogo abbr={r.abbr} size={22} />
          <span className="min-w-0">
            <span className="block truncate text-[0.86rem] font-semibold text-chalk">{r.name}</span>
            <span className="block text-[0.68rem] text-fog">
              {lang === "ja"
                ? `${r.conference === "Eastern" ? "イースト" : "ウェスト"} ・ ${r.division}`
                : `${r.conference} · ${r.division}`}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: "payroll",
      header: t("team.payroll"),
      align: "right",
      sortValue: (r) => r.payroll,
      render: (r) => (
        <span className="block min-w-[8.5rem]">
          <span className="block text-[0.86rem] font-bold" style={{ color: APRON_COLOR[r.apronLevel] }}>
            {moneyM(r.payroll, lang, 2)}
          </span>
          <span className="mt-1 block">
            <span className="bar-track block" style={{ height: 4 }}>
              <span
                className="bar-fill"
                style={{ width: `${(r.payroll / maxPayroll) * 100}%`, background: APRON_COLOR[r.apronLevel] }}
              />
            </span>
          </span>
        </span>
      ),
    },
    {
      key: "delta",
      header: t("team.delta"),
      align: "right",
      hideBelow: "lg",
      sortValue: (r) => r.payrollDelta,
      render: (r) => <DeltaMoney value={r.payrollDelta} />,
    },
    {
      key: "capShare",
      header: t("team.capShare"),
      align: "right",
      hideBelow: "md",
      sortValue: (r) => r.capShare,
      render: (r) => <span className={cls(r.capShare > 100 ? "text-amber-soft" : "text-cyan")}>{pct(r.capShare, lang, 1)}</span>,
    },
    {
      key: "dead",
      header: t("team.deadCap"),
      align: "right",
      hideBelow: "xl",
      sortValue: (r) => r.deadCap,
      render: (r) => <span className={r.deadCap > 0 ? "text-rose" : "text-fog/60"}>{r.deadCap ? moneyM(r.deadCap, lang, 2) : "—"}</span>,
    },
    {
      key: "taxSalary",
      header: t("team.taxSalary"),
      align: "right",
      hideBelow: "xl",
      sortValue: (r) => r.taxSalary,
      render: (r) => moneyM(r.taxSalary, lang, 1),
    },
    {
      key: "status",
      header: t("team.status"),
      hideBelow: "sm",
      sortValue: (r) => (["second", "first", "tax", "belowTax"] as const).indexOf(r.apronLevel),
      render: (r) => <StatusBadge level={r.apronLevel} repeater={r.repeater} />,
    },
    {
      key: "tax",
      header: t("team.taxEstimate"),
      align: "right",
      sortValue: (r) => r.taxEstimate,
      render: (r) =>
        r.taxEstimate > 0 ? (
          <span className="font-semibold text-rose">{moneyM(r.taxEstimate, lang, 1)}</span>
        ) : (
          <span className="text-fog/50">—</span>
        ),
    },
    {
      key: "record",
      header: t("team.record"),
      align: "right",
      hideBelow: "sm",
      sortValue: (r) => r.winPct ?? -1,
      render: (r) => (
        <span className="block">
          <span className="tnum block text-[0.82rem] text-chalk">{record(r.wins, r.losses)}</span>
          {r.playoffResult && (
            <span className="block text-[0.66rem] text-fog">{t(RESULT_LABEL[r.playoffResult] ?? "result.missed")}</span>
          )}
        </span>
      ),
    },
    {
      key: "top",
      header: t("team.topPlayer"),
      hideBelow: "lg",
      sortValue: (r) => r.topSalary,
      render: (r) => (
        <span className="block">
          <span className="block truncate text-[0.8rem] text-fog-2">{r.topPlayer}</span>
          <span className="tnum block text-[0.68rem] text-fog">{moneyM(r.topSalary, lang, 1)}</span>
        </span>
      ),
    },
    {
      key: "expiring",
      header: t("fa.title"),
      align: "right",
      hideBelow: "xl",
      sortValue: (r) => r.expiringSalary,
      render: (r) => (
        <span className="block">
          <span className="tnum block text-[0.82rem] text-fog-2">{moneyM(r.expiringSalary, lang, 1)}</span>
          <span className="block text-[0.66rem] text-fog">{r.expiringCount} {lang === "ja" ? "件" : "deals"}</span>
        </span>
      ),
    },    {
      key: "cpw",
      header: t("th.cpw"),
      align: "right",
      sortValue: (r) => (r.wins ? r.payroll / r.wins : Number.POSITIVE_INFINITY),
      render: (r) => <span className="tnum text-fog-2">{r.wins ? moneyM(r.payroll / r.wins, lang, 2) : "—"}</span>,
    },

  ];

  return (
    <div className="space-y-5">
      <header className="panel px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="amber">{league.season}</Badge>
          <span className="chip">{t("dash.snapshot", { date: dateLabel(league.rosterSnapshot) })}</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-chalk">{t("team.title")}</h1>
        <p className="mt-1.5 max-w-3xl text-[0.85rem] text-fog">{t("team.subtitle")}</p>
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label={`${t("common.total")} · ${rows.length} ${lang === "ja" ? "チーム" : "teams"}`} value={moneyBig(totals.payroll, lang)} tone="amber" />
        <Stat label={t("team.taxEstimate")} value={moneyBig(totals.tax, lang)} tone="rose" />
        <Stat label={t("dash.avgPayroll")} value={moneyM(rows.length ? totals.payroll / rows.length : 0, lang, 1)} />
        <Stat label={t("dash.playerCount")} value={`${totals.players}`} tone="cyan" />
      </div>

      <Panel
        title={t("nav.teams")}
        dense
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn" onClick={exportCsv} title="CSV">
              ⤓ CSV
            </button>
            <input
              className="input w-40 sm:w-52"
              placeholder={t("team.searchPlaceholder")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="flex overflow-hidden rounded-lg border border-line">
              {(["all", "Eastern", "Western"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setConf(c)}
                  className={cls(
                    "px-2.5 py-1.5 text-[0.72rem] font-semibold transition",
                    conf === c ? "btn-on" : "text-fog hover:text-chalk",
                  )}
                >
                  {c === "all" ? t("common.all") : c === "Eastern" ? t("team.eastern") : t("team.western")}
                </button>
              ))}
            </div>
            <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="all">{t("team.statusFilter")}: {t("common.all")}</option>
              <option value="taxpayer">{t("apron.tax")}</option>
              <option value="apron">{t("th.apron1")}+</option>
              <option value="clean">{t("apron.belowTax")}</option>
            </select>
          </div>
        }
      >
        <SortableTable
          columns={columns}
          rows={rows}
          rowConfig={{ key: (r) => r.slug, href: (r) => `/teams/${r.slug}` }}
          onRowNavigate={onOpenTeam ? (href) => onOpenTeam(href.replace(/^\/teams\//, "")) : undefined}
          initialSort="payroll"
          initialDir="desc"
        />
      </Panel>
    </div>
  );
}

export function DeltaMoney({ value }: { value: number | null }) {
  const { lang } = useLang();
  if (value === null || value === undefined) return <span className="text-fog/50">—</span>;
  return (
    <span
      className={cls(
        "tnum text-[0.8rem] font-semibold",
        value > 0 ? "text-up" : value < 0 ? "text-down" : "text-fog",
      )}
    >
      {deltaM(value, lang, 1)}
    </span>
  );
}
