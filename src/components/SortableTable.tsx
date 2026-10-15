"use client";

import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { cls } from "@/lib/format";
import { useLang } from "@/i18n";

export type Column<T> = {
  key: string;
  header: ReactNode;
  /** raw value used for sorting; numbers sort numerically, strings by locale */
  sortValue?: (row: T) => number | string | null;
  render: (row: T, index: number) => ReactNode;
  align?: "left" | "right";
  hideBelow?: "sm" | "md" | "lg" | "xl";
  width?: string;
  nowrap?: boolean;
};

export type RowConfig<T> = {
  key: (row: T) => string;
  /** whole row becomes a link (still allows an expandable detail row) */
  href?: (row: T) => string | null;
  expandable?: (row: T) => ReactNode;
  rowClass?: (row: T) => string | undefined;
};

const HIDE: Record<NonNullable<Column<never>["hideBelow"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

export function SortableTable<T>({
  columns,
  rows,
  rowConfig,
  initialSort,
  initialDir = "desc",
  pageSize,
  empty,
  dense = false,
  maxHeight,
  onRowNavigate,
}: {
  columns: Column<T>[];
  rows: T[];
  rowConfig: RowConfig<T>;
  initialSort?: string;
  initialDir?: "asc" | "desc";
  pageSize?: number;
  empty?: ReactNode;
  dense?: boolean;
  maxHeight?: string;
  /** when provided, row clicks call this instead of router.push */
  onRowNavigate?: (href: string) => void;
}) {
  const { t, lang } = useLang();
  const router = useRouter();
  const [sortKey, setSortKey] = useState<string | null>(initialSort ?? null);
  const [dir, setDir] = useState<"asc" | "desc">(initialDir);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = col.sortValue?.(a);
      const bv = col.sortValue?.(b);
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), lang === "ja" ? "ja" : "en");
      return dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, dir, columns, lang]);

  const paged = pageSize ? sorted.slice(page * pageSize, page * pageSize + pageSize) : sorted;
  const pages = pageSize ? Math.ceil(sorted.length / pageSize) : 1;
  const colSpan = columns.length + (rowConfig.expandable ? 1 : 0);

  const toggleSort = (key: string) => {
    if (sortKey === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDir("desc");
    }
    setPage(0);
  };

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!sorted.length) {
    return <div className="px-4 py-10 text-center text-sm text-fog">{empty ?? t("common.noResults")}</div>;
  }

  return (
    <div>
      <div className="border-t border-line/50 px-4 py-1.5 text-[0.66rem] text-fog/60 sm:hidden">{t("common.swipe")}</div>
      <div className={cls("scroll-x", maxHeight && "overflow-y-auto")} style={maxHeight ? { maxHeight } : undefined}>
        <table className="grid-table">
          <thead>
            <tr>
              {columns.map((c) => {
                const sortable = !!c.sortValue;
                const on = sortKey === c.key;
                return (
                  <th
                    key={c.key}
                    onClick={sortable ? () => toggleSort(c.key) : undefined}
                    className={cls(
                      sortable && "sortable",
                      c.align === "right" && "right",
                      c.hideBelow && HIDE[c.hideBelow],
                      on && "!text-amber-soft",
                    )}
                    style={{ width: c.width }}
                    aria-sort={on ? (dir === "asc" ? "ascending" : "descending") : undefined}
                  >
                    <span className={cls("inline-flex items-center gap-1", c.align === "right" && "flex-row-reverse")}>
                      {c.header}
                      {sortable && (
                        <span className={cls("text-[0.6rem]", on ? "opacity-100" : "opacity-25")}>
                          {on ? (dir === "asc" ? "▲" : "▼") : "▼"}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
              {rowConfig.expandable && <th aria-label="details" className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => {
              const key = rowConfig.key(row);
              const href = rowConfig.href?.(row) ?? null;
              const detail = rowConfig.expandable?.(row) ?? null;
              const isOpen = expanded.has(key);

              const go = () => {
                if (detail) toggleExpand(key);
                if (href) (onRowNavigate ?? ((h: string) => router.push(h)))(href);
              };

              return (
                <Fragment key={key}>
                  <tr
                    onClick={href || detail ? go : undefined}
                    className={cls(Boolean(href || detail) && "row-link", rowConfig.rowClass?.(row))}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cls(
                          c.align === "right" && "right tnum",
                          c.hideBelow && HIDE[c.hideBelow],
                          c.nowrap && "whitespace-nowrap",
                          dense && "py-1.5",
                        )}
                      >
                        {c.render(row, page * (pageSize ?? 0) + i)}
                      </td>
                    ))}
                    {detail && (
                      <td className="text-center text-fog">
                        <span className={cls("inline-block text-sm transition-transform", isOpen && "rotate-45")}>+</span>
                      </td>
                    )}
                  </tr>
                  {detail && isOpen && (
                    <tr>
                      <td colSpan={colSpan} className="!border-b !bg-ink-2/85 !p-0">
                        <div className="px-3 py-3 sm:px-4">{detail}</div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {pageSize && pages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 px-4 py-2.5 text-[0.75rem]">
          <span className="tnum text-fog">
            {t("common.showing", {
              n: sorted.length,
              a: page * pageSize + 1,
              b: Math.min(sorted.length, (page + 1) * pageSize),
            })}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" className="btn px-2.5 py-1" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              ←
            </button>
            <span className="tnum px-2 text-fog-2">
              {page + 1} / {pages}
            </span>
            <button
              type="button"
              className="btn px-2.5 py-1"
              disabled={page >= pages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
