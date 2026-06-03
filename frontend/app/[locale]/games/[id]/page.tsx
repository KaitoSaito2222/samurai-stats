import { getTranslations } from "next-intl/server";
import { getGameServer, getGameBoxscoreServer } from "@/lib/api-server";
import BoxScore from "@/components/games/BoxScore";

interface GameDetailPageProps {
  params: { locale: string; id: string };
}

export default async function GameDetailPage({ params: { locale, id } }: GameDetailPageProps) {
  const t = await getTranslations("games");
  const tErrors = await getTranslations("errors");

  const gameRes = await getGameServer(id).catch(() => null);
  const game = gameRes?.data ?? null;

  // Only fetch the box score once we know the game exists — avoids hitting the
  // MLB Stats API (and spamming error logs) for invalid game IDs.
  const boxscoreRes = game ? await getGameBoxscoreServer(id).catch(() => null) : null;
  const boxscore = boxscoreRes?.data ?? null;

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <span className="text-6xl">⚾</span>
        <p className="font-display text-2xl text-navy">{tErrors("notFound")}</p>
      </div>
    );
  }

  const homeTeam = locale === "ja" && game.home_team_ja ? game.home_team_ja : game.home_team_en;
  const awayTeam = locale === "ja" && game.away_team_ja ? game.away_team_ja : game.away_team_en;

  const statusLabel = {
    live: t("live"),
    final: t("final"),
    scheduled: t("scheduled"),
    postponed: t("postponed"),
    cancelled: t("cancelled"),
  }[game.status] ?? game.status;

  const statusColor = {
    live: "text-gold-dark",
    final: "text-ink-muted",
    scheduled: "text-navy",
    postponed: "text-ink-muted",
    cancelled: "text-error",
  }[game.status] ?? "text-ink-muted";

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Scoreboard card */}
      <div className="bg-surface-card border border-surface-border rounded overflow-hidden">
        <div className="bg-navy text-white px-8 py-3 flex items-center justify-center">
          <span className="flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-wide text-gold">
            {game.status === "live" && <span className="inline-block w-2 h-2 bg-gold rounded-full animate-pulse" />}
            {statusLabel}
            {game.status === "live" && game.inning && ` · ${game.inning}回`}
          </span>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-3 items-center gap-4">
            {/* Away team */}
            <div className="text-center">
              <p className="font-display text-xl font-bold text-navy">{awayTeam}</p>
              <p className="font-sans text-xs uppercase tracking-wide text-ink-muted mt-1">{t("away")}</p>
            </div>

            {/* Score */}
            <div className="text-center">
              {game.home_score != null && game.away_score != null ? (
                <p className="font-display text-5xl font-bold text-navy tabular-nums">
                  {game.away_score}<span className="text-surface-outline mx-1">–</span>{game.home_score}
                </p>
              ) : (
                <p className={`font-sans text-xl uppercase tracking-wide ${statusColor}`}>vs</p>
              )}
            </div>

            {/* Home team */}
            <div className="text-center">
              <p className="font-display text-xl font-bold text-navy">{homeTeam}</p>
              <p className="font-sans text-xs uppercase tracking-wide text-ink-muted mt-1">{t("home")}</p>
            </div>
          </div>

          {game.venue && (
            <p className="text-center font-serif text-sm text-ink-muted mt-6">📍 {game.venue}</p>
          )}
          <p className="text-center font-sans text-sm text-ink-muted/70 tabular-nums mt-1">{game.game_date}</p>
        </div>
      </div>

      {/* Box Score */}
      {boxscore && (
        <BoxScore
          boxscore={boxscore}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          locale={locale}
        />
      )}
    </div>
  );
}
