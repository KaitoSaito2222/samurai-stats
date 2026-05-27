"use client";

import { useTranslations } from "next-intl";
import type { Game } from "@/lib/api";

interface GameCardProps {
  game: Game;
  locale: string;
}

const statusStyles: Record<string, string> = {
  Live: "bg-green-500/20 text-green-400 border-green-500/30",
  Final: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  Scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Postponed: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

export default function GameCard({ game, locale }: GameCardProps) {
  const t = useTranslations("games");

  const statusLabel: Record<string, string> = {
    Live: t("live"),
    Final: t("final"),
    Scheduled: t("scheduled"),
    Postponed: t("postponed"),
  };

  const formatGameTime = (utcString: string): string => {
    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return new Date(utcString).toLocaleTimeString(locale === "ja" ? "ja-JP" : "en-US", {
        timeZone: userTz,
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const isLiveOrFinal = game.status === "Live" || game.status === "Final";

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4 space-y-3">
      {/* Status badge */}
      <div className="flex justify-between items-center">
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
            statusStyles[game.status] ?? statusStyles.Scheduled
          }`}
        >
          {game.status === "Live" && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 animate-pulse" />
          )}
          {statusLabel[game.status] ?? game.status}
        </span>
        {!isLiveOrFinal && (
          <span className="text-slate-500 text-xs">{formatGameTime(game.startTimeUtc)}</span>
        )}
        {game.status === "Live" && game.inning && (
          <span className="text-slate-500 text-xs">
            {game.inningHalf === "top" ? "▲" : "▼"} {game.inning}
          </span>
        )}
      </div>

      {/* Teams and scores */}
      <div className="space-y-2">
        {/* Away team */}
        <div className="flex items-center justify-between">
          <span className="font-medium text-white">{game.awayTeam.name}</span>
          {isLiveOrFinal && (
            <span className="text-xl font-bold text-white tabular-nums">
              {game.awayTeam.score ?? 0}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-surface-border" />

        {/* Home team */}
        <div className="flex items-center justify-between">
          <span className="font-medium text-white">{game.homeTeam.name}</span>
          {isLiveOrFinal && (
            <span className="text-xl font-bold text-white tabular-nums">
              {game.homeTeam.score ?? 0}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
