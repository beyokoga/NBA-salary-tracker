"use client";

import { money, moneyM, pct } from "@/lib/format";
import { useLang } from "@/i18n";
import type { DictKey } from "@/i18n";
import type { PlayerContract } from "@/lib/types";

const FIELDS: { key: DictKey; get: (p: PlayerContract) => string | null; money?: boolean; pctv?: boolean }[] = [
  { key: "pos.salary", get: (p) => (p.salary ? money(p.salary) : null), money: true },
  { key: "pos.salaryPrev", get: (p) => (p.salaryPrev ? money(p.salaryPrev) : null), money: true },
  { key: "pos.capHit", get: (p) => (p.capHit ? money(p.capHit) : null), money: true },
  { key: "pos.capShare", get: (p) => (p.capShare !== null ? pct(p.capShare, "en", 2) : null), pctv: true },
  { key: "pos.payrollShare", get: (p) => (p.teamShare !== null ? pct(p.teamShare, "en", 2) : null), pctv: true },
  { key: "pos.contractValue", get: (p) => (p.contractValue ? money(p.contractValue) : null), money: true },
  { key: "pos.guaranteed", get: (p) => (p.guaranteed ? money(p.guaranteed) : null), money: true },
  { key: "pos.contractType", get: (p) => p.contractType },
  { key: "pos.contractThrough", get: (p) => p.contractThrough },
  { key: "pos.option", get: (p) => p.option },
  { key: "pos.freeAgency", get: (p) => (p.freeAgency ? String(p.freeAgency) : null) },
  { key: "pos.age", get: (p) => (p.age !== null ? String(p.age) : null) },
  { key: "pos.position", get: (p) => p.position },
  { key: "pos.height", get: (p) => p.height },
  { key: "pos.country", get: (p) => p.country },
  { key: "pos.careerEarnings", get: (p) => (p.careerEarnings ? money(p.careerEarnings) : null), money: true },
  { key: "pos.netWorth", get: (p) => (p.netWorth ? moneyM(p.netWorth, "en", 1) : null), money: true },
];

/** Key/value grid used inside expandable roster rows. */
export function PlayerDetailGrid({ player, season }: { player: PlayerContract; season: string }) {
  const { t, lang } = useLang();
  return (
    <div className="grid gap-x-5 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {FIELDS.map((f) => {
        const raw = f.get(player);
        if (raw === null || raw === undefined || raw === "None" || raw === "") return null;
        return (
          <div key={f.key}>
            <div className="label-xs">{t(f.key, { season })}</div>
            <div className={`mt-0.5 text-[0.82rem] break-words ${f.money ? "tnum" : ""} text-fog-2`}>
              {raw === "None" ? t("pos.optionNone") : raw}
            </div>
          </div>
        );
      })}
      <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
        <div className="label-xs mb-1">{lang === "ja" ? "前季からの変化" : "Change vs. prior season"}</div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8rem]">
          <span className="tnum text-fog-2">
            {player.salaryPrev ? money(player.salaryPrev, lang) : "—"} → {player.salary ? money(player.salary, lang) : "—"}
          </span>
          {player.salaryDelta !== null && player.salaryDelta !== undefined && (
            <span className={`tnum font-semibold ${player.salaryDelta > 0 ? "text-up" : player.salaryDelta < 0 ? "text-down" : "text-fog"}`}>
              {player.salaryDelta > 0 ? "+" : "−"}
              {money(Math.abs(player.salaryDelta), lang)}
            </span>
          )}
          {player.contractValue && player.guaranteed !== null && player.contractValue !== player.guaranteed && (
            <span className="text-[0.74rem] text-fog">
              {lang === "ja" ? "保証率" : "guaranteed"}{" "}
              <span className="tnum">{pct((player.guaranteed / player.contractValue) * 100, lang, 1)}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
