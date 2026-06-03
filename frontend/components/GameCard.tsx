"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { Game } from "@/lib/api";
import { teamLogoByName } from "@/lib/team-logos";

interface GameCardProps {
  game: Game;
  locale: string;
}

const statusStyles: Record<string, string> = {
  live:      "text-gold-dark",
  final:     "text-ink-muted",
  scheduled: "text-navy",
  postponed: "text-ink-muted",
  cancelled: "text-red-500",
};

function formatGameTime(gameTimeUtc: string | null, locale: string): string | null {
  if (!gameTimeUtc) return null;
  try {
    const date = new Date(gameTimeUtc);
    const timeZone = locale === "ja" ? "Asia/Tokyo" : Intl.DateTimeFormat().resolvedOptions().timeZone;
    return date.toLocaleTimeString(locale === "ja" ? "ja-JP" : "en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: locale !== "ja",
    });
  } catch {
    return null;
  }
}

function TeamLogo({ teamNameEn, size = 32 }: { teamNameEn: string; size?: number }) {
  const logoUrl = teamLogoByName(teamNameEn);
  if (!logoUrl) {
    return (
      <div
        className="flex items-center justify-center bg-surface-muted rounded border border-surface-border text-xs font-sans font-bold text-ink-muted uppercase"
        style={{ width: size, height: size, fontSize: size * 0.3 }}
      >
        {teamNameEn.slice(0, 3)}
      </div>
    );
  }
  // Use img tag for SVG (next/image doesn't serve SVGs without dangerouslyAllowSVG)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={teamNameEn}
      width={size}
      height={size}
      className="object-contain flex-shrink-0"
    />
  );
}

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
  const hasScore = game.home_score != null && game.away_score != null;
  const isLiveOrFinal = game.status === "live" || game.status === "final";
  const players = game.japanese_players ?? [];
  const gameTime = formatGameTime(game.game_time, locale);

  return (
    <Link
      href={`/${locale}/games/${game.id}`}
      className="group block bg-surface-card border border-surface-border rounded transition-all duration-200 hover:border-gold hover:shadow-float overflow-hidden"
    >
      {/* Status bar */}
      <div className="px-4 py-2 bg-surface-muted border-b border-surface-border flex items-center justify-between">
        <span
          className={`flex items-center gap-1.5 font-sans text-xs font-semibold uppercase tracking-wide ${
            statusStyles[game.status] ?? statusStyles.scheduled
          }`}
        >
          {game.status === "live" && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          )}
          {statusLabel[game.status] ?? game.status}
          {game.status === "live" && game.inning != null && (
            <span className="ml-1 font-normal">
              {t("inningLabel", { inning: game.inning })}
            </span>
          )}
        </span>
        {gameTime && game.status === "scheduled" && (
          <span className="font-sans text-xs text-ink-muted tabular-nums">
            {gameTime}
            {t("tzSuffix") && (
              <span className="ml-1 text-ink-muted/60">{t("tzSuffix")}</span>
            )}
          </span>
        )}
        {!gameTime && !isLiveOrFinal && (
          <span className="font-sans text-xs text-ink-muted tabular-nums">{game.game_date}</span>
        )}
      </div>

      {/* Teams and scores */}
      <div className="px-4 py-3 space-y-3">
        {/* Away team row */}
        <div className="flex items-center gap-3">
          <TeamLogo teamNameEn={game.away_team_en} size={32} />
          <span className="font-display font-bold text-navy flex-1 truncate">{awayTeam}</span>
          {(isLiveOrFinal && hasScore) && (
            <span className={`font-sans text-2xl font-bold tabular-nums ${
              game.away_score! > game.home_score! ? "text-navy" : "text-ink-muted"
            }`}>
              {game.away_score}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-surface-border" />

        {/* Home team row */}
        <div className="flex items-center gap-3">
          <TeamLogo teamNameEn={game.home_team_en} size={32} />
          <span className="font-display font-bold text-navy flex-1 truncate">{homeTeam}</span>
          {(isLiveOrFinal && hasScore) && (
            <span className={`font-sans text-2xl font-bold tabular-nums ${
              game.home_score! > game.away_score! ? "text-navy" : "text-ink-muted"
            }`}>
              {game.home_score}
            </span>
          )}
        </div>
      </div>

      {/* Venue */}
      {game.venue && (
        <div className="px-4 pb-2">
          <p className="font-sans text-xs text-ink-muted truncate">📍 {game.venue}</p>
        </div>
      )}

      {/* Japanese players */}
      {players.length > 0 && (
        <div className="px-4 py-3 border-t border-surface-border bg-surface-muted/50">
          <div className="flex items-center gap-2 flex-wrap">
            {players.slice(0, 5).map((player) => {
              const name = locale === "ja" && player.name_ja ? player.name_ja : player.name_en;
              return (
                <div
                  key={player.id}
                  className="flex items-center gap-1.5"
                  title={name}
                >
                  <div className="w-6 h-6 rounded overflow-hidden bg-surface-muted flex-shrink-0 border border-surface-border">
                    {player.photo_url ? (
                      <Image
                        src={player.photo_url}
                        alt={name}
                        width={24}
                        height={24}
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs">⚾</div>
                    )}
                  </div>
                  {players.length === 1 && (
                    <span className="font-sans text-xs text-ink-muted truncate max-w-[80px]">{name}</span>
                  )}
                </div>
              );
            })}
            {players.length > 1 && (
              <span className="font-sans text-xs text-ink-muted">
                {t("playersInGame", { count: players.length })}
              </span>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}
