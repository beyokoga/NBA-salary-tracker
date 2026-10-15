"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { league, news } from "@/lib/data";
import { cls, dateLabel } from "@/lib/format";
import { useLang } from "@/i18n";
import type { NewsDoc, NewsItem } from "@/lib/types";
import { Badge, Panel } from "./ui";
import { TeamLogo } from "./TeamLogo";

type TabId = "all" | "contracts" | "trades" | "other";

const TABS: { id: TabId; cats: NewsItem["category"][] | null }[] = [
  { id: "all", cats: null },
  { id: "contracts", cats: ["signing", "twoWay"] },
  { id: "trades", cats: ["trade"] },
  { id: "other", cats: ["waiver", "claim", "other"] },
];

const CAT_TONE: Record<NewsItem["category"], "mint" | "cyan" | "amber" | "rose" | "violet" | "neutral"> = {
  signing: "mint",
  twoWay: "cyan",
  trade: "amber",
  waiver: "rose",
  claim: "violet",
  other: "neutral",
};

export function NewsView() {
  const { t, lang } = useLang();
  const [tab, setTab] = useState<TabId>("all");
  const [team, setTeam] = useState("all");
  const [live, setLive] = useState<NewsDoc | null>(null);

  useEffect(() => {
    let dead = false;
    fetch("/api/news")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: NewsDoc & { source?: string } | null) => {
        if (!dead && d && d.source === "live" && Array.isArray(d.items) && d.items.length) setLive(d);
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, []);

  const doc = live ?? news;

  const active = TABS.find((x) => x.id === tab) ?? TABS[0];
  const matches = (i: NewsItem) =>
    (!active.cats || active.cats.includes(i.category)) && (team === "all" || i.abbr === team);

  const items = doc.items.filter(matches);
  const byDate = new Map<string, NewsItem[]>();
  for (const i of items) {
    const arr = byDate.get(i.date);
    if (arr) arr.push(i);
    else byDate.set(i.date, [i]);
  }
  const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));

  const countFor = (id: TabId) =>
    doc.items.filter((i) => {
      const tb = TABS.find((x) => x.id === id);
      return (!tb?.cats || tb.cats.includes(i.category)) && (team === "all" || i.abbr === team);
    }).length;

  return (
    <div className="space-y-5">
      {/* ---------------------------------------------------------- hero */}
      <section className="panel relative overflow-hidden">
        <div className="relative px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="amber">NEWS</Badge>
            <span className="chip">
              {t("news.fetched")} {dateLabel(doc.fetchedAt.slice(0, 10))}
            </span>
            <span className="chip">{t("news.count", { n: doc.items.length })}</span>
            {live && <span className="chip chip-live">{t("news.live")}</span>}
          </div>
          <h1 className="mt-3 text-2xl font-bold text-chalk sm:text-[1.7rem]">{t("news.title")}</h1>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-fog sm:text-[0.8rem]">
            {t("news.sub", { days: doc.cutoffDays })}
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------- transactions */}
      <Panel
        title={t("news.title")}
        subtitle={`${dates.length} ${lang === "ja" ? "日分" : "days"}`}
        action={
          <select className="input w-auto" value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="all">{t("news.teamAll")}</option>
            {[...league.teams]
              .sort((a, b) => a.abbr.localeCompare(b.abbr))
              .map((x) => (
                <option key={x.abbr} value={x.abbr}>
                  {x.abbr} — {x.name}
                </option>
              ))}
          </select>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          {TABS.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setTab(x.id)}
              className={cls("btn", tab === x.id && "btn-on")}
            >
              {t(`news.${x.id === "all" ? "all" : x.id}` as never)}
              <span className="tnum ml-1 opacity-70">{countFor(x.id)}</span>
            </button>
          ))}
        </div>

        {dates.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-fog">{t("news.empty")}</div>
        ) : (
          <div className="space-y-4">
            {dates.map((d) => (
              <div key={d}>
                <div className="label-xs mb-1.5 px-0.5">{dateLabel(d)}</div>
                <div className="divide-hair overflow-hidden rounded-lg border border-line/70">
                  {byDate.get(d)!.map((i, idx) => {
                    const inner = (
                      <div className="flex items-start gap-2.5 px-3 py-2.5 sm:px-4">
                        <TeamLogo abbr={i.abbr} size={20} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <Badge tone={CAT_TONE[i.category]}>{t(`news.cat.${i.category}` as never)}</Badge>
                            <span className="truncate text-[0.72rem] text-fog">{i.teamName}</span>
                          </div>
                          <p className="mt-1 text-[0.82rem] leading-relaxed text-fog-2">{i.text}</p>
                        </div>
                      </div>
                    );
                    return i.slug ? (
                      <Link
                        key={`${i.date}-${idx}`}
                        href={`/teams/${i.slug}`}
                        className="block transition hover:bg-white/[0.03]"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div key={`${i.date}-${idx}`}>{inner}</div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* ---------------------------------------------------------- headlines */}
      <Panel title={t("news.headlines")} subtitle="ESPN">
        <div className="divide-hair">
          {doc.headlines.map((h) => (
            <a
              key={h.url}
              href={h.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 transition hover:bg-white/[0.03] sm:px-5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-[0.86rem] font-semibold text-chalk">{h.title}</span>
                <span className="tnum shrink-0 text-[0.68rem] text-fog">{dateLabel(h.published)}</span>
              </div>
              {h.desc && <p className="mt-1 text-[0.74rem] leading-relaxed text-fog">{h.desc}</p>}
            </a>
          ))}
        </div>
      </Panel>
    </div>
  );
}
