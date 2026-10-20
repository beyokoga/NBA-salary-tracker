"use client";

import { useSyncExternalStore } from "react";

export const FAVORITES_STORAGE_KEY = "nba-salary-tracker:favorites:v1";
export type FavoriteKind = "teams" | "players";
export interface FavoritesSnapshot {
  teams: readonly string[];
  players: readonly string[];
  persistent: boolean;
}

const EMPTY: FavoritesSnapshot = { teams: [], players: [], persistent: true };
let cached: FavoritesSnapshot | null = null;
const listeners = new Set<() => void>();

export function playerFavoriteKey(teamSlug: string, playerId: string): string {
  return `${teamSlug}:${playerId}`;
}

function parse(raw: string | null): Pick<FavoritesSnapshot, FavoriteKind> {
  try {
    const value: unknown = raw === null ? null : JSON.parse(raw);
    if (typeof value !== "object" || value === null) return EMPTY;
    const doc = value as Record<string, unknown>;
    const strings = (input: unknown): string[] =>
      Array.isArray(input) ? [...new Set(input.filter((v): v is string => typeof v === "string" && v.length > 0))] : [];
    return { teams: strings(doc.teams), players: strings(doc.players) };
  } catch {
    return EMPTY;
  }
}

function load(): FavoritesSnapshot {
  try {
    return { ...parse(window.localStorage.getItem(FAVORITES_STORAGE_KEY)), persistent: true };
  } catch {
    return { ...(cached ?? EMPTY), persistent: false };
  }
}

export function getFavoritesSnapshot(): FavoritesSnapshot {
  if (typeof window === "undefined") return EMPTY;
  if (cached === null) cached = load();
  return cached;
}

function notify() {
  listeners.forEach((listener) => listener());
}

function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== FAVORITES_STORAGE_KEY) return;
  try {
    if (event.storageArea !== window.localStorage) return;
    cached = { ...parse(event.newValue), persistent: true };
  } catch {
    cached = { ...(cached ?? EMPTY), persistent: false };
  }
  notify();
}

export function subscribeFavorites(listener: () => void) {
  if (listeners.size === 0) {
    // Pick up changes made while all favorite controls were unmounted.
    if (cached?.persistent) cached = load();
    window.addEventListener("storage", onStorage);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function toggleFavorite(kind: FavoriteKind, key: string) {
  // Read the latest persisted value before editing, so another tab's changes
  // are retained. Keep in-memory edits when storage has become unavailable.
  const previous = getFavoritesSnapshot();
  const current = previous.persistent ? load() : previous;
  const values = current[kind];
  const next = {
    ...current,
    [kind]: values.includes(key) ? values.filter((value) => value !== key) : [...values, key],
  };
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify({ teams: next.teams, players: next.players }));
    next.persistent = true;
  } catch {
    next.persistent = false;
  }
  cached = next;
  notify();
}

export function useFavorites() {
  return useSyncExternalStore(subscribeFavorites, getFavoritesSnapshot, () => EMPTY);
}
