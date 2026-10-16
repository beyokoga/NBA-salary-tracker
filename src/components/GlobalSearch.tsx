"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { allPlayers, league } from "@/lib/data";
import { cls, moneyM } from "@/lib/format";
import { useLang } from "@/i18n";
import type { RosterPlayer, TeamSummary } from "@/lib/types";
import { TeamLogo } from "./TeamLogo";

export type SearchTarget =
  | { kind: "team"; slug: string }
  | { kind: "player"; player: RosterPlayer };

interface ResultItem {
  key: string;
  score: number;
  sortValue: number;
  title: string;
  sub: string;
  meta: string;
  teamAbbr: string;
  target: SearchTarget;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function teamScore(team: TeamSummary, needle: string): number {
  const abbr = normalize(team.abbr);
  if (abbr === needle) return 120;
  const fullName = normalize(`${team.city} ${team.nickname} ${team.name}`);
  if (fullName.startsWith(needle)) return 95;
  if (normalize(team.city).startsWith(needle) || normalize(team.nickname).startsWith(needle)) return 88;
  if (fullName.includes(needle)) return 72;
  if (normalize(`${team.conference} ${team.division}`).includes(needle)) return 35;
  return 0;
}

function playerScore(player: RosterPlayer, needle: string): number {
  const name = normalize(player.name);
  if (name.startsWith(needle)) return 112;
  if (name.includes(needle)) return 90;
  if (normalize(player.team) === needle) return 68;
  if (normalize(player.teamName).includes(needle)) return 58;
  if (normalize(player.contractType ?? "").includes(needle)) return 32;
  return 0;
}

export function GlobalSearch({ onSelect }: { onSelect: (target: SearchTarget) => void }) {
  const { t, lang } = useLang();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState(0);

  const needle = normalize(q);
  const showResults = needle.length >= 2;

  const results = useMemo<ResultItem[]>(() => {
    if (!showResults) return [];
    const items: ResultItem[] = [];

    for (const team of league.teams) {
      const score = teamScore(team, needle);
      if (score <= 0) continue;
      const conf = lang === "ja" ? (team.conference === "Eastern" ? "イースト" : "ウェスト") : team.conference;
      items.push({
        key: `team-${team.slug}`,
        score,
        sortValue: team.payroll,
        title: team.name,
        sub: `${team.abbr} · ${conf} · ${team.division}`,
        meta: moneyM(team.payroll, lang, 1),
        teamAbbr: team.abbr,
        target: { kind: "team", slug: team.slug },
      });
    }

    for (const player of allPlayers) {
      const score = playerScore(player, needle);
      if (score <= 0) continue;
      const role = [player.pos, player.position].filter(Boolean).join(" · ");
      items.push({
        key: `player-${player.team}-${player.id}`,
        score,
        sortValue: player.capHit ?? player.salary ?? 0,
        title: player.name,
        sub: `${player.teamName}${role ? ` · ${role}` : ""}`,
        meta: moneyM(player.capHit ?? player.salary, lang, 1),
        teamAbbr: player.team,
        target: { kind: "player", player },
      });
    }

    return items
      .sort((a, b) => b.score - a.score || b.sortValue - a.sortValue || a.title.localeCompare(b.title))
      .slice(0, 9);
  }, [lang, needle, showResults]);

  useEffect(() => {
    if (!open && !mobileOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [mobileOpen, open]);

  useEffect(() => {
    if (mobileOpen) mobileInputRef.current?.focus();
  }, [mobileOpen]);

  const choose = (item?: ResultItem) => {
    if (!item) return;
    onSelect(item.target);
    setQ("");
    setOpen(false);
    setMobileOpen(false);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((v) => Math.min(v + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((v) => Math.max(v - 1, 0));
    } else if (e.key === "Enter") {
      if (showResults) choose(results[active] ?? results[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setMobileOpen(false);
    }
  };

  const renderList = (id: string) => (
    <ul id={id} role="listbox" className="max-h-[min(420px,58vh)] overflow-y-auto p-1.5">
      {results.length ? (
        results.map((item, i) => (
          <li key={item.key} role="option" aria-selected={i === active}>
            <button
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(item)}
              className={cls(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition",
                i === active ? "bg-amber/12" : "hover:bg-panel/80",
              )}
            >
              <TeamLogo abbr={item.teamAbbr} size={24} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.84rem] font-semibold text-chalk">{item.title}</span>
                <span className="block truncate text-[0.68rem] text-fog">{item.sub}</span>
              </span>
              <span className="tnum shrink-0 text-[0.72rem] font-semibold text-amber-soft">{item.meta}</span>
            </button>
          </li>
        ))
      ) : (
        <li className="px-3 py-4 text-center text-[0.78rem] text-fog">{t("search.noResults")}</li>
      )}
    </ul>
  );

  return (
    <div ref={rootRef} className="relative">
      <div className="hidden sm:block sm:w-[218px] lg:w-[300px]">
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.95rem] text-fog">
            ⌕
          </span>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={t("search.placeholder")}
            aria-label={t("search.aria")}
            role="combobox"
            aria-expanded={open && showResults}
            aria-controls={`${uid}-desktop-results`}
            className="input h-9 w-full pl-8 pr-8"
          />
          {q && (
            <button
              type="button"
              aria-label={t("common.close")}
              onClick={() => setQ("")}
              className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-fog transition hover:bg-panel hover:text-chalk"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {open && showResults && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 hidden w-[360px] max-w-[86vw] rounded-xl border border-line bg-ink-2/95 shadow-2xl backdrop-blur-xl sm:block">
          {renderList(`${uid}-desktop-results`)}
        </div>
      )}

      <button
        type="button"
        aria-label={t("search.aria")}
        onClick={() => setMobileOpen(true)}
        className="grid h-9 w-9 place-items-center rounded-full border border-line bg-panel/80 text-[1rem] text-fog-2 transition hover:border-amber/60 hover:text-chalk sm:hidden"
      >
        ⌕
      </button>

      {mobileOpen && (
        <div className="fixed inset-x-3 top-[58px] z-50 rounded-xl border border-line bg-ink-2/[0.98] p-2 shadow-2xl backdrop-blur-xl sm:hidden">
          <div className="flex items-center gap-2">
            <input
              ref={mobileInputRef}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={t("search.placeholder")}
              aria-label={t("search.aria")}
              role="combobox"
              aria-expanded={showResults}
              aria-controls={`${uid}-mobile-results`}
              className="input h-10 min-w-0 flex-1"
            />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="btn h-10 shrink-0 px-3"
            >
              {t("common.close")}
            </button>
          </div>
          {showResults ? (
            renderList(`${uid}-mobile-results`)
          ) : (
            <p className="px-2 py-3 text-[0.75rem] leading-relaxed text-fog">{t("search.hint")}</p>
          )}
        </div>
      )}
    </div>
  );
}
