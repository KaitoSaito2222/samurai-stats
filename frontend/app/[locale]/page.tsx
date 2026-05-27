import { getTranslations } from "next-intl/server";
import { getJapanesePlayers, getTodayGames } from "@/lib/api";
import PlayerCard from "@/components/PlayerCard";
import GameCard from "@/components/GameCard";
import type { Player, Game } from "@/lib/api";

interface HomePageProps {
  params: { locale: string };
}

async function fetchHomeData(): Promise<{ players: Player[]; games: Game[] }> {
  try {
    const [playersRes, gamesRes] = await Promise.allSettled([
      getJapanesePlayers(1, 6),
      getTodayGames(),
    ]);

    const players =
      playersRes.status === "fulfilled" ? playersRes.value.data.items : [];
    const games =
      gamesRes.status === "fulfilled" ? gamesRes.value.data : [];

    return { players, games };
  } catch {
    return { players: [], games: [] };
  }
}

export default async function HomePage({ params: { locale } }: HomePageProps) {
  const t = await getTranslations("home");
  const tGames = await getTranslations("games");
  const { players, games } = await fetchHomeData();

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="rounded-2xl bg-gradient-to-br from-brand/20 to-surface-card border border-surface-border p-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
          {t("title")}
        </h1>
        <p className="text-lg text-slate-300">{t("subtitle")}</p>
      </section>

      {/* Today's Games */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">{t("todayGames")}</h2>
        {games.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-surface-card rounded-xl border border-surface-border text-center">
            <span className="text-4xl mb-3">⚾</span>
            <p className="text-slate-400">{tGames("noGamesToday")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((game) => (
              <GameCard key={game.id} game={game} locale={locale} />
            ))}
          </div>
        )}
      </section>

      {/* Featured Players */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">{t("featuredPlayers")}</h2>
        {players.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-surface-card rounded-xl border border-surface-border text-center">
            <span className="text-4xl mb-3">🏟️</span>
            <p className="text-slate-400">選手データを取得できませんでした</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map((player) => (
              <PlayerCard key={player.id} player={player} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
