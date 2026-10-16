"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { league } from "@/lib/data";
import { cls, dateLabel } from "@/lib/format";
import { useLang } from "@/i18n";
import { GlobalSearch, type SearchTarget } from "./GlobalSearch";

export interface ShellTab {
  id: string;
  label: string;
  active: boolean;
  onSelect: () => void;
}

export function Shell({
  children,
  tabs,
  onHome,
  title,
  onSearchSelect,
}: {
  children: React.ReactNode;
  tabs?: ShellTab[];
  onHome?: () => void;
  /** current section name shown as the app title in the header */
  title?: string;
  onSearchSelect?: (target: SearchTarget) => void;
}) {
  const { t, lang, setLang } = useLang();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center gap-2.5 px-3 py-2.5 sm:px-6">
          {tabs && (
            <button
              type="button"
              aria-label={t("shell.menu")}
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-panel/80 text-fog-2 transition hover:border-amber/60 hover:text-chalk"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M2.5 5h11M2.5 8.5h7.5M2.5 12h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
          {onHome ? (
            <button type="button" onClick={onHome} className="flex min-w-0 items-center gap-2.5">
              <Logo lang={lang} t={t} title={title} />
            </button>
          ) : (
            <Link href="/" className="flex min-w-0 items-center gap-2.5">
              <Logo lang={lang} t={t} title={title} />
            </Link>
          )}

          <div className="ml-auto flex items-center gap-2">
            {onSearchSelect && <GlobalSearch onSelect={onSearchSelect} />}
            <div className="flex overflow-hidden rounded-lg border border-line">
              {(["ja", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={cls(
                    "px-2.5 py-1.5 text-[0.72rem] font-bold uppercase transition",
                    lang === l ? "bg-amber text-[#181008]" : "text-fog hover:text-chalk",
                  )}
                  aria-pressed={lang === l}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {tabs && open && (
        <>
          <div
            className="anim-fade fixed inset-0 z-50 bg-black/65 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={t("shell.menu")}
            className="anim-drawer fixed inset-y-0 left-0 z-50 flex w-[292px] max-w-[86vw] flex-col border-r border-line bg-ink-2/95 backdrop-blur-xl"
          >
            <div className="flex items-center gap-2 border-b border-line/70 px-4 py-3">
              <Logo lang={lang} t={t} />
              <button
                type="button"
                aria-label={t("common.close")}
                onClick={() => setOpen(false)}
                className="ml-auto grid h-8 w-8 place-items-center rounded-full border border-line text-fog transition hover:border-amber/60 hover:text-chalk"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
                  <path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="px-5 pt-4">
              <span className="kicker">{t("shell.contents")}</span>
            </div>
            <nav className="mt-2 flex-1 overflow-y-auto px-2.5 pb-4" role="tablist" aria-orientation="vertical">
              {tabs.map((tab, i) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={tab.active}
                  onClick={() => {
                    setOpen(false);
                    tab.onSelect();
                  }}
                  className={cls(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[0.9rem] transition",
                    tab.active
                      ? "bg-amber/12 font-semibold text-amber-soft shadow-[inset_2px_0_0_0_var(--color-amber)]"
                      : "text-fog-2 hover:bg-panel/80 hover:text-chalk",
                  )}
                >
                  <span className="font-display w-6 shrink-0 text-[0.72rem] text-fog/60">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {tab.label}
                </button>
              ))}
            </nav>
            <div className="border-t border-line/70 px-4 py-3">
              <span className="chip">{t("dash.snapshot", { date: dateLabel(league.rosterSnapshot) })}</span>
            </div>
          </aside>
        </>
      )}

      <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-5 sm:px-6">{children}</main>

      <Footer />
    </div>
  );
}

function Logo({ lang, t, title }: { lang: "ja" | "en"; t: (k: never) => string; title?: string }) {
  return (
    <>
      <span
        aria-hidden
        className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border border-amber/40 bg-gradient-to-br from-amber/25 to-transparent text-[0.7rem] font-black text-amber-soft"
      >
        $
      </span>
      <span className="min-w-0 text-left">
        <span className="block truncate text-[0.92rem] font-bold leading-tight text-chalk">
          {title ?? t("app.name" as never)}
        </span>
        <span className="hidden text-[0.66rem] leading-tight text-fog sm:block">
          {title
            ? t("app.name" as never)
            : `${league.season} · ${league.teams.length} ${lang === "ja" ? "チーム" : "teams"}`}
        </span>
      </span>
    </>
  );
}

function Footer() {
  const { t } = useLang();
  return (
    <footer className="border-t border-line/70 bg-ink-2/70">
      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-8 text-xs leading-relaxed text-fog sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="label-xs mb-2">{t("footer.about")}</div>
          <p>{t("footer.methodology", { date: dateLabel(league.rosterSnapshot) })}</p>
          <p className="mt-2">{t("footer.disclaimer")}</p>
        </div>
        <div className="space-y-2">
          <div>
            <span className="label-xs">{t("detail.note")}: </span>
            <span className="text-fog-2">nbasalaries.com · NBA official cap memorandum · ESPN standings</span>
          </div>
          <div>
            <span className="label-xs">{t("footer.units")}</span>
          </div>
          <div className="tnum">{t("dash.updated", { date: dateLabel(league.generatedAt.slice(0, 10)) })}</div>
          <div className="text-[0.68rem] text-fog/70">{t("footer.built")}</div>
          <div className="rounded-lg border border-line/70 bg-panel/50 px-3 py-2 font-mono text-[0.7rem] text-fog-2">
            {t("footer.refresh")}
          </div>
        </div>
      </div>
    </footer>
  );
}
