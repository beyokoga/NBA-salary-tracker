"use client";

import Link from "next/link";
import { useLang } from "@/i18n";
import { allPlayers, league } from "@/lib/data";
import { moneyM } from "@/lib/format";
import { playerFavoriteKey, useFavorites } from "@/lib/favorites";
import { FavoriteButton, FavoritesStorageNotice } from "./FavoriteButton";
import { TeamLogo } from "./TeamLogo";
import { Panel } from "./ui";

export function FavoritesView() {
  const { t, lang } = useLang();
  const favorites = useFavorites();
  // Resolve keys against current data. Removed entities remain in storage but
  // never render as broken links or placeholders.
  const teams = league.teams.filter((team) => favorites.teams.includes(team.slug));
  const players = allPlayers.filter((player) => favorites.players.includes(playerFavoriteKey(player.teamSlug, player.id)));

  return (
    <div className="space-y-5">
      <header className="panel px-4 py-5 sm:px-6">
        <h1 className="text-2xl font-bold text-chalk">{t("nav.favorites")}</h1>
        <p className="mt-2 text-sm text-fog">{t("favorites.subtitle")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="btn" href="/teams">{t("nav.teams")} →</Link>
          <Link className="btn" href="/players">{t("nav.players")} →</Link>
        </div>
        <p className="mt-3 text-sm text-fog">{t("favorites.searchHint")}</p>
      </header>
      <FavoritesStorageNotice />
      <Panel title={t("favorites.teams", { n: teams.length })}>
        {teams.length === 0 ? (
          <p className="py-5 text-sm text-fog">{t("favorites.emptyTeams")} <Link className="text-amber-soft underline" href="/teams">{t("nav.teams")} →</Link></p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <li key={team.slug} className="flex min-w-0 items-center gap-3 rounded-lg border border-line bg-panel-2/50 p-3">
                <Link href={`/teams/${team.slug}`} className="flex min-w-0 flex-1 items-center gap-3 rounded focus-visible:outline-2 focus-visible:outline-amber">
                  <TeamLogo abbr={team.abbr} size={36} />
                  <span className="min-w-0">
                    <span className="block break-words font-semibold text-chalk">{team.name}</span>
                    <span className="block text-xs text-fog">{team.abbr} · {moneyM(team.payroll, lang, 1)}</span>
                  </span>
                </Link>
                <FavoriteButton kind="teams" favoriteKey={team.slug} name={team.name} compact />
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title={t("favorites.players", { n: players.length })}>
        {players.length === 0 ? (
          <p className="py-5 text-sm text-fog">{t("favorites.emptyPlayers")} <Link className="text-amber-soft underline" href="/players">{t("nav.players")} →</Link></p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((player) => (
              <li key={playerFavoriteKey(player.teamSlug, player.id)} className="flex min-w-0 items-center gap-3 rounded-lg border border-line bg-panel-2/50 p-3">
                <Link href={`/players?${new URLSearchParams({ q: player.name, team: player.team })}`} className="flex min-w-0 flex-1 items-center gap-3 rounded focus-visible:outline-2 focus-visible:outline-amber">
                  <TeamLogo abbr={player.team} size={32} />
                  <span className="min-w-0">
                    <span className="block break-words font-semibold text-chalk">{player.name}</span>
                    <span className="block text-xs text-fog">{player.team} · {moneyM(player.salary, lang, 1)}</span>
                  </span>
                </Link>
                <FavoriteButton kind="players" favoriteKey={playerFavoriteKey(player.teamSlug, player.id)} name={player.name} compact />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
