"use client";

import { useState } from "react";
import { cls } from "@/lib/format";
import { useChartWidth } from "./useChartWidth";

export interface LinePoint {
  x: string;
  y: number | null;
  meta?: string;
}

export interface LineSeries {
  id: string;
  label: string;
  color: string;
  points: LinePoint[];
  dashed?: boolean;
  area?: boolean;
  width?: number;
}

export interface ThresholdLine {
  label: string;
  color: string;
  /** value in data units (when y is numeric) */
  at: number;
}

/**
 * Small dependency-free SVG line chart with hover readout.
 * `formatY` receives the raw value; `yMin`/`yMax` default to the data extent.
 */
export function LineChart({
  categories,
  series,
  formatY,
  height = 260,
  yMin,
  yMax,
  thresholds = [],
  yTicks = 4,
  className = "",
  markerLabel,
}: {
  categories: string[];
  series: LineSeries[];
  formatY: (v: number) => string;
  height?: number;
  yMin?: number;
  yMax?: number;
  thresholds?: ThresholdLine[];
  yTicks?: number;
  className?: string;
  markerLabel?: (x: string) => string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const { ref: wrapRef, width: W } = useChartWidth(820);
  const H = height;
  const padL = 62;
  const padR = 16;
  const padT = 14;
  const padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const values = series.flatMap((s) => s.points.map((p) => p.y).filter((v): v is number => v !== null));
  const allValues = [...values, ...thresholds.map((t) => t.at)];
  const lo = yMin ?? Math.min(...allValues);
  const hi = yMax ?? Math.max(...allValues);
  const span = hi - lo || 1;
  const pad = span * 0.08;
  const min = yMin ?? lo - pad;
  const max = yMax ?? hi + pad;

  const xAt = (i: number) => padL + (categories.length === 1 ? innerW / 2 : (i / (categories.length - 1)) * innerW);
  const yAt = (v: number) => padT + innerH - ((v - min) / (max - min)) * innerH;

  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => min + ((max - min) * i) / yTicks);

  return (
    <div ref={wrapRef} className={cls("relative", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
        role="img"
        onMouseLeave={() => setHoverIdx(null)}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * W;
          let best = 0;
          let bestDist = Infinity;
          categories.forEach((_, i) => {
            const d = Math.abs(xAt(i) - x);
            if (d < bestDist) {
              bestDist = d;
              best = i;
            }
          });
          setHoverIdx(best);
        }}
      >
        <defs>
          {series.map((s) => (
            <linearGradient key={s.id} id={`grad-${s.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.34" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
            </linearGradient>
          ))}
        </defs>

        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={yAt(v)} y2={yAt(v)} stroke="#1e2942" strokeWidth="1" opacity={i === 0 ? 0.9 : 0.55} />
            <text x={padL - 8} y={yAt(v) + 4} textAnchor="end" fontSize="11" fill="#7c8aab" fontFamily="ui-monospace, monospace">
              {formatY(v)}
            </text>
          </g>
        ))}

        {thresholds.map((th) => (
          <g key={th.label}>
            <line
              x1={padL}
              x2={W - padR}
              y1={yAt(th.at)}
              y2={yAt(th.at)}
              stroke={th.color}
              strokeWidth="1.2"
              strokeDasharray="5 4"
              opacity="0.75"
            />
            <text x={W - padR} y={yAt(th.at) - 5} textAnchor="end" fontSize="10.5" fill={th.color} fontWeight="600">
              {th.label}
            </text>
          </g>
        ))}

        {categories.map((c, i) => (
          <text
            key={c + i}
            x={xAt(i)}
            y={H - 9}
            textAnchor={i === 0 ? "start" : i === categories.length - 1 ? "end" : "middle"}
            fontSize="11"
            fill={hoverIdx === i ? "#eef2fb" : "#7c8aab"}
            fontFamily="ui-monospace, monospace"
          >
            {markerLabel ? markerLabel(c) : c}
          </text>
        ))}

        {series.map((s) => {
          const pts = s.points
            .map((p, i) => (p.y === null ? null : { i, x: xAt(i), y: yAt(p.y), p }))
            .filter(Boolean) as { i: number; x: number; y: number; p: LinePoint }[];
          if (!pts.length) return null;
          const d = pts.map((q, idx) => `${idx === 0 ? "M" : "L"}${q.x},${q.y}`).join(" ");
          return (
            <g key={s.id}>
              {s.area && (
                <path
                  d={`${d} L${pts[pts.length - 1].x},${padT + innerH} L${pts[0].x},${padT + innerH} Z`}
                  fill={`url(#grad-${s.id})`}
                />
              )}
              <path
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth={s.width ?? 2.4}
                strokeDasharray={s.dashed ? "5 4" : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {pts.map((q) => (
                <circle
                  key={q.i}
                  cx={q.x}
                  cy={q.y}
                  r={hoverIdx === q.i ? 5.2 : 3.2}
                  fill="#05070f"
                  stroke={s.color}
                  strokeWidth="2.2"
                />
              ))}
            </g>
          );
        })}

        {hoverIdx !== null && (
          <line x1={xAt(hoverIdx)} x2={xAt(hoverIdx)} y1={padT} y2={padT + innerH} stroke="#8b98b8" strokeWidth="1" opacity="0.45" />
        )}
      </svg>

      {hoverIdx !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-[9rem] rounded-lg border border-line bg-ink/95 px-2.5 py-2 text-[0.72rem] shadow-xl"
          style={{
            left: `${Math.min(78, Math.max(2, (xAt(hoverIdx) / W) * 100 - 8))}%`,
          }}
        >
          <div className="mb-1 font-semibold text-chalk">{categories[hoverIdx]}</div>
          {series.map((s) => {
            const p = s.points[hoverIdx];
            return (
              <div key={s.id} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                <span className="text-fog">{s.label}</span>
                <span className="tnum ml-auto font-semibold text-chalk">
                  {p?.y === null || p?.y === undefined ? "—" : formatY(p.y)}
                </span>
              </div>
            );
          })}
          {series[0]?.points[hoverIdx]?.meta && (
            <div className="mt-1 text-[0.66rem] text-fog">{series[0].points[hoverIdx].meta}</div>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5 text-[0.72rem] text-fog">
            <span
              className="inline-block h-[3px] w-4 rounded-full"
              style={{ background: s.color, opacity: s.dashed ? 0.6 : 1 }}
            />
            {s.label}
          </span>
        ))}
        {thresholds.map((th) => (
          <span key={th.label} className="flex items-center gap-1.5 text-[0.72rem] text-fog">
            <span className="inline-block h-0 w-4 border-t-2 border-dashed" style={{ borderColor: th.color }} />
            {th.label}
          </span>
        ))}
      </div>
    </div>
  );
}
