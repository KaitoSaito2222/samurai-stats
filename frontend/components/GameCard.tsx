"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Game } from "@/lib/api";

interface GameCardProps {
  game: Game;
  locale: string;
}

const statusStyles: Record<string, string> = {
  live:      "bg-green-50 text-green-700 border-green-200",
  final:     "bg-slate-100 text-slate-600 border-slate-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  postponed: "bg-yellow-50 text-yellow-700 border-yellow-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

export default function GameCard({ game, locale }: GameCardProps) {
  const t = useTranslations("games");

  const statusLabel: Record<string, string> = {
    live:      t("live"),
    final:     t("final"),
    scheduled: t("scheduled"),
    postponed: t("postponed"),
    cancelled: t("postponed"),
  };

  const homeTeam = locale === "ja" && game.home_team_ja ? game.home_team_ja : game.home_team_en;
  const awayTeam = locale === "ja" && game.away_team_ja ? game.away_team_ja : game.away_team_en;
  const isLiveOrFinal = game.status === "live" || game.status === "final";

  return (
    <Link
      href={`/${locale}/games/${game.id}`}
      className="block bg-surface-card border border-surface-border rounded-xl p-4 space-y-3 hover:bg-surface-muted transition-all shadow-sm hover:shadow-md"
    >
      {/* Status badge */}
      <div className="flex justify-between items-center">
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
            statusStyles[game.status] ?? statusStyles.scheduled
          }`}
        >
          {game.status === "live" && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-600 mr-1.5 animate-pulse" />
          )}
          {statusLabel[game.status] ?? game.status}
        </span>
        {game.status === "live" && game.inning && (
          <span className="text-slate-600 text-xs">{game.inning}回</span>
        )}
        {!isLiveOrFinal && (
          <span className="text-slate-600 text-xs">{game.game_date}</span>
        )}
      </div>

      {/* Teams and scores */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-900 truncate">{awayTeam}</span>
          {isLiveOrFinal && (
            <span className="text-xl font-bold text-slate-900 tabular-nums">
              {game.away_score ?? 0}
            </span>
          )}
        </div>
        <div className="border-t border-surface-border" />
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-900 truncate">{homeTeam}</span>
          {isLiveOrFinal && (
            <span className="text-xl font-bold text-slate-900 tabular-nums">
              {game.home_score ?? 0}
            </span>
          )}
        </div>
      </div>

      {game.venue && (
        <p className="text-xs text-slate-600 truncate">{game.venue}</p>
      )}
    </Link>
  );
}
