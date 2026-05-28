import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { getPlayerServer, getPlayerStatsServer, getPlayerAnalyticsServer } from "@/lib/api-server";
import { getUserPlan } from "@/lib/api";
import StatsTable from "@/components/StatsTable";
import AISummaryButton from "@/components/AISummaryButton";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import AIChatPanel from "@/components/AIChatPanel";
import FavoriteButton from "@/components/FavoriteButton";
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
  const tChat = await getTranslations("chat");
  const { player, stats, userPlan, analytics } = await fetchPlayerData(id);

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
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-surface-card rounded-xl border border-surface-border p-6 shadow-sm">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
          {player.photo_url ? (
            <Image
              src={player.photo_url}
              alt={displayName}
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">⚾</div>
          )}
        </div>
        <div className="text-center sm:text-left flex-1">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{displayName}</h1>
            <FavoriteButton playerId={id} isLoggedIn={isLoggedIn} locale={locale} />
          </div>
          {locale === "ja" && player.name_ja && (
            <p className="text-slate-500 text-sm mt-1">{player.name_en}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
            <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-sm font-medium">
              {locale === "ja" && player.team_ja ? player.team_ja : player.team_en}
            </span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">
              {player.position}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats ? (
        <StatsTable stats={stats} />
      ) : (
        <div className="bg-surface-card rounded-xl border border-surface-border p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-3">{t("stats")}</h2>
          <p className="text-slate-500">{t("summaryUnavailable")}</p>
        </div>
      )}

      {/* AI Summary */}
      <div className="bg-surface-card rounded-xl border border-surface-border p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">{t("summary")}</h2>
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
      <div className="bg-surface-card rounded-xl border border-surface-border p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">{t("analytics")}</h2>
        <AnalyticsPanel
          analytics={analytics}
          userPlan={userPlan?.plan ?? "free"}
          locale={locale}
          playerId={id}
        />
      </div>

      {/* AI Chat (Pro only) */}
      <div className="bg-surface-card rounded-xl border border-surface-border p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">{tChat("title")}</h2>
        <AIChatPanel
          playerId={id}
          userPlan={userPlan?.plan ?? "free"}
          locale={locale}
        />
      </div>
    </div>
  );
}
