import { getTranslations } from "next-intl/server";
import { getJapanesePlayersServer } from "@/lib/api-server";
import PlayerCard from "@/components/PlayerCard";
import SectionHeading from "@/components/SectionHeading";
import type { Player } from "@/lib/api";

interface PlayersPageProps {
  params: { locale: string };
  searchParams: { page?: string };
}

async function fetchPlayers(page: number): Promise<{ items: Player[]; total: number }> {
  try {
    const res = await getJapanesePlayersServer(page, 20);
    return res.data;
  } catch {
    return { items: [], total: 0 };
  }
}

export default async function PlayersPage({ params: { locale }, searchParams }: PlayersPageProps) {
  const t = await getTranslations("players");
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const { items: players, total } = await fetchPlayers(page);
  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <div className="space-y-8">
      <SectionHeading kicker={t("position")} title={t("title")} />

      {players.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-surface-card rounded border border-surface-border text-center">
          <span className="text-5xl mb-4">🏟️</span>
          <p className="font-serif text-ink-muted text-lg">{t("noResults")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {players.map((player) => (
              <PlayerCard key={player.id} player={player} locale={locale} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="flex justify-center items-center gap-2 pt-4 font-sans">
              {page > 1 && (
                <a
                  href={`/${locale}/players?page=${page - 1}`}
                  className="px-4 py-2 bg-surface-card hover:border-gold rounded-lg text-navy border border-surface-border transition-colors"
                >
                  ←
                </a>
              )}
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <a
                    key={pageNum}
                    href={`/${locale}/players?page=${pageNum}`}
                    className={`px-4 py-2 rounded-lg border transition-colors tabular-nums ${
                      pageNum === page
                        ? "bg-navy border-navy text-white font-bold"
                        : "bg-surface-card hover:border-gold border-surface-border text-navy"
                    }`}
                  >
                    {pageNum}
                  </a>
                );
              })}
              {page < totalPages && (
                <a
                  href={`/${locale}/players?page=${page + 1}`}
                  className="px-4 py-2 bg-surface-card hover:border-gold rounded-lg text-navy border border-surface-border transition-colors"
                >
                  →
                </a>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
