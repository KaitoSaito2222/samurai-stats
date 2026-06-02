import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getJapanesePlayersServer, getTodayGamesServer } from "@/lib/api-server";
import PlayerCard from "@/components/PlayerCard";
import GameCard from "@/components/GameCard";
import SectionHeading from "@/components/SectionHeading";
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
    <div className="space-y-14">
      {/* Hero */}
      <section className="relative overflow-hidden rounded bg-navy text-white">
        {/* Decorative gold framing */}
        <div className="pointer-events-none absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-gold via-gold/40 to-transparent" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative px-6 py-16 sm:px-12 sm:py-20 max-w-3xl">
          <div className="flex items-center gap-3 mb-5">
            <span className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              {t("kicker")}
            </span>
            <span className="h-px w-12 bg-gold" />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold leading-[1.1] mb-5 text-balance">
            {t("title")}
          </h1>
          <p className="font-serif text-lg text-white/70 mb-9 max-w-xl leading-relaxed">
            {t("subtitle")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/${locale}/players`}
              className="px-6 py-3 bg-gold text-navy font-sans text-sm font-semibold uppercase tracking-wide rounded-lg hover:bg-gold-dark transition-colors"
            >
              {t("exploreCta")}
            </Link>
            <Link
              href={`/${locale}/rankings`}
              className="px-6 py-3 border border-white/30 text-white font-sans text-sm font-semibold uppercase tracking-wide rounded-lg hover:border-gold hover:text-gold transition-colors"
            >
              {t("rankingsCta")}
            </Link>
          </div>
        </div>
      </section>

      {/* Today's Games */}
      <section>
        <SectionHeading
          kicker={tGames("live")}
          title={t("todayGames")}
          action={
            <Link
              href={`/${locale}/games`}
              className="font-sans text-sm uppercase tracking-wide text-gold-dark hover:text-navy transition-colors"
            >
              {t("browseByDate")} →
            </Link>
          }
        />
        {games.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 bg-surface-card rounded border border-surface-border text-center">
            <span className="text-4xl mb-3">⚾</span>
            <p className="font-serif text-ink-muted">{tGames("noGamesToday")}</p>
            <Link
              href={`/${locale}/games`}
              className="mt-3 font-sans text-sm uppercase tracking-wide text-gold-dark hover:text-navy"
            >
              {t("browseByDate")} →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <GameCard key={game.id} game={game} locale={locale} />
            ))}
          </div>
        )}
      </section>

      {/* Featured Players */}
      <section>
        <SectionHeading
          kicker={t("kicker")}
          title={t("featuredPlayers")}
          action={
            <Link
              href={`/${locale}/players`}
              className="font-sans text-sm uppercase tracking-wide text-gold-dark hover:text-navy transition-colors"
            >
              {t("viewAll")} →
            </Link>
          }
        />
        {players.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 bg-surface-card rounded border border-surface-border text-center">
            <span className="text-4xl mb-3">🏟️</span>
            <p className="font-serif text-ink-muted">{t("fetchFailed")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {players.map((player) => (
              <PlayerCard key={player.id} player={player} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
