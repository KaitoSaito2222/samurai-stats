import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getGamesByDateServer } from "@/lib/api-server";
import GameCard from "@/components/GameCard";
import type { Game } from "@/lib/api";

interface GamesPageProps {
  params: { locale: string };
  searchParams: { date?: string };
}

function todayJST(): string {
  return new Intl.DateTimeFormat("sv", { timeZone: "Asia/Tokyo" }).format(new Date());
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDisplayDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  });
}

export default async function GamesPage({
  params: { locale },
  searchParams,
}: GamesPageProps) {
  const t = await getTranslations("games");

  const today = todayJST();
  const dateStr = searchParams.date ?? today;

  let games: Game[] = [];
  try {
    const res = await getGamesByDateServer(dateStr);
    games = res.data;
  } catch {
    games = [];
  }

  const prevDate = addDays(dateStr, -1);
  const nextDate = addDays(dateStr, 1);
  const isToday = dateStr === today;

  return (
    <div className="space-y-8">
      {/* Date navigation */}
      <div className="flex items-center justify-between border-b border-surface-border pb-4">
        <Link
          href={`/${locale}/games?date=${prevDate}`}
          className="flex items-center gap-1 px-4 py-2 rounded-lg bg-surface-card border border-surface-border text-navy hover:border-gold transition-colors font-sans text-sm uppercase tracking-wide"
        >
          ← {t("prevDay")}
        </Link>

        <h1 className="font-display text-xl sm:text-2xl font-bold text-navy text-center px-2">
          {formatDisplayDate(dateStr, locale)}
        </h1>

        {isToday ? (
          <div className="w-24" />
        ) : (
          <Link
            href={`/${locale}/games?date=${nextDate}`}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-surface-card border border-surface-border text-navy hover:border-gold transition-colors font-sans text-sm uppercase tracking-wide"
          >
            {t("nextDay")} →
          </Link>
        )}
      </div>

      {/* Today shortcut when browsing history */}
      {!isToday && (
        <div className="text-center">
          <Link
            href={`/${locale}/games`}
            className="font-sans text-sm uppercase tracking-wide text-gold-dark hover:text-navy transition-colors"
          >
            {t("backToToday")}
          </Link>
        </div>
      )}

      {/* Games */}
      {games.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-surface-card rounded border border-surface-border text-center">
          <span className="text-4xl mb-3">⚾</span>
          <p className="font-serif text-ink-muted">{t("noGamesOnDate")}</p>
          <p className="font-sans text-ink-muted/70 text-sm mt-1">{t("noGamesHint")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <GameCard key={game.id} game={game} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
