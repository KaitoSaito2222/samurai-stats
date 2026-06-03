import { getTranslations } from "next-intl/server";
import { getGamesByDateServer } from "@/lib/api-server";
import GameCard from "@/components/GameCard";
import DateNavigation from "@/components/DateNavigation";
import type { Game } from "@/lib/api";

export const dynamic = "force-dynamic";

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
  // Always default to today when no date param is given.
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

  return (
    <div className="space-y-8">
      <DateNavigation
        locale={locale}
        dateStr={dateStr}
        today={today}
        displayDate={formatDisplayDate(dateStr, locale)}
        prevDate={prevDate}
        nextDate={nextDate}
      />

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
