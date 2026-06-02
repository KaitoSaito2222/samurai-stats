import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { getPlayerServer, getPlayerStatsServer, getPlayerAnalyticsServer, getPlayerTodayStatsServer } from "@/lib/api-server";
import { getUserPlan } from "@/lib/api";
import StatsTable from "@/components/StatsTable";
import AISummaryButton from "@/components/AISummaryButton";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import AIChatPanel from "@/components/AIChatPanel";
import FavoriteButton from "@/components/FavoriteButton";
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

export default async function PlayerDetailPage({ params: { locale, id } }: PlayerDetailPageProps) {
  const t = await getTranslations("player");
  const tChat = await getTranslations("chat");
  const { player, stats, userPlan, analytics, todayStats } = await fetchPlayerData(id);

  if (!player) {
    const tErrors = await getTranslations("errors");
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <span className="text-6xl">⚾</span>
        <p className="text-xl text-slate-500">{tErrors("notFound")}</p>
      </div>
    );
  }

  const displayName = locale === "ja" && player.name_ja ? player.name_ja : player.name_en;
  const isLoggedIn = !!userPlan;
  const remainingAi = userPlan ? userPlan.aiDailyLimit - userPlan.aiUsageToday : 0;

  return (
    <div className="space-y-6">
      {/* Player header */}
      <div className="relative bg-surface-card rounded-2xl border border-surface-border shadow-sm overflow-hidden">
        {/* Gradient banner */}
        <div className="h-20 sm:h-24 bg-gradient-to-r from-navy via-navy-dark to-brand-dark" />
        <div className="px-6 pb-6 -mt-12 sm:-mt-14 flex flex-col sm:flex-row items-center sm:items-end gap-5">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-white ring-4 ring-white shadow-lg flex-shrink-0">
            {player.photo_url ? (
              <Image
                src={player.photo_url}
                alt={displayName}
                width={128}
                height={128}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl bg-slate-100">⚾</div>
            )}
          </div>
          <div className="text-center sm:text-left flex-1 sm:pb-1">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{displayName}</h1>
              <FavoriteButton playerId={id} isLoggedIn={isLoggedIn} locale={locale} />
            </div>
            {locale === "ja" && player.name_ja && (
              <p className="text-slate-500 text-sm mt-0.5">{player.name_en}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
              <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-sm font-semibold">
                {locale === "ja" && player.team_ja ? player.team_ja : player.team_en}
              </span>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">
                {player.position}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Today's in-game batting stats — live highlight */}
      {todayStats && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-brand/20 bg-gradient-to-r from-brand/[0.07] to-transparent px-5 py-3.5 shadow-sm">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            {t("todayLabel")}
          </span>
          <span className="text-2xl font-extrabold text-slate-900 tabular-nums leading-none">
            {todayStats.hits}
            <span className="text-slate-400 font-bold">-for-</span>
            {todayStats.at_bats}
          </span>
          {(todayStats.home_runs > 0 || todayStats.rbi > 0) && (
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              {todayStats.home_runs > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-white border border-surface-border tabular-nums">
                  {todayStats.home_runs} HR
                </span>
              )}
              {todayStats.rbi > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-white border border-surface-border tabular-nums">
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
        <div className="bg-surface-card rounded-2xl border border-surface-border p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-3">{t("stats")}</h2>
          <p className="text-slate-500">{t("summaryUnavailable")}</p>
        </div>
      )}

      {/* AI Summary */}
      <div className="bg-surface-card rounded-2xl border border-surface-border p-6 shadow-sm">
        <h2 className="flex items-center gap-2.5 text-lg font-bold text-slate-900 mb-4">
          <span className="w-1 h-5 rounded-full bg-brand" />
          {t("summary")}
        </h2>
        <AISummaryButton
          playerId={id}
          locale={locale}
          userPlan={userPlan?.plan ?? "free"}
          aiUsageToday={userPlan?.aiUsageToday ?? 0}
          aiDailyLimit={userPlan?.aiDailyLimit ?? 3}
          remainingAi={remainingAi}
        />
      </div>

      {/* Analytics */}
      <div className="bg-surface-card rounded-2xl border border-surface-border p-6 shadow-sm">
        <h2 className="flex items-center gap-2.5 text-lg font-bold text-slate-900 mb-4">
          <span className="w-1 h-5 rounded-full bg-brand" />
          {t("analytics")}
        </h2>
        <AnalyticsPanel
          analytics={analytics}
          userPlan={userPlan?.plan ?? "free"}
          locale={locale}
          playerId={id}
        />
      </div>

      {/* AI Chat (Pro only) */}
      <div className="bg-surface-card rounded-2xl border border-surface-border p-6 shadow-sm">
        <h2 className="flex items-center gap-2.5 text-lg font-bold text-slate-900 mb-4">
          <span className="w-1 h-5 rounded-full bg-brand" />
          {tChat("title")}
        </h2>
        <AIChatPanel
          playerId={id}
          userPlan={userPlan?.plan ?? "free"}
          locale={locale}
        />
      </div>
    </div>
  );
}
