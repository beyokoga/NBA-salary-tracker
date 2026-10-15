import type { Lang } from "./types";

/** Locale used for number/date rendering per UI language. */
export function localeOf(lang: Lang): string {
  return lang === "ja" ? "ja-JP" : "en-US";
}

/**
 * Compact money in millions: 220_840_000 -> "$220.8M"
 * `dec` controls decimals; large values stay in $M (never switch to $B) so the
 * whole site reads on one scale.
 */
export function moneyM(value: number | null | undefined, lang: Lang = "en", dec = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const n = value / 1_000_000;
  return `$${n.toLocaleString(localeOf(lang), { minimumFractionDigits: dec, maximumFractionDigits: dec })}M`;
}

/**
 * Billions when the value is >= $1B, otherwise millions.
 * Used for league-wide aggregates where $5,885.8M reads badly.
 */
export function moneyBig(value: number | null | undefined, lang: Lang = "en", decM = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (Math.abs(value) >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toLocaleString(localeOf(lang), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}B`;
  }
  return moneyM(value, lang, decM);
}

/** Full dollars: 58_456_566 -> "$58,456,566" */
export function money(value: number | null | undefined, lang: Lang = "en"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `$${Math.round(value).toLocaleString(localeOf(lang))}`;
}

/** Adaptive: exact dollars under 1M, otherwise $M with 2 decimals. */
export function moneySmart(value: number | null | undefined, lang: Lang = "en"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (Math.abs(value) < 1_000_000) return money(value, lang);
  return moneyM(value, lang, 2);
}

/** Signed money in millions, e.g. +$10.8M / -$3.2M */
export function deltaM(value: number | null | undefined, lang: Lang = "en", dec = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const n = value / 1_000_000;
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}$${Math.abs(n).toLocaleString(localeOf(lang), {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })}M`;
}

export function pct(value: number | null | undefined, lang: Lang = "en", dec = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toLocaleString(localeOf(lang), {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })}%`;
}

export function int(value: number | null | undefined, lang: Lang = "en"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Math.round(value).toLocaleString(localeOf(lang));
}

export function rate(value: number | null | undefined, lang: Lang = "en"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `$${value.toLocaleString(localeOf(lang), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function record(wins: number | null, losses: number | null): string {
  if (wins === null || wins === undefined || losses === null || losses === undefined) return "—";
  return `${wins}-${losses}`;
}

/** "2026-09-13" -> localised medium date */
export function dateLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function seasonToRange(season: string): string {
  const [start, end] = season.split("-");
  return `${start}–${end.length === 2 ? `20${end}` : end}`;
}

export function cls(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
