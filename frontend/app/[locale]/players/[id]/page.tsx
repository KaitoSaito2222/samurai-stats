import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { getPlayerServer, getPlayerStatsServer, getPlayerAnalyticsServer } from "@/lib/api-server";
import { getUserPlan } from "@/lib/api";
import StatsTable from "@/components/StatsTable";
import AISummaryButton from "@/components/AISummaryButton";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import type { Player, PlayerStats, UserPlan, PlayerAnalytics } from "@/lib/api";

interface PlayerDetailPageProps {
  params: { locale: string; id: string };
}

async function fetchPlayerData(
  id: string
): Promise<{ player: Player | null; stats: PlayerStats | null; userPlan: UserPlan | null; analytics: PlayerAnalytics | null }> {
  const [playerRes, statsRes, planRes, analyticsRes] = await Promise.allSettled([
    getPlayerServer(id),
    getPlayerStatsServer(id),
    getUserPlan(),
    getPlayerAnalyticsServer(id),
  ]);

  return {
    player: playerRes.status === "fulfilled" ? playerRes.value.data : null,
    stats: statsRes.status === "fulfilled" ? statsRes.value.data : null,
    userPlan: planRes.status === "fulfilled" ? planRes.value.data : null,
    analytics: analyticsRes.status === "fulfilled" ? analyticsRes.value.data : null,
  };
}

export default async function PlayerDetailPage({ params: { locale, id } }: PlayerDetailPageProps) {
  const t = await getTranslations("player");
  const { player, stats, userPlan, analytics } = await fetchPlayerData(id);

  if (!player) {
    const tErrors = await getTranslations("errors");
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <span className="text-6xl">⚾</span>
        <p className="text-xl text-slate-400">{tErrors("notFound")}</p>
      </div>
    );
  }

  const displayName = locale === "ja" && player.name_ja ? player.name_ja : player.name_en;
  const remainingAi = userPlan
    ? userPlan.aiDailyLimit - userPlan.aiUsageToday
    : 0;

  return (
    <div className="space-y-6">
      {/* Player header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-surface-card rounded-xl border border-surface-border p-6">
        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-surface-border flex-shrink-0">
          {player.photoUrl ? (
            <Image
              src={player.photoUrl}
              alt={displayName}
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">
              ⚾
            </div>
          )}
        </div>
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{displayName}</h1>
          {locale === "ja" && player.name_ja && (
            <p className="text-slate-400 text-sm mt-1">{player.name_en}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
            <span className="px-3 py-1 bg-brand/20 text-brand rounded-full text-sm font-medium">
              {locale === "ja" && player.team_ja ? player.team_ja : player.team_en}
            </span>
            <span className="px-3 py-1 bg-surface-border text-slate-300 rounded-full text-sm">
              {player.position}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats ? (
        <StatsTable stats={stats} />
      ) : (
        <div className="bg-surface-card rounded-xl border border-surface-border p-6">
          <h2 className="text-lg font-bold text-white mb-3">{t("stats")}</h2>
          <p className="text-slate-400">{t("summaryUnavailable")}</p>
        </div>
      )}

      {/* AI Summary */}
      <div className="bg-surface-card rounded-xl border border-surface-border p-6">
        <h2 className="text-lg font-bold text-white mb-4">{t("summary")}</h2>
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
      <div className="bg-surface-card rounded-xl border border-surface-border p-6">
        <h2 className="text-lg font-bold text-white mb-4">{t("analytics")}</h2>
        <AnalyticsPanel
          analytics={analytics}
          userPlan={userPlan?.plan ?? "free"}
          locale={locale}
        />
      </div>
    </div>
  );
}
