"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { Game } from "@/lib/api";

interface GameCardProps {
  game: Game;
  locale: string;
}

const statusStyles: Record<string, string> = {
  live:      "text-gold-dark",
  final:     "text-ink-muted",
  scheduled: "text-navy",
  postponed: "text-ink-muted",
  cancelled: "text-error",
};

export default function GameCard({ game, locale }: GameCardProps) {
  const t = useTranslations("games");

  const statusLabel: Record<string, string> = {
    live:      t("live"),
    final:     t("final"),
    scheduled: t("scheduled"),
    postponed: t("postponed"),
    cancelled: t("cancelled"),
  };

  const homeTeam = locale === "ja" && game.home_team_ja ? game.home_team_ja : game.home_team_en;
  const awayTeam = locale === "ja" && game.away_team_ja ? game.away_team_ja : game.away_team_en;
  const isLiveOrFinal = game.status === "live" || game.status === "final";
  const players = game.japanese_players ?? [];

  return (
    <Link
      href={`/${locale}/games/${game.id}`}
      className="group block bg-surface-card border border-surface-border rounded p-5 space-y-3 transition-all duration-200 hover:border-gold hover:shadow-float"
    >
      {/* Status row */}
      <div className="flex justify-between items-center">
        <span
          className={`flex items-center gap-1.5 font-sans text-xs font-semibold uppercase tracking-wide ${
            statusStyles[game.status] ?? statusStyles.scheduled
          }`}
        >
          {game.status === "live" && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          )}
          {statusLabel[game.status] ?? game.status}
        </span>
        {game.status === "live" && game.inning && (
          <span className="font-sans text-xs text-ink-muted">{game.inning}回</span>
        )}
        {!isLiveOrFinal && (
          <span className="font-sans text-xs text-ink-muted tabular-nums">{game.game_date}</span>
        )}
      </div>

      {/* Teams and scores */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-display font-bold text-navy truncate">{awayTeam}</span>
          {isLiveOrFinal && (
            <span className="font-sans text-2xl font-bold text-navy tabular-nums">
              {game.away_score ?? 0}
            </span>
          )}
        </div>
        <div className="border-t border-surface-border" />
        <div className="flex items-center justify-between gap-2">
          <span className="font-display font-bold text-navy truncate">{homeTeam}</span>
          {isLiveOrFinal && (
            <span className="font-sans text-2xl font-bold text-navy tabular-nums">
              {game.home_score ?? 0}
            </span>
          )}
        </div>
      </div>

      {game.venue && (
        <p className="font-sans text-xs text-ink-muted truncate">{game.venue}</p>
      )}

      {/* Japanese players in this game */}
      {players.length > 0 && (
        <div className="pt-3 border-t border-surface-border flex items-center gap-1.5 flex-wrap">
          {players.map((player) => {
            const name = locale === "ja" && player.name_ja ? player.name_ja : player.name_en;
            return (
              <div
                key={player.id}
                title={name}
                className="w-7 h-7 rounded overflow-hidden bg-surface-muted flex-shrink-0 border border-surface-border"
              >
                {player.photo_url ? (
                  <Image
                    src={player.photo_url}
                    alt={name}
                    width={28}
                    height={28}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs">⚾</div>
                )}
              </div>
            );
          })}
          <span className="font-sans text-xs text-ink-muted truncate">
            {players.length === 1
              ? (locale === "ja" ? players[0].name_ja || players[0].name_en : players[0].name_en)
              : `${players.length}${locale === "ja" ? "人出場" : " players"}`}
          </span>
        </div>
      )}
    </Link>
  );
}
