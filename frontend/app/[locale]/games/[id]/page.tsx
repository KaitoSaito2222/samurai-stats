import { getTranslations } from "next-intl/server";
import { getGameServer } from "@/lib/api-server";

interface GameDetailPageProps {
  params: { locale: string; id: string };
}

export default async function GameDetailPage({ params: { locale, id } }: GameDetailPageProps) {
  const t = await getTranslations("games");
  const tErrors = await getTranslations("errors");

  let game = null;
  try {
    const res = await getGameServer(id);
    game = res.data;
  } catch {
    /* not found or API error */
  }

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <span className="text-6xl">⚾</span>
        <p className="text-xl text-slate-500">{tErrors("notFound")}</p>
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
    live: "bg-red-100 text-brand border border-red-200",
    final: "bg-slate-100 text-slate-600 border border-slate-200",
    scheduled: "bg-blue-50 text-blue-700 border border-blue-200",
    postponed: "bg-amber-50 text-amber-700 border border-amber-200",
    cancelled: "bg-slate-100 text-slate-500 border border-slate-200",
  }[game.status] ?? "bg-slate-100 text-slate-600";

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Scoreboard card */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-center mb-6">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
            {game.status === "live" && <span className="inline-block w-2 h-2 bg-brand rounded-full mr-2 animate-pulse" />}
            {statusLabel}
            {game.status === "live" && game.inning && ` · ${game.inning}回`}
          </span>
        </div>

        <div className="grid grid-cols-3 items-center gap-4">
          {/* Away team */}
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">{awayTeam}</p>
            <p className="text-xs text-slate-500 mt-1">{t("away")}</p>
          </div>

          {/* Score */}
          <div className="text-center">
            {game.home_score != null && game.away_score != null ? (
              <p className="text-4xl font-bold text-slate-900 tabular-nums">
                {game.away_score} — {game.home_score}
              </p>
            ) : (
              <p className="text-2xl text-slate-400">vs</p>
            )}
          </div>

          {/* Home team */}
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">{homeTeam}</p>
            <p className="text-xs text-slate-500 mt-1">{t("home")}</p>
          </div>
        </div>

        {game.venue && (
          <p className="text-center text-sm text-slate-500 mt-6">📍 {game.venue}</p>
        )}
        <p className="text-center text-sm text-slate-400 mt-1">{game.game_date}</p>
      </div>

      {/* Japanese players in this game */}
      {game.japanese_players && game.japanese_players.length > 0 && (
        <div className="bg-surface-card border border-surface-border rounded-xl p-6 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-3">{t("japanesePlayers")}</h2>
          <div className="space-y-2">
            {game.japanese_players.map((p) => (
              <a key={p.player_id} href={`/${locale}/players/${p.player_id}`}
                className="flex items-center gap-3 py-2 hover:text-brand transition-colors">
                <span className="text-brand">🇯🇵</span>
                <span className="font-medium text-slate-900">
                  {locale === "ja" && p.name_ja ? p.name_ja : p.name_en}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
