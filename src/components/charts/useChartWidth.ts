"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Measures the rendered width of the wrapper element so SVG charts can size
 * their viewBox 1:1 with CSS pixels (no preserveAspectRatio letterboxing).
 * ResizeObserver fires once on observe, so the first paint after mount is correct.
 */
export function useChartWidth(fallback = 800) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setWidth(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width: Math.max(320, width) };
}
