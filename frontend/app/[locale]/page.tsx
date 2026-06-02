import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getJapanesePlayersServer, getTodayGamesServer } from "@/lib/api-server";
import PlayerCard from "@/components/PlayerCard";
import GameCard from "@/components/GameCard";
import type { Player, Game } from "@/lib/api";

interface HomePageProps {
  params: { locale: string };
}

async function fetchHomeData(): Promise<{ players: Player[]; games: Game[] }> {
  try {
    const [playersRes, gamesRes] = await Promise.allSettled([
      getJapanesePlayersServer(1, 6),
      getTodayGamesServer(),
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
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy via-navy-dark to-[#0a1a33] px-6 py-12 sm:px-10 sm:py-16 text-center shadow-sm">
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full bg-brand/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-navy/40 blur-3xl" />
        <div className="relative">
          <p className="inline-flex items-center gap-1.5 text-brand font-semibold text-xs sm:text-sm uppercase tracking-[0.2em] mb-3">
            <span>⚾</span> MLB Japanese Players
          </p>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 text-balance tracking-tight">
            {t("title")}
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto">{t("subtitle")}</p>
        </div>
      </section>

      {/* Today's Games */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2.5 text-xl font-bold text-slate-900">
            <span className="w-1 h-5 rounded-full bg-brand" />
            {t("todayGames")}
          </h2>
          <Link
            href={`/${locale}/games`}
            className="text-sm text-brand hover:underline font-medium"
          >
            {t("browseByDate")} →
          </Link>
        </div>
        {games.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-surface-card rounded-xl border border-surface-border text-center">
            <span className="text-4xl mb-3">⚾</span>
            <p className="text-slate-500">{tGames("noGamesToday")}</p>
            <Link
              href={`/${locale}/games`}
              className="mt-3 text-sm text-brand hover:underline"
            >
              {t("browseByDate")} →
            </Link>
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
        <h2 className="flex items-center gap-2.5 text-xl font-bold text-slate-900 mb-4">
          <span className="w-1 h-5 rounded-full bg-brand" />
          {t("featuredPlayers")}
        </h2>
        {players.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-surface-card rounded-xl border border-surface-border text-center">
            <span className="text-4xl mb-3">🏟️</span>
            <p className="text-slate-500">{t("fetchFailed")}</p>
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
