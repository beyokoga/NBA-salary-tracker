"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/i18n";
import { GLOSSARY, type GlossaryId } from "@/lib/glossary";

/**
 * Inline glossary term: tap/click the dotted-underline label to open a
 * one-tap explanation popover. Closes on outside click / Escape / re-tap.
 */
export function Term({
  id,
  align = "left",
  children,
}: {
  id: GlossaryId;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const g = GLOSSARY[id][lang];
  return (
    <span ref={ref} className="relative inline-block max-w-full">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        className="cursor-help truncate underline decoration-fog/50 decoration-dotted underline-offset-[3px] transition hover:decoration-amber"
      >
        {children}
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute top-full z-50 mt-1.5 block w-60 rounded-xl border border-line bg-panel-2 p-3 text-left normal-case tracking-normal shadow-2xl shadow-black/50 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <span className="mb-1 block text-[11px] font-bold text-amber-soft">{g.term}</span>
          <span className="block text-[11px] leading-relaxed text-fog-2">{g.text}</span>
        </span>
      )}
    </span>
  );
}
