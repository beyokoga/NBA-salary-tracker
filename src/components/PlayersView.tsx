"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { allPlayers, league } from "@/lib/data";
import { cls, dateLabel, money, moneyM, pct } from "@/lib/format";
import { useLang } from "@/i18n";
import type { DictKey } from "@/i18n";
import type { OptionKind, RosterPlayer } from "@/lib/types";
import { Badge, Panel, Stat } from "./ui";
import { TeamLogo } from "./TeamLogo";
import { SortableTable, type Column } from "./SortableTable";
import { downloadCsv } from "@/lib/csv";
import { PlayerDetailGrid } from "./PlayerDetailGrid";
import { Scatter } from "./charts/Scatter";

const OPTION_LABEL: Record<OptionKind, DictKey> = {
  expiring: "fa.expiring",
  playerOption: "fa.playerOption",
  teamOption: "fa.teamOption",
  mutual: "fa.playerOption",
  eto: "fa.eto",
  nonGuaranteed: "fa.nonGuaranteed",
};

const POSITIONS = ["G", "F", "C"];

function normalisePos(pos: string | null): string | null {
  if (!pos) return null;
  const p = pos.toUpperCase();
  if (p.includes("C")) return "C";
  if (p.includes("F")) return "F";
  if (p.includes("G")) return "G";
  return p;
}

const RANK = new Map(allPlayers.map((p, i) => [`${p.team}-${p.id}`, i + 1]));

export function PlayersView() {
  const { t, lang } = useLang();
  const params = useSearchParams();
  const [q, setQ] = useState(() => params.get("q") ?? "");
  const [pos, setPos] = useState("all");
  const [team, setTeam] = useState(() => params.get("team") ?? "all");
  const [maxOnly, setMaxOnly] = useState(false);
  const [optionOnly, setOptionOnly] = useState(false);
  const [view, setView] = useState<"table" | "age">("table");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allPlayers.filter((p) => {
      if (team !== "all" && p.team !== team) return false;
      if (pos !== "all" && normalisePos(p.pos) !== pos) return false;
      if (maxOnly && !(p.contractType ?? "").toLowerCase().includes("max")) return false;
      if (optionOnly && p.optionKind === "expiring") return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        p.teamName.toLowerCase().includes(needle) ||
        (p.contractType ?? "").toLowerCase().includes(needle)
      );
    });
  }, [q, pos, team, maxOnly, optionOnly]);

  const totals = rows.reduce(
    (acc, p) => ({ salary: acc.salary + (p.capHit ?? 0), guaranteed: acc.guaranteed + (p.guaranteed ?? 0) }),
    { salary: 0, guaranteed: 0 },
  );
  const leader = allPlayers[0]?.capHit ?? 1;

  const exportCsv = () => {
    downloadCsv(
      `nba-player-salaries-${league.season}.csv`,
      [
        "player", "team", "abbr", "pos", "position", "age", "height", "country",
        "salary", "salary_prev", "salary_delta", "cap_hit", "pct_of_cap", "pct_of_team",
        "contract_value", "guaranteed", "contract_type", "contract_through", "option",
        "free_agency_year", "career_earnings", "net_worth", "team_wins", "team_losses",
      ],
      rows.map((p) => {
        const tm = league.teams.find((x) => x.abbr === p.team);
        return [
          p.name, p.teamName, p.team, p.pos, p.position, p.age, p.height, p.country,
          p.salary, p.salaryPrev, p.salaryDelta, p.capHit, p.capShare, p.teamShare,
          p.contractValue, p.guaranteed, p.contractType, p.contractThrough, p.optionKind,
          p.freeAgency, p.careerEarnings, p.netWorth, tm?.wins ?? "", tm?.losses ?? "",
        ];
      }),
    );
  };

  const columns: Column<RosterPlayer>[] = [
    {
      key: "rank",
      header: "#",
      align: "right",
      width: "3rem",
      sortValue: (p) => p.capHit ?? 0,
      render: (p, i) => <span className="text-fog/70">{RANK.get(`${p.team}-${p.id}`) ?? i + 1}</span>,
    },
    {
      key: "name",
      header: t("common.player"),
      sortValue: (p) => p.name,
      render: (p) => (
        <span className="block max-w-[10rem] sm:max-w-none">
          <span className="block truncate text-[0.86rem] font-semibold text-chalk">{p.name}</span>
          <span className="block truncate text-[0.68rem] text-fog">
            {[p.pos, p.position, p.age !== null ? `${p.age}${lang === "ja" ? "歳" : ""}` : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
      ),
    },
    {
      key: "team",
      header: t("common.team"),
      hideBelow: "sm",
      sortValue: (p) => p.team,
      render: (p) => (
        <span className="flex items-center gap-1.5">
          <TeamLogo abbr={p.team} size={18} />
          <span className="text-[0.78rem] text-fog-2">{p.team}</span>
        </span>
      ),
    },
    {
      key: "salary",
      header: t("pos.salary", { season: league.season }),
      align: "right",
      sortValue: (p) => p.salary,
      render: (p) => (
        <span className="block min-w-[7rem]">
          <span className="tnum block text-[0.86rem] font-bold text-amber-soft">{money(p.salary, lang)}</span>
          <span className="mt-1 block">
            <span className="bar-track block" style={{ height: 4 }}>
              <span
                className="bar-fill"
                style={{ width: `${((p.capHit ?? 0) / leader) * 100}%`, background: p.teamColor }}
              />
            </span>
          </span>
        </span>
      ),
    },
    {
      key: "capShare",
      header: t("pos.capShare"),
      align: "right",
      hideBelow: "lg",
      sortValue: (p) => p.capShare,
      render: (p) => <span className={cls((p.capShare ?? 0) > 25 ? "text-amber-soft" : "text-fog-2")}>{pct(p.capShare, lang, 2)}</span>,
    },
    {
      key: "teamShare",
      header: t("pos.payrollShare"),
      align: "right",
      hideBelow: "xl",
      sortValue: (p) => p.teamShare,
      render: (p) => pct(p.teamShare, lang, 1),
    },
    {
      key: "age",
      header: t("pos.age"),
      align: "right",
      hideBelow: "sm",
      sortValue: (p) => p.age,
      render: (p) => <span className="text-fog-2">{p.age ?? "—"}</span>,
    },
    {
      key: "through",
      header: t("pos.contractThrough"),
      align: "right",
      hideBelow: "md",
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
      render: (p) => (p.contractValue ? moneyM(p.contractValue, lang, 1) : "—"),
    },
    {
      key: "guaranteed",
      header: t("pos.guaranteed"),
      align: "right",
      hideBelow: "xl",
      sortValue: (p) => p.guaranteed,
      render: (p) => (p.guaranteed ? moneyM(p.guaranteed, lang, 1) : "—"),
    },
    {
      key: "career",
      header: t("pos.careerEarnings"),
      align: "right",
      hideBelow: "xl",
      sortValue: (p) => p.careerEarnings,
      render: (p) => (p.careerEarnings ? moneyM(p.careerEarnings, lang, 1) : "—"),
    },
  ];

  const agePoints = rows
    .filter((p) => p.age !== null && (p.capHit ?? 0) > 0)
    .slice(0, 220)
    .map((p) => ({
      id: p.team,
      x: p.age as number,
      y: (p.capHit as number) / 1e6,
      color: p.teamColor,
      label: p.name,
      sub: `${p.teamName} · ${moneyM(p.capHit, lang, 2)} · ${p.pos}`,
      href: `/teams/${p.teamSlug}`,
    }));

  return (
    <div className="space-y-5">
      <header className="panel px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="amber">{league.season}</Badge>
          <span className="chip">{t("dash.snapshot", { date: dateLabel(league.rosterSnapshot) })}</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold text-chalk">{t("players.title")}</h1>
        <p className="mt-1.5 max-w-3xl text-[0.85rem] text-fog">
          {t("players.subtitle", { n: allPlayers.length, season: league.season })}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label={`${rows.length} ${lang === "ja" ? "件" : "contracts"}`} value={moneyM(totals.salary, lang, 2)} tone="amber" />
        <Stat label={t("pos.guaranteed")} value={moneyM(totals.guaranteed, lang, 2)} tone="mint" />
        <Stat
          label={lang === "ja" ? "平均 / 中央値" : "Average / median"}
          value={moneyM(rows.length ? totals.salary / rows.length : 0, lang, 2)}
          note={moneyM(
            rows.length
              ? [...rows].sort((a, b) => (a.capHit ?? 0) - (b.capHit ?? 0))[Math.floor(rows.length / 2)].capHit ?? 0
              : 0,
            lang,
            2,
          )}
        />
        <Stat
          label={t("dash.topSalaries")}
          value={allPlayers[0]?.name ?? "—"}
          tone="cyan"
          note={allPlayers[0] ? `${allPlayers[0].team} · ${moneyM(allPlayers[0].capHit, lang, 2)}` : undefined}
        />
      </div>

      <Panel
        dense
        title={t("players.title")}
        action={
          <div className="flex items-center gap-2">
          <button type="button" className="btn" onClick={exportCsv} title="CSV">
            ⤓ CSV
          </button>
          <div className="flex overflow-hidden rounded-lg border border-line">
            {(["table", "age"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cls("px-2.5 py-1.5 text-[0.72rem] font-semibold transition", view === v ? "btn-on" : "text-fog hover:text-chalk")}
              >
                {v === "table" ? (lang === "ja" ? "一覧" : "Table") : t("players.ageSalary")}
              </button>
            ))}
          </div>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-line/70 px-4 py-3 sm:px-5">
          <input
            className="input w-full sm:w-56"
            placeholder={t("players.searchPlaceholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="flex overflow-hidden rounded-lg border border-line">
            {["all", ...POSITIONS].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPos(p)}
                className={cls("px-2.5 py-1.5 text-[0.72rem] font-semibold transition", pos === p ? "btn-on" : "text-fog hover:text-chalk")}
              >
                {p === "all" ? t("common.all") : p}
              </button>
            ))}
          </div>
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
          <button type="button" className={cls("btn", maxOnly && "btn-on")} onClick={() => setMaxOnly((v) => !v)}>
            {t("players.maxOnly")}
          </button>
          <button type="button" className={cls("btn", optionOnly && "btn-on")} onClick={() => setOptionOnly((v) => !v)}>
            {t("players.optionOnly")}
          </button>
          <span className="tnum ml-auto text-[0.74rem] text-fog">{t("players.expCount", { n: rows.length })}</span>
        </div>

        {view === "table" ? (
          <SortableTable
            columns={columns}
            rows={rows}
            rowConfig={{
              key: (p) => `${p.team}-${p.id}`,
              href: (p) => `/teams/${p.teamSlug}`,
              expandable: (p) => <PlayerDetailGrid player={p} season={league.season} />,
            }}
            initialSort="salary"
            initialDir="desc"
            pageSize={30}
          />
        ) : (
          <div className="px-4 py-4 sm:px-5">
            <Scatter
              points={agePoints}
              xLabel={lang === "ja" ? "年齢" : "Age"}
              yLabel={lang === "ja" ? "年俸 ($M)" : "Salary ($M)"}
              formatX={(v) => v.toFixed(0)}
              formatY={(v) => `$${v.toFixed(0)}M`}
              height={420}
              showIds={false}
            />
            <p className="mt-2 text-[0.74rem] text-fog">{t("players.ageSalarySub")}</p>
            <p className="mt-1 text-[0.72rem] text-fog/70">
              {lang === "ja"
                ? "ラベルはチーム略称です。点にカーソルを合わせると選手名が出ます（表示は上位220件）。"
                : "Labels show team abbreviations; hover a dot for the player. Top 220 by salary are plotted."}
            </p>
          </div>
        )}
      </Panel>

      <Panel title={t("players.topContracts")} dense>
        <div className="grid gap-px bg-line/50 sm:grid-cols-2 lg:grid-cols-3">
          {[...allPlayers]
            .sort((a, b) => (b.contractValue ?? 0) - (a.contractValue ?? 0))
            .slice(0, 9)
            .map((p) => (
              <Link key={`${p.team}-${p.id}`} href={`/teams/${p.teamSlug}`} className="bg-panel px-3.5 py-3 transition hover:bg-panel-2">
                <div className="flex items-center gap-2">
                  <TeamLogo abbr={p.team} size={18} />
                  <span className="truncate text-[0.85rem] font-semibold text-chalk">{p.name}</span>
                </div>
                <div className="tnum mt-1.5 flex items-baseline justify-between gap-2">
                  <span className="text-lg font-bold text-amber-soft">{moneyM(p.contractValue, lang, 1)}</span>
                  <span className="text-[0.7rem] text-fog">
                    {p.guaranteed ? `${lang === "ja" ? "保証" : "guar."} ${moneyM(p.guaranteed, lang, 1)}` : ""}
                  </span>
                </div>
                <div className="mt-1 truncate text-[0.7rem] text-fog">
                  {p.contractType} · {p.contractThrough}
                </div>
              </Link>
            ))}
        </div>
      </Panel>
    </div>
  );
}
