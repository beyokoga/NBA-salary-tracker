"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { league } from "@/lib/data";
import { cls, money, moneyBig, moneyM, pct } from "@/lib/format";
import { useLang } from "@/i18n";
import type { DictKey } from "@/i18n";
import type { FreeAgencyDoc, FreeAgencyRow, OptionKind } from "@/lib/types";
import { Badge, Panel, Stat } from "./ui";
import { TeamLogo } from "./TeamLogo";
import { SortableTable, type Column } from "./SortableTable";

const OPTION_LABEL: Record<OptionKind, DictKey> = {
  expiring: "fa.expiring",
  playerOption: "fa.playerOption",
  teamOption: "fa.teamOption",
  mutual: "fa.playerOption",
  eto: "fa.eto",
  nonGuaranteed: "fa.nonGuaranteed",
};

const OPTION_TONE: Record<OptionKind, string> = {
  expiring: "neutral",
  playerOption: "cyan",
  teamOption: "violet",
  mutual: "amber",
  eto: "amber",
  nonGuaranteed: "amber",
};

export function OptionBadge({ kind }: { kind: OptionKind }) {
  const { t } = useLang();
  return <Badge tone={OPTION_TONE[kind] ?? "neutral"}>{t(OPTION_LABEL[kind] ?? "fa.expiring")}</Badge>;
}

export function FreeAgencyView({ doc }: { doc: FreeAgencyDoc }) {
  const { t, lang } = useLang();
  const [tab, setTab] = useState<"expiring" | "options">("expiring");
  const [q, setQ] = useState("");
  const [team, setTeam] = useState("all");
  const [kind, setKind] = useState("all");
  const [optionSeason, setOptionSeason] = useState("all");

  const optionSeasons = useMemo(
    () => Array.from(new Set(doc.options.map((r) => r.optionSeason ?? ""))).sort(),
    [doc.options],
  );

  const rows = useMemo(() => {
    const source = tab === "expiring" ? doc.expiring : doc.options;
    const needle = q.trim().toLowerCase();
    return source.filter((r) => {
      if (team !== "all" && r.team !== team) return false;
      if (kind !== "all" && r.option !== kind) return false;
      if (tab === "options" && optionSeason !== "all" && r.optionSeason !== optionSeason) return false;
      if (!needle) return true;
      return r.name.toLowerCase().includes(needle) || r.teamName.toLowerCase().includes(needle);
    });
  }, [tab, doc, q, team, kind, optionSeason]);

  const total = rows.reduce((sum, r) => sum + (r.capHit ?? 0), 0);
  const maxTeamTotal = doc.byTeam[0]?.total ?? 1;

  const columns: Column<FreeAgencyRow>[] = [
    {
      key: "name",
      header: t("common.player"),
      sortValue: (r) => r.name,
      render: (r) => (
        <span className="block">
          <span className="block truncate text-[0.86rem] font-semibold text-chalk">{r.name}</span>
          <span className="block text-[0.68rem] text-fog">
            {[r.pos, r.age !== null ? `${r.age}${lang === "ja" ? "歳" : ""}` : null].filter(Boolean).join(" · ")}
          </span>
        </span>
      ),
    },
    {
      key: "team",
      header: t("common.team"),
      hideBelow: "sm",
      sortValue: (r) => r.team,
      render: (r) => (
        <span className="flex items-center gap-1.5">
          <TeamLogo abbr={r.team} size={18} />
          <span className="text-[0.78rem] text-fog-2">{r.team}</span>
        </span>
      ),
    },
    {
      key: "salary",
      header: t("pos.salary", { season: doc.season }),
      align: "right",
      sortValue: (r) => r.capHit,
      render: (r) => (
        <span className="block">
          <span className="tnum block text-[0.86rem] font-bold text-amber-soft">{money(r.capHit, lang)}</span>
          {r.teamShare !== null && (
            <span className="tnum block text-[0.66rem] text-fog">
              {pct(r.teamShare, lang, 1)} {lang === "ja" ? "チーム内" : "of team"}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "status",
      header: t("fa.optionType"),
      hideBelow: "sm",
      sortValue: (r) => r.option,
      render: (r) => <OptionBadge kind={r.option} />,
    },
    {
      key: "through",
      header: tab === "options" ? t("common.season") : t("pos.contractThrough"),
      align: "right",
      hideBelow: "md",
      sortValue: (r) => (tab === "options" ? r.optionSeason ?? "" : r.through),
      render: (r) => <span className="tnum text-fog-2">{(tab === "options" ? r.optionSeason : r.through) ?? r.through}</span>,
    },
    {
      key: "fa",
      header: t("pos.freeAgency"),
      align: "right",
      hideBelow: "xl",
      sortValue: (r) => r.freeAgency,
      render: (r) => <span className="tnum text-fog">{r.freeAgency ?? "—"}</span>,
    },
    {
      key: "type",
      header: t("pos.contractType"),
      hideBelow: "lg",
      sortValue: (r) => r.contractType,
      render: (r) => <span className="text-[0.76rem] text-fog">{r.contractType ?? "—"}</span>,
    },
    {
      key: "value",
      header: t("pos.contractValue"),
      align: "right",
      hideBelow: "xl",
      sortValue: (r) => r.contractValue,
      render: (r) => (r.contractValue ? moneyM(r.contractValue, lang, 1) : "—"),
    },
    {
      key: "career",
      header: t("pos.careerEarnings"),
      align: "right",
      hideBelow: "xl",
      sortValue: (r) => r.careerEarnings,
      render: (r) => (r.careerEarnings ? moneyM(r.careerEarnings, lang, 1) : "—"),
    },
  ];

  return (
    <div className="space-y-5">
      <header className="panel px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="amber">{doc.season}</Badge>
          <span className="chip">{lang === "ja" ? `${doc.nextSummer}年夏のFA市場` : `${doc.nextSummer} free agency`}</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-chalk">{t("fa.title")}</h1>
        <p className="mt-1.5 max-w-3xl text-[0.85rem] text-fog">{t("fa.subtitle", { season: doc.season })}</p>
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label={t("fa.totalExpiring")} value={moneyBig(doc.totals.salary, lang)} tone="amber"
          note={`${doc.totals.count} ${lang === "ja" ? "件" : "contracts"}`} />
        <Stat
          label={lang === "ja" ? "オフが確定的な額" : "Firmly coming off"}
          value={moneyBig(doc.totals.guaranteedOut, lang)}
          tone="mint"
          note={lang === "ja" ? "プレイヤーオプションを除く" : "Excludes player options"}
        />
        <Stat label={t("fa.playerOption")} value={`${doc.totals.playerOptions}`} tone="cyan" />
        <Stat label={t("fa.nonGuaranteed")} value={`${doc.totals.nonGuaranteed}`} tone="violet" />
        <Stat label={t("fa.teams")} value={`${doc.totals.teams} / 30`} note={`${t("dash.leaguePayroll")} ${moneyBig(league.totals.payroll, lang)}`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Panel title={t("fa.byTeam")} subtitle={t("fa.byTeamSub")} dense>
          <div className="max-h-[30rem] overflow-y-auto px-3 py-3">
            <div className="space-y-[3px]">
              {doc.byTeam.map((row) => (
                <Link
                  key={row.team}
                  href={`/teams/${row.teamSlug}`}
                  className="flex items-center gap-2 rounded-md py-[3px] pr-2 transition hover:bg-white/[0.04]"
                >
                  <TeamLogo abbr={row.team} size={17} />
                  <span className="w-11 shrink-0 text-[0.76rem] font-semibold text-fog-2">{row.team}</span>
                  <span className="relative h-[16px] flex-1">
                    <span
                      className="absolute inset-y-0 left-0 rounded-r-[3px]"
                      style={{
                        width: `${(row.total / maxTeamTotal) * 100}%`,
                        background: `linear-gradient(90deg, ${row.teamColor}44, ${row.teamColor})`,
                      }}
                    />
                    <span className="tnum absolute inset-y-0 left-2 flex items-center text-[0.68rem] text-chalk/85">
                      {moneyM(row.total, lang, 1)}
                    </span>
                  </span>
                  <span className="tnum hidden w-16 shrink-0 text-right text-[0.7rem] text-fog sm:block">
                    {row.count} {lang === "ja" ? "件" : "deals"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </Panel>

        <Panel
          title={t("fa.biggest")}
          subtitle={
            lang === "ja"
              ? `${doc.season}で満了する契約のうち、金額が大きい上位10件。`
              : `The ten largest deals ending after ${doc.season}.`
          }
          dense
        >
          <div className="divide-hair">
            {doc.expiring.slice(0, 10).map((r, i) => (
              <Link
                key={`${r.team}-${r.playerId}`}
                href={`/teams/${r.teamSlug}`}
                className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-white/[0.03] sm:px-5"
              >
                <span className="tnum w-5 shrink-0 text-[0.75rem] font-bold text-fog/70">{i + 1}</span>
                <TeamLogo abbr={r.team} size={20} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.86rem] font-semibold text-chalk">{r.name}</span>
                  <span className="block text-[0.68rem] text-fog">
                    {r.teamName} · {r.pos} · {r.age}{lang === "ja" ? "歳" : ""}
                  </span>
                </span>
                <OptionBadge kind={r.option} />
                <span className="tnum w-[6rem] shrink-0 text-right text-[0.9rem] font-bold text-amber-soft">
                  {moneyM(r.capHit, lang, 2)}
                </span>
              </Link>
            ))}
          </div>
          <div className="border-t border-line/70 px-4 py-3 sm:px-5">
            <div className="label-xs mb-2">{lang === "ja" ? "未決定のオプション年（上位）" : "Outstanding option years"}</div>
            <div className="flex flex-wrap gap-1.5">
              {doc.options
                .filter((r) => r.option === "playerOption")
                .slice(0, 8)
                .map((r) => (
                  <Link key={`${r.team}-${r.playerId}-${r.optionSeason}`} href={`/teams/${r.teamSlug}`} className="chip tnum hover:border-cyan/50">
                    {r.name} · {r.optionSeason} · {moneyM(r.capHit, lang, 1)}
                  </Link>
                ))}
            </div>
          </div>
        </Panel>
      </div>

      <Panel
        dense
        title={t("fa.list")}
        action={
          <div className="flex overflow-hidden rounded-lg border border-line">
            {(["expiring", "options"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setTab(v)}
                className={cls("px-2.5 py-1.5 text-[0.72rem] font-semibold transition", tab === v ? "btn-on" : "text-fog hover:text-chalk")}
              >
                {v === "expiring"
                  ? `${t("fa.expiring")} (${doc.expiring.length})`
                  : `${lang === "ja" ? "オプション年" : "Option years"} (${doc.options.length})`}
              </button>
            ))}
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-line/70 px-4 py-3 sm:px-5">
          <input
            className="input w-full sm:w-52"
            placeholder={t("players.searchPlaceholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="input w-auto" value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="all">{t("players.filterTeam")}: {t("common.all")}</option>
            {[...league.teams]
              .sort((a, b) => a.abbr.localeCompare(b.abbr))
              .map((x) => (
                <option key={x.abbr} value={x.abbr}>
                  {x.abbr} — {x.name}
                </option>
              ))}
          </select>
          <select className="input w-auto" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="all">{t("fa.filterOption")}: {t("common.all")}</option>
            <option value="expiring">{t("fa.expiring")}</option>
            <option value="playerOption">{t("fa.playerOption")}</option>
            <option value="teamOption">{t("fa.teamOption")}</option>
            <option value="nonGuaranteed">{t("fa.nonGuaranteed")}</option>
            <option value="mutual">{lang === "ja" ? "相互オプション" : "Mutual option"}</option>
            <option value="eto">{t("fa.eto")}</option>
          </select>
          {tab === "options" && (
            <select className="input w-auto" value={optionSeason} onChange={(e) => setOptionSeason(e.target.value)}>
              <option value="all">{t("common.season")}: {t("common.all")}</option>
              {optionSeasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          <span className="tnum ml-auto text-[0.76rem] text-fog">
            {rows.length} {lang === "ja" ? "件" : "rows"} · {moneyM(total, lang, 1)}
          </span>
        </div>

        <SortableTable
          columns={columns}
          rows={rows}
          rowConfig={{ key: (r) => `${r.team}-${r.playerId}-${r.optionSeason ?? r.through}`, href: (r) => `/teams/${r.teamSlug}` }}
          initialSort="salary"
          initialDir="desc"
          pageSize={30}
        />
      </Panel>
    </div>
  );
}
