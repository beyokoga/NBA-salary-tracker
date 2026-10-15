import type { SeasonLines, TaxBreakdown, TaxRow } from "./types";

/**
 * NBA luxury tax under the 2023 CBA (in force through 2026-27).
 *
 * Bracket width == the taxpayer mid-level exception for that league year.
 * Rates escalate $0.50 per bracket after the fourth.
 * Repeaters (taxpayer in 3 of the previous 4 seasons) pay +$2.00 per dollar in
 * every bracket.
 *
 * On top of the bracket tax the CBA adds apron surcharges:
 *   - $2.50 per dollar of tax salary between the tax line and the first apron
 *   - $3.50 per dollar of tax salary between the tax line and the second apron
 * Most public trackers quote the bracket tax only, so both numbers are exposed.
 */
export const STANDARD_RATES = [1.0, 1.25, 3.5, 4.75];
export const REPEATER_RATES = [3.0, 3.25, 5.5, 6.75];
export const APRON1_SURCHARGE = 2.5;
export const APRON2_SURCHARGE = 3.5;

export function rateForBracket(index: number, repeater: boolean): number {
  const table = repeater ? REPEATER_RATES : STANDARD_RATES;
  if (index < table.length) return table[index];
  return table[table.length - 1] + 0.5 * (index - (table.length - 1));
}

export function luxuryTax(
  taxSalary: number,
  lines: Pick<SeasonLines, "tax" | "apron1" | "apron2" | "mleTax">,
  repeater: boolean,
): TaxBreakdown {
  const bracket = lines.mleTax;
  const overage = Math.max(0, taxSalary - lines.tax);
  const rows: TaxRow[] = [];
  let tax = 0;
  let remaining = overage;
  let index = 0;
  let cursor = 0;

  while (remaining > 1e-6) {
    const slice = Math.min(remaining, bracket);
    const r = rateForBracket(index, repeater);
    const amount = slice * r;
    rows.push({
      bracket: index + 1,
      from: Math.round(cursor),
      to: Math.round(cursor + slice),
      rate: r,
      amount: Math.round(amount),
    });
    tax += amount;
    cursor += slice;
    remaining -= slice;
    index += 1;
  }

  const apron1Surcharge = overage > 0
    ? Math.max(0, Math.min(taxSalary, lines.apron1) - lines.tax) * APRON1_SURCHARGE
    : 0;
  const apron2Surcharge = overage > 0
    ? Math.max(0, Math.min(taxSalary, lines.apron2) - lines.tax) * APRON2_SURCHARGE
    : 0;
  const total = tax + apron1Surcharge + apron2Surcharge;

  return {
    overage: Math.round(overage),
    repeater,
    bracketTax: Math.round(tax),
    apron1Surcharge: Math.round(apron1Surcharge),
    apron2Surcharge: Math.round(apron2Surcharge),
    total: Math.round(total),
    rows,
    effectiveRate: overage ? tax / overage : 0,
    effectiveRateAllIn: overage ? total / overage : 0,
  };
}

/** Non-taxpayer share of the collected tax: 50% split evenly. */
export function taxDistribution(totalTax: number, nonTaxpayerTeams: number): number {
  if (!nonTaxpayerTeams) return 0;
  return (totalTax * 0.5) / nonTaxpayerTeams;
}

/** Roster-building restrictions triggered at each apron (2023 CBA). */
export const APRON_RESTRICTIONS = {
  first: [
    { ja: "サイン&トレードでの選手獲得ができない", en: "Cannot acquire a player via sign-and-trade" },
    { ja: "前シーズンに作ったトレード例外（TPE）が使えない", en: "Cannot use a trade exception created last season" },
    { ja: "トレードで出す年俸より多くの年俸を受け取れない", en: "Cannot take back more salary than sent out in a trade" },
    { ja: "シーズン中に解雇された選手のうち、ノンタックスペイヤーMLE超の年俸だった選手と契約できない",
      en: "Cannot sign a player waived in-season who earned more than the non-taxpayer MLE" },
  ],
  second: [
    { ja: "タックスペイヤーMLEが使えない", en: "No access to the taxpayer mid-level exception" },
    { ja: "複数選手をまとめてトレード要員にできない（年俸の合算不可）", en: "Cannot aggregate multiple players to match salary in a trade" },
    { ja: "トレードで現金を送れない", en: "Cannot send cash in trades" },
    { ja: "バイアウト市場の選手と契約できない", en: "Cannot sign players from the buyout market" },
    { ja: "7年先までのドラフト1巡目指名権をトレードできない", en: "Cannot trade a first-round pick seven years out" },
    { ja: "5年中3年でセカンドエプロン超なら、7年後の1巡目指名権が凍結／1巡目末尾に降格",
      en: "Above the second apron in 3 of 5 years: a future first-rounder freezes or drops to the end of round one" },
  ],
} as const;
