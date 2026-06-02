import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { getPlayerServer, getPlayerStatsServer, getPlayerAnalyticsServer, getPlayerTodayStatsServer } from "@/lib/api-server";
import { getUserPlan } from "@/lib/api";
import StatsTable from "@/components/StatsTable";
import AISummaryButton from "@/components/AISummaryButton";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import AIChatPanel from "@/components/AIChatPanel";
import FavoriteButton from "@/components/FavoriteButton";
import SectionHeading from "@/components/SectionHeading";
import type { Player, PlayerStats, UserPlan, PlayerAnalytics, TodayStats } from "@/lib/api";

interface PlayerDetailPageProps {
  params: { locale: string; id: string };
}

async function fetchPlayerData(
  id: string
): Promise<{ player: Player | null; stats: PlayerStats | null; userPlan: UserPlan | null; analytics: PlayerAnalytics | null; todayStats: TodayStats | null }> {
  const [playerRes, statsRes, planRes, analyticsRes, todayRes] = await Promise.allSettled([
    getPlayerServer(id),
    getPlayerStatsServer(id),
    getUserPlan(),
    getPlayerAnalyticsServer(id),
    getPlayerTodayStatsServer(id),
  ]);

  return {
    player: playerRes.status === "fulfilled" ? playerRes.value.data : null,
    stats: statsRes.status === "fulfilled" ? statsRes.value.data : null,
    userPlan: planRes.status === "fulfilled" ? planRes.value.data : null,
    analytics: analyticsRes.status === "fulfilled" ? analyticsRes.value.data : null,
    todayStats: todayRes.status === "fulfilled" ? todayRes.value.data : null,
  };
}

/** A single big headline stat in the player hero key-stats bar. */
function KeyStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-sans text-[11px] uppercase tracking-wide text-white/50 mb-1.5">{label}</p>
      <p className="font-display text-4xl sm:text-5xl font-bold text-white tabular-nums leading-none">{value}</p>
    </div>
  );
}

export default async function PlayerDetailPage({ params: { locale, id } }: PlayerDetailPageProps) {
  const t = await getTranslations("player");
  const tChat = await getTranslations("chat");
  const { player, stats, userPlan, analytics, todayStats } = await fetchPlayerData(id);

  if (!player) {
    const tErrors = await getTranslations("errors");
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <span className="text-6xl">⚾</span>
        <p className="font-display text-2xl text-navy">{tErrors("notFound")}</p>
      </div>
    );
  }

  const displayName = locale === "ja" && player.name_ja ? player.name_ja : player.name_en;
  const enName = player.name_en;
  const teamName = locale === "ja" && player.team_ja ? player.team_ja : player.team_en;
  const isLoggedIn = !!userPlan;
  const remainingAi = userPlan ? userPlan.aiDailyLimit - userPlan.aiUsageToday : 0;

  const b = stats?.batting;
  const p = stats?.pitching;
  // Choose three marquee stats for the hero: batters → HR/AVG/RBI, pitchers → W/ERA/SO.
  const heroStats = b
    ? [
        { label: `${t("hr")} (本塁打)`, value: b.home_runs?.toString() ?? "—" },
        { label: `${t("avg")} (打率)`, value: b.avg?.toFixed(3) ?? "—" },
        { label: `${t("rbi")} (打点)`, value: b.rbi?.toString() ?? "—" },
      ]
    : p
    ? [
        { label: `${t("wins")}`, value: p.wins?.toString() ?? "—" },
        { label: `${t("era")}`, value: p.era?.toFixed(2) ?? "—" },
        { label: `${t("strikeouts")}`, value: p.strikeouts?.toString() ?? "—" },
      ]
    : [];

  return (
    <div className="space-y-12">
      {/* Player hero — editorial split layout */}
      <section className="relative overflow-hidden rounded bg-navy text-white border border-navy">
        <div className="pointer-events-none absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-gold via-gold/40 to-transparent" />
        <div className="flex flex-col md:flex-row">
          {/* Photo */}
          <div className="w-full md:w-2/5 lg:w-1/3 h-64 md:h-auto md:min-h-[340px] relative bg-navy-dark flex-shrink-0">
            {player.photo_url ? (
              <Image
                src={player.photo_url}
                alt={displayName}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover object-center"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-7xl">⚾</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-navy/80 md:from-transparent to-transparent md:to-navy/40" />
          </div>

          {/* Info */}
          <div className="flex-1 px-6 sm:px-10 py-8 sm:py-10 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                {player.position}
              </span>
              <span className="h-px w-10 bg-gold" />
            </div>
            <div className="flex items-start gap-3">
              <h1 className="font-display text-4xl sm:text-5xl font-bold leading-[1.05] tracking-tight">
                {displayName}
              </h1>
              <FavoriteButton playerId={id} isLoggedIn={isLoggedIn} locale={locale} />
            </div>
            {locale === "ja" && player.name_ja && (
              <p className="font-serif text-lg text-white/60 mt-1">{enName}</p>
            )}
            <p className="font-sans text-sm uppercase tracking-wide text-white/80 mt-4">{teamName}</p>

            {heroStats.length > 0 && (
              <div className="flex gap-8 sm:gap-12 border-t border-white/15 pt-6 mt-6">
                {heroStats.map((s) => (
                  <KeyStat key={s.label} label={s.label} value={s.value} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Today's in-game batting line — live highlight */}
      {todayStats && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded bg-surface-card border border-surface-border border-l-4 border-l-gold px-5 py-4">
          <span className="flex items-center gap-1.5 font-sans text-xs font-semibold uppercase tracking-wide text-gold-dark">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            {t("todayLabel")}
          </span>
          <span className="font-display text-3xl font-bold text-navy tabular-nums leading-none">
            {todayStats.hits}
            <span className="text-surface-outline">-for-</span>
            {todayStats.at_bats}
          </span>
          {(todayStats.home_runs > 0 || todayStats.rbi > 0) && (
            <span className="flex items-center gap-2 font-sans text-sm">
              {todayStats.home_runs > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted text-navy font-semibold tabular-nums">
                  {todayStats.home_runs} HR
                </span>
              )}
              {todayStats.rbi > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-surface-muted text-navy font-semibold tabular-nums">
                  {todayStats.rbi} RBI
                </span>
              )}
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      {stats ? (
        <StatsTable stats={stats} />
      ) : (
        <div className="bg-surface-card rounded border border-surface-border p-6">
          <SectionHeading title={t("stats")} />
          <p className="font-serif text-ink-muted">{t("summaryUnavailable")}</p>
        </div>
      )}

      {/* AI Summary */}
      <section className="bg-surface-card rounded border border-surface-border border-l-4 border-l-gold p-6">
        <SectionHeading kicker="AI" title={t("summary")} />
        <AISummaryButton
          playerId={id}
          locale={locale}
          userPlan={userPlan?.plan ?? "free"}
          aiUsageToday={userPlan?.aiUsageToday ?? 0}
          aiDailyLimit={userPlan?.aiDailyLimit ?? 3}
          remainingAi={remainingAi}
        />
      </section>

      {/* Analytics */}
      <section className="bg-surface-card rounded border border-surface-border p-6">
        <SectionHeading title={t("analytics")} />
        <AnalyticsPanel
          analytics={analytics}
          userPlan={userPlan?.plan ?? "free"}
          locale={locale}
          playerId={id}
        />
      </section>

      {/* AI Chat (Pro only) */}
      <section className="bg-surface-card rounded border border-surface-border border-l-4 border-l-gold p-6">
        <SectionHeading kicker="AI" title={tChat("title")} />
        <AIChatPanel
          playerId={id}
          userPlan={userPlan?.plan ?? "free"}
          locale={locale}
        />
      </section>
    </div>
  );
}
