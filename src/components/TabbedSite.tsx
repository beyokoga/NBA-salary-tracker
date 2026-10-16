"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, use, useCallback, useEffect } from "react";
import { freeAgency, league } from "@/lib/data";
import { useLang } from "@/i18n";
import type { DictKey } from "@/i18n";
import { Shell, type ShellTab } from "./Shell";
import type { SearchTarget } from "./GlobalSearch";
import { Dashboard } from "./Dashboard";
import { TeamsView } from "./TeamsView";
import { CompareView } from "./CompareView";
import { QuizView } from "./QuizView";
import { TeamDetail } from "./TeamDetail";
import { PlayersView } from "./PlayersView";
import { TaxLab } from "./TaxLab";
import { FreeAgencyView } from "./FreeAgencyView";
import { NewsView } from "./NewsView";
import { CapHistoryView } from "./CapHistoryView";
import { getTeam } from "@/lib/data";

const TABS: { id: string; key: DictKey }[] = [
  { id: "dash", key: "nav.dashboard" },
  { id: "teams", key: "nav.teams" },
  { id: "compare", key: "nav.compare" },
  { id: "players", key: "nav.players" },
  { id: "tax", key: "nav.tax" },
  { id: "fa", key: "nav.freeAgency" },
  { id: "news", key: "nav.news" },
  { id: "quiz", key: "nav.quiz" },
  { id: "cap", key: "nav.capHistory" },
];

/** map an in-app path to {tab, extra params} so legacy links stay usable */
function routeToTab(href: string): { tab: string; extra: Record<string, string> } | null {
  const u = new URL(href, "http://local");
  const p = u.pathname.replace(/\/+$/, "") || "/";
  const extra: Record<string, string> = {};
  u.searchParams.forEach((v, k) => {
    extra[k] = v;
  });
  if (p === "/") return { tab: "dash", extra };
  if (p === "/teams") return { tab: "teams", extra };
  const m = p.match(/^\/teams\/([a-z0-9-]+)$/);
  if (m) return { tab: "teams", extra: { ...extra, team: m[1] } };
  if (p === "/players") return { tab: "players", extra };
  if (p === "/tax") return { tab: "tax", extra };
  if (p === "/free-agency") return { tab: "fa", extra };
  if (p === "/news") return { tab: "news", extra };
  if (p === "/cap-history") return { tab: "cap", extra };
  return null;
}

export function TabbedSite() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useLang();

  const tab = params.get("tab") ?? "dash";
  const team = params.get("team");

  const go = useCallback(
    (id: string, extra: Record<string, string | null | undefined> = {}) => {
      const q = new URLSearchParams();
      if (id !== "dash") q.set("tab", id);
      for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
      router.push(`/${q.toString() ? `?${q.toString()}` : ""}`);
      window.scrollTo({ top: 0 });
    },
    [router],
  );

  const intercept = useCallback(
    (e: React.MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto")) return;
      const mapped = routeToTab(href);
      if (!mapped) return;
      e.preventDefault();
      go(mapped.tab, mapped.extra);
    },
    [go],
  );

  useEffect(() => {
    const cur = TABS.find((x) => x.id === tab);
    const want =
      cur && cur.id !== "dash" ? `${t(cur.key)} · NBA Salary Tracker` : "NBA Salary Tracker — チームサラリー完全追跡";
    const apply = () => {
      if (document.title !== want) document.title = want;
    };
    apply();
    // Next re-applies the route metadata once streaming settles; win the last write.
    const mo = new MutationObserver(apply);
    mo.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => mo.disconnect();
  }, [tab, t]);

  const handleSearchSelect = useCallback(
    (target: SearchTarget) => {
      if (target.kind === "team") {
        go("teams", { team: target.slug });
      } else {
        go("players", { q: target.player.name, team: target.player.team });
      }
    },
    [go],
  );

  const shellTabs: ShellTab[] = TABS.map((x) => ({
    id: x.id,
    label: t(x.key),
    active: tab === x.id,
    onSelect: () => go(x.id),
  }));

  let view: React.ReactNode;
  if (tab === "teams" && team) {
    view = (
      <div className="space-y-4">
        <button type="button" className="btn" onClick={() => go("teams")}>
          ← {t("nav.teams")}
        </button>
        <Suspense fallback={<div className="panel px-4 py-16 text-center text-sm text-fog">…</div>}>
          <TeamDetailLazy slug={team} />
        </Suspense>
      </div>
    );
  } else if (tab === "compare") {
    view = <CompareView />;
  } else if (tab === "teams") {
    view = <TeamsView onOpenTeam={(slug) => go("teams", { team: slug })} />;
  } else if (tab === "players") {
    view = <PlayersView key={`${params.get("q") ?? ""}|${params.get("team") ?? ""}`} />;
  } else if (tab === "tax") {
    view = <TaxLab />;
  } else if (tab === "fa") {
    view = <FreeAgencyView doc={freeAgency} />;
  } else if (tab === "news") {
    view = <NewsView />;
  } else if (tab === "quiz") {
    view = <QuizView />;
  } else if (tab === "cap") {
    view = <CapHistoryView />;
  } else {
    view = <Dashboard />;
  }

  const currentLabel = tab === "dash" ? undefined : t(TABS.find((x) => x.id === tab)?.key ?? "nav.dashboard");

  return (
    <Shell tabs={shellTabs} onHome={() => go("dash")} title={currentLabel} onSearchSelect={handleSearchSelect}>
      <div onClickCapture={intercept}>{view}</div>
    </Shell>
  );
}

function TeamDetailLazy({ slug }: { slug: string }) {
  const team = use(getTeam(slug));
  if (!team) return <div className="panel px-4 py-16 text-center text-sm text-fog">404</div>;
  return <TeamDetail team={team} lg={league} />;
}
