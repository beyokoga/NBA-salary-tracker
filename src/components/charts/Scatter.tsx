"use client";

import Link from "next/link";
import { useState } from "react";
import { useChartWidth } from "./useChartWidth";

export interface ScatterPoint {
  id: string;
  x: number;
  y: number;
  color: string;
  label: string;
  sub?: string;
  href?: string;
}

/** Salary-vs-winning scatter. Quadrant guides make the "smart money" corner obvious. */
export function Scatter({
  points,
  xLabel,
  yLabel,
  formatX,
  formatY,
  height = 320,
  quadrantNote,
  showIds = true,
}: {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  formatX: (v: number) => string;
  formatY: (v: number) => string;
  height?: number;
  quadrantNote?: { x: number; y: number; label: string }[];
  showIds?: boolean;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const { ref: wrapRef, width: W } = useChartWidth(760);
  const H = height;
  const padL = 60;
  const padR = 18;
  const padT = 16;
  const padB = 34;
  const iw = W - padL - padR;
  const ih = H - padT - padB;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xLo = Math.min(...xs);
  const xHi = Math.max(...xs);
  const yLo = Math.min(...ys);
  const yHi = Math.max(...ys);
  const xPad = (xHi - xLo) * 0.08 || 1;
  const yPad = (yHi - yLo) * 0.08 || 1;
  const x0 = xLo - xPad;
  const x1 = xHi + xPad;
  const y0 = Math.max(0, yLo - yPad);
  const y1 = yHi + yPad;

  const X = (v: number) => padL + ((v - x0) / (x1 - x0)) * iw;
  const Y = (v: number) => padT + ih - ((v - y0) / (y1 - y0)) * ih;

  const xTicks = 5;
  const yTicks = 4;
  const active = points.find((p) => p.id === hover);

  return (
    <div ref={wrapRef} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img">
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const v = y0 + ((y1 - y0) * i) / yTicks;
          return (
            <g key={`y${i}`}>
              <line x1={padL} x2={W - padR} y1={Y(v)} y2={Y(v)} stroke="#1e2942" strokeWidth="1" opacity="0.6" />
              <text x={padL - 8} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="#7c8aab" fontFamily="ui-monospace, monospace">
                {formatY(v)}
              </text>
            </g>
          );
        })}
        {Array.from({ length: xTicks + 1 }, (_, i) => {
          const v = x0 + ((x1 - x0) * i) / xTicks;
          return (
            <g key={`x${i}`}>
              <line x1={X(v)} x2={X(v)} y1={padT} y2={padT + ih} stroke="#1e2942" strokeWidth="1" opacity="0.4" />
              <text x={X(v)} y={H - 12} textAnchor={i === 0 ? "start" : i === xTicks ? "end" : "middle"} fontSize="11" fill="#7c8aab" fontFamily="ui-monospace, monospace">
                {formatX(v)}
              </text>
            </g>
          );
        })}

        {quadrantNote?.map((q) => (
          <text key={q.label} x={X(q.x)} y={Y(q.y)} textAnchor="middle" fontSize="10.5" fill="#4d5b7c" fontWeight="600">
            {q.label}
          </text>
        ))}

        {/* league averages */}
        <line
          x1={X(xs.reduce((a, b) => a + b, 0) / xs.length)}
          x2={X(xs.reduce((a, b) => a + b, 0) / xs.length)}
          y1={padT}
          y2={padT + ih}
          stroke="#8b98b8"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity="0.4"
        />
        <line
          x1={padL}
          x2={W - padR}
          y1={Y(ys.reduce((a, b) => a + b, 0) / ys.length)}
          y2={Y(ys.reduce((a, b) => a + b, 0) / ys.length)}
          stroke="#8b98b8"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity="0.4"
        />

        {points.map((p) => (
          <g
            key={p.id}
            onMouseEnter={() => setHover(p.id)}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: "pointer" }}
          >
            <circle cx={X(p.x)} cy={Y(p.y)} r={hover === p.id ? 11 : 8} fill={p.color} opacity="0.16" />
            <circle
              cx={X(p.x)}
              cy={Y(p.y)}
              r={hover === p.id ? 6 : 4.4}
              fill={p.color}
              stroke="#05070f"
              strokeWidth="1.4"
            />
            {showIds && <text
              x={X(p.x)}
              y={Y(p.y) - (hover === p.id ? 14 : 10)}
              textAnchor="middle"
              fontSize="10"
              fill={hover === p.id ? "#eef2fb" : "#6f7d9e"}
              fontWeight="700"
              fontFamily="ui-monospace, monospace"
            >
              {p.id}
            </text>}
          </g>
        ))}

        <text x={padL} y={H - 1} fontSize="10.5" fill="#6f7d9e">
          {xLabel}
        </text>
        <text x={4} y={padT + 4} fontSize="10.5" fill="#6f7d9e">
          {yLabel}
        </text>
      </svg>

      <div className="mt-1 flex min-h-[2.2rem] flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line/70 bg-ink-2/70 px-3 py-2 text-[0.74rem]">
        {active ? (
          <>
            <span className="font-semibold text-chalk">{active.label}</span>
            <span className="tnum text-fog-2">
              {formatX(active.x)} · {formatY(active.y)}
            </span>
            {active.sub && <span className="text-fog">{active.sub}</span>}
            {active.href && (
              <Link href={active.href} className="link-soft ml-auto">
                →
              </Link>
            )}
          </>
        ) : (
          <span className="text-fog">{quadrantNote?.[0]?.label ?? ""}</span>
        )}
      </div>
    </div>
  );
}
