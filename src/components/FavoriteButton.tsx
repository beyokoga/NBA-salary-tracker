"use client";

import { useLang } from "@/i18n";
import { cls } from "@/lib/format";
import { toggleFavorite, useFavorites, type FavoriteKind } from "@/lib/favorites";

export function FavoriteButton({ kind, favoriteKey, name, compact = false }: {
  kind: FavoriteKind;
  favoriteKey: string;
  name: string;
  compact?: boolean;
}) {
  const { t } = useLang();
  const favorites = useFavorites();
  const selected = favorites[kind].includes(favoriteKey);
  const label = t(selected ? "favorites.remove" : "favorites.add", { name });
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      title={label}
      className={cls(
        "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-lg border px-2 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber",
        selected ? "border-amber/50 bg-amber/12 text-amber-soft" : "border-line bg-panel/70 text-fog-2 hover:border-amber/60 hover:text-chalk",
      )}
      onClick={(event) => {
        event.stopPropagation();
        toggleFavorite(kind, favoriteKey);
      }}
    >
      <span aria-hidden="true" className="text-lg">{selected ? "★" : "☆"}</span>
      {!compact && <span>{t(selected ? "favorites.saved" : "favorites.save")}</span>}
    </button>
  );
}

export function FavoritesStorageNotice() {
  const { t } = useLang();
  const { persistent } = useFavorites();
  return persistent ? null : <p role="status" className="rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber-soft">{t("favorites.sessionOnly")}</p>;
}
