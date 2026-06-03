import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { getRankingsServer } from "@/lib/api-server";
import SectionHeading from "@/components/SectionHeading";
import { teamLogoByName } from "@/lib/team-logos";
import type { RankingPlayer, MlbRankingPlayer } from "@/lib/api";

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

function JapaneseRankingRow({ player, rank, locale, statLabel, statValue }: {
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
      className="flex items-center gap-4 px-4 py-3 bg-surface-card border border-surface-border rounded hover:border-gold hover:shadow-float transition-all group">
      <span className={`w-9 h-9 flex items-center justify-center rounded font-sans font-bold text-sm tabular-nums flex-shrink-0 ${
        rank === 1 ? "bg-gold text-navy" :
        rank <= 3 ? "bg-navy text-white" :
        "bg-surface-muted text-ink-muted"
      }`}>{rank}</span>
      <div className="w-8 h-11 rounded overflow-hidden bg-surface-muted flex-shrink-0 border border-surface-border">
        {player.photo_url ? (
          <Image src={player.photo_url} alt={displayName} width={32} height={44} className="w-full h-full object-cover object-center" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg">⚾</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-navy group-hover:text-gold-dark transition-colors truncate">{displayName}</p>
        <p className="font-sans text-xs uppercase tracking-wide text-ink-muted truncate">{teamDisplay} · {player.position}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-sans text-lg font-bold text-navy tabular-nums">{statValue}</p>
        <p className="font-sans text-[11px] uppercase tracking-wide text-ink-muted">{statLabel}</p>
      </div>
    </Link>
  );
}

function MlbRankingRow({ player, rank, statLabel, statValue, locale }: {
  player: MlbRankingPlayer;
  rank: number;
  statLabel: string;
  statValue: string;
  locale: string;
}) {
  const displayName = locale === "ja" && player.name_ja ? player.name_ja : player.name_en;
  const logoUrl = teamLogoByName(player.team_en);

  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-surface-card border border-surface-border rounded">
      <span className={`w-9 h-9 flex items-center justify-center rounded font-sans font-bold text-sm tabular-nums flex-shrink-0 ${
        rank === 1 ? "bg-gold text-navy" :
        rank <= 3 ? "bg-navy text-white" :
        "bg-surface-muted text-ink-muted"
      }`}>{rank}</span>

      {/* Team logo */}
      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={player.team_en} width={32} height={32} className="object-contain" />
        ) : (
          <div className="w-8 h-8 bg-surface-muted rounded border border-surface-border flex items-center justify-center">
            <span className="font-sans text-[10px] font-bold text-ink-muted uppercase">
              {player.team_en.slice(0, 3)}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-navy truncate">{displayName}</p>
        <p className="font-sans text-xs uppercase tracking-wide text-ink-muted truncate">{player.team_en}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-sans text-lg font-bold text-navy tabular-nums">{statValue}</p>
        <p className="font-sans text-[11px] uppercase tracking-wide text-ink-muted">{statLabel}</p>
      </div>
    </div>
  );
}

export default async function RankingsPage({ params: { locale } }: RankingsPageProps) {
  const t = await getTranslations("rankings");
  const rankings = await fetchRankings();

  return (
    <div className="space-y-12 max-w-2xl mx-auto">
      <SectionHeading kicker={t("season", { year: rankings?.season ?? "" })} title={t("title")} />

      {!rankings ? (
        <div className="text-center py-16 font-serif text-ink-muted">{t("loadFailed")}</div>
      ) : (
        <>
          {/* ---- MLB全体ランキング ---- */}
          <section className="space-y-6">
            <h2 className="font-sans text-base font-bold uppercase tracking-wide text-navy border-b-2 border-gold pb-2 inline-block">
              {t("mlbTitle")}
            </h2>

            {/* MLB Batting */}
            <div>
              <h3 className="font-sans text-sm font-semibold uppercase tracking-wide text-ink-muted mb-3">
                {t("battingLabel")}
              </h3>
              {rankings.mlb_batting.length === 0 ? (
                <p className="font-serif text-ink-muted text-center py-6">{t("noData")}</p>
              ) : (
                <div className="space-y-2">
                  {rankings.mlb_batting.map((player, i) => (
                    <MlbRankingRow
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
            </div>

            {/* MLB Pitching */}
            <div>
              <h3 className="font-sans text-sm font-semibold uppercase tracking-wide text-ink-muted mb-3">
                {t("pitchingLabel")}
              </h3>
              {rankings.mlb_pitching.length === 0 ? (
                <p className="font-serif text-ink-muted text-center py-6">{t("noData")}</p>
              ) : (
                <div className="space-y-2">
                  {rankings.mlb_pitching.map((player, i) => (
                    <MlbRankingRow
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
            </div>
          </section>

          {/* ---- 日本人選手ランキング ---- */}
          <section className="space-y-6">
            <h2 className="font-sans text-base font-bold uppercase tracking-wide text-navy border-b-2 border-gold pb-2 inline-block">
              {t("japaneseTitle")}
            </h2>

            {/* Japanese Batting */}
            <div>
              <h3 className="font-sans text-sm font-semibold uppercase tracking-wide text-ink-muted mb-3">
                {t("battingLabel")}
              </h3>
              {rankings.batting.length === 0 ? (
                <p className="font-serif text-ink-muted text-center py-6">{t("noData")}</p>
              ) : (
                <div className="space-y-2">
                  {rankings.batting.map((player, i) => (
                    <JapaneseRankingRow
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
            </div>

            {/* Japanese Pitching */}
            <div>
              <h3 className="font-sans text-sm font-semibold uppercase tracking-wide text-ink-muted mb-3">
                {t("pitchingLabel")}
              </h3>
              {rankings.pitching.length === 0 ? (
                <p className="font-serif text-ink-muted text-center py-6">{t("noData")}</p>
              ) : (
                <div className="space-y-2">
                  {rankings.pitching.map((player, i) => (
                    <JapaneseRankingRow
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
            </div>
          </section>
        </>
      )}
    </div>
  );
}
