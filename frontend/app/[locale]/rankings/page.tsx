import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { getRankingsServer } from "@/lib/api-server";
import type { RankingPlayer } from "@/lib/api";

interface RankingsPageProps {
  params: { locale: string };
}

async function fetchRankings() {
  try {
    const res = await getRankingsServer();
    return res.data;
  } catch {
    return null;
  }
}

function RankingRow({ player, rank, locale, statLabel, statValue }: {
  player: RankingPlayer;
  rank: number;
  locale: string;
  statLabel: string;
  statValue: string;
}) {
  const displayName = locale === "ja" && player.name_ja ? player.name_ja : player.name_en;
  const teamDisplay = locale === "ja" && player.team_ja ? player.team_ja : player.team_en;

  return (
    <Link href={`/${locale}/players/${player.player_id}`}
      className="flex items-center gap-4 p-4 bg-surface-card border border-surface-border rounded-xl hover:shadow-md transition-shadow group">
      <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm flex-shrink-0 ${
        rank === 1 ? "bg-yellow-400 text-yellow-900" :
        rank === 2 ? "bg-slate-300 text-slate-700" :
        rank === 3 ? "bg-amber-600 text-white" :
        "bg-slate-100 text-slate-500"
      }`}>{rank}</span>
      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
        {player.photo_url ? (
          <Image src={player.photo_url} alt={displayName} width={40} height={40} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg">⚾</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-900 group-hover:text-brand transition-colors truncate">{displayName}</p>
        <p className="text-xs text-slate-500 truncate">{teamDisplay} · {player.position}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-bold text-slate-900">{statValue}</p>
        <p className="text-xs text-slate-500">{statLabel}</p>
      </div>
    </Link>
  );
}

export default async function RankingsPage({ params: { locale } }: RankingsPageProps) {
  const t = await getTranslations("rankings");
  const rankings = await fetchRankings();

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>

      {!rankings ? (
        <div className="text-center py-16 text-slate-500">{t("loadFailed")}</div>
      ) : (
        <div className="space-y-8">
          {/* Batting */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">{t("battingTitle")}</h2>
            {rankings.batting.length === 0 ? (
              <p className="text-slate-500 text-center py-8">{t("noData")}</p>
            ) : (
              <div className="space-y-2">
                {rankings.batting.map((player, i) => (
                  <RankingRow
                    key={player.player_id}
                    player={player}
                    rank={i + 1}
                    locale={locale}
                    statLabel="OPS"
                    statValue={player.ops != null ? player.ops.toFixed(3) : "—"}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Pitching */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4">{t("pitchingTitle")}</h2>
            {rankings.pitching.length === 0 ? (
              <p className="text-slate-500 text-center py-8">{t("noData")}</p>
            ) : (
              <div className="space-y-2">
                {rankings.pitching.map((player, i) => (
                  <RankingRow
                    key={player.player_id}
                    player={player}
                    rank={i + 1}
                    locale={locale}
                    statLabel="ERA"
                    statValue={player.era != null ? player.era.toFixed(2) : "—"}
                  />
                ))}
              </div>
            )}
          </section>

          <p className="text-xs text-slate-400 text-center">{t("season", { year: rankings.season })}</p>
        </div>
      )}
    </div>
  );
}
