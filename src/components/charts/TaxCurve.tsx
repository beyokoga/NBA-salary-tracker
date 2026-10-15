"use client";

import { useState } from "react";
import { useChartWidth } from "./useChartWidth";
import { moneyM } from "@/lib/format";
import { useLang } from "@/i18n";
import { luxuryTax } from "@/lib/tax";
import type { SeasonLines } from "@/lib/types";

/** Tax bill as a function of tax salary, with the current position marked. */
export function TaxCurve({
  lines,
  taxSalary,
  repeater,
  includeApron,
  height = 250,
}: {
  lines: SeasonLines;
  taxSalary: number;
  repeater: boolean;
  includeApron: boolean;
  height?: number;
}) {
  const { lang } = useLang();
  const [hover, setHover] = useState<number | null>(null);
  const { ref: wrapRef, width: W } = useChartWidth(780);
  const H = height;
  const padL = 64;
  const padR = 18;
  const padT = 14;
  const padB = 32;
  const iw = W - padL - padR;
  const ih = H - padT - padB;

  const x0 = lines.tax;
  const x1 = Math.max(lines.apron2 + 20_000_000, taxSalary + 10_000_000);
  const samples = 90;
  const bill = (v: number) => {
    const r = luxuryTax(v, lines, repeater);
    return includeApron ? r.total : r.bracketTax;
  };
  const ys = Array.from({ length: samples + 1 }, (_, i) => bill(x0 + ((x1 - x0) * i) / samples));
  const y1 = Math.max(...ys, bill(Math.max(taxSalary, x0))) * 1.08;

  const X = (v: number) => padL + ((Math.min(Math.max(v, x0), x1) - x0) / (x1 - x0)) * iw;
  const Y = (v: number) => padT + ih - (v / y1) * ih;

  const path = Array.from({ length: samples + 1 }, (_, i) => {
    const v = x0 + ((x1 - x0) * i) / samples;
    return `${i === 0 ? "M" : "L"}${X(v)},${Y(bill(v))}`;
  }).join(" ");

  const marks = [
    { v: lines.apron1, label: moneyM(lines.apron1, lang, 1), color: "#f5a524" },
    { v: lines.apron2, label: moneyM(lines.apron2, lang, 1), color: "#ff5d73" },
  ];

  const hoverSalary = hover !== null ? x0 + ((hover - padL) / iw) * (x1 - x0) : null;
  const markerSalary = Math.max(taxSalary, x0);

  return (
    <div ref={wrapRef} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
        role="img"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          setHover(((e.clientX - rect.left) / rect.width) * W);
        }}
      >
        <defs>
          <linearGradient id="taxcurve-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5a524" stopOpacity="0.36" />
            <stop offset="100%" stopColor="#f5a524" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {Array.from({ length: 5 }, (_, i) => {
          const v = (y1 * i) / 4;
          return (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={Y(v)} y2={Y(v)} stroke="#1e2942" opacity="0.6" />
              <text x={padL - 8} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="#7c8aab" fontFamily="ui-monospace, monospace">
                {moneyM(v, lang, 0)}
              </text>
            </g>
          );
        })}

        {Array.from({ length: 6 }, (_, i) => {
          const v = x0 + ((x1 - x0) * i) / 5;
          return (
            <text key={i} x={X(v)} y={H - 11} textAnchor={i === 0 ? "start" : i === 5 ? "end" : "middle"} fontSize="11" fill="#7c8aab" fontFamily="ui-monospace, monospace">
              {moneyM(v, lang, 0)}
            </text>
          );
        })}

        {marks.map((m) =>
          m.v <= x1 ? (
            <g key={m.v}>
              <line x1={X(m.v)} x2={X(m.v)} y1={padT} y2={padT + ih} stroke={m.color} strokeDasharray="5 4" opacity="0.55" />
              <text x={X(m.v) + 4} y={padT + 11} fontSize="10" fill={m.color} fontWeight="700">
                {m.label}
              </text>
            </g>
          ) : null,
        )}

        <path d={`${path} L${X(x1)},${Y(0)} L${X(x0)},${Y(0)} Z`} fill="url(#taxcurve-fill)" />
        <path d={path} fill="none" stroke="#ffc861" strokeWidth="2.6" strokeLinejoin="round" />

        {/* current position */}
        <line x1={X(markerSalary)} x2={X(markerSalary)} y1={padT} y2={padT + ih} stroke="#35d0e0" strokeWidth="1.6" strokeDasharray="3 3" />
        <circle cx={X(markerSalary)} cy={Y(bill(markerSalary))} r="5.4" fill="#05070f" stroke="#35d0e0" strokeWidth="2.4" />

        {hoverSalary !== null && hoverSalary >= x0 && hoverSalary <= x1 && (
          <g>
            <line x1={X(hoverSalary)} x2={X(hoverSalary)} y1={padT} y2={padT + ih} stroke="#8b98b8" opacity="0.4" />
            <circle cx={X(hoverSalary)} cy={Y(bill(hoverSalary))} r="3.6" fill="#ffc861" />
          </g>
        )}
      </svg>

      <div className="mt-1 flex min-h-[2rem] flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-line/70 bg-ink-2/70 px-3 py-2 text-[0.74rem]">
        {hoverSalary !== null && hoverSalary >= x0 && hoverSalary <= x1 ? (
          <>
            <span className="tnum text-fog-2">{moneyM(hoverSalary, lang, 1)}</span>
            <span className="tnum font-semibold text-amber-soft">→ {moneyM(bill(hoverSalary), lang, 2)}</span>
            <span className="tnum text-fog">
              {lang === "ja" ? "実効税率" : "effective"} ${(bill(hoverSalary) / Math.max(1, hoverSalary - lines.tax)).toFixed(2)}
              {lang === "ja" ? " / 超過1ドルあたり" : " per $1 over"}
            </span>
          </>
        ) : (
          <span className="tnum text-fog">
            {moneyM(markerSalary, lang, 2)} → <span className="font-semibold text-cyan">{moneyM(bill(markerSalary), lang, 2)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
