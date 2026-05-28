"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { PlayerAnalytics } from "@/lib/api";
import SplitsTab from "./analytics/SplitsTab";
import MonthlyTab from "./analytics/MonthlyTab";
import StatcastTab from "./analytics/StatcastTab";
import PeriodTab from "./analytics/PeriodTab";
import RecentFormTab from "./analytics/RecentFormTab";
import CareerTab from "./analytics/CareerTab";
import GameLogTab from "./analytics/GameLogTab";

interface AnalyticsPanelProps {
  analytics: PlayerAnalytics | null;
  userPlan: "free" | "pro";
  locale: string;
  playerId: string;
}

type TabKey = "splits" | "monthly" | "statcast" | "period" | "recent" | "career" | "gamelogs";

export default function AnalyticsPanel({
  analytics,
  userPlan,
  locale,
  playerId,
}: AnalyticsPanelProps) {
  const t = useTranslations("player");
  const tPlan = useTranslations("plan");
  const [activeTab, setActiveTab] = useState<TabKey>("splits");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "splits", label: t("splits") },
    { key: "monthly", label: t("monthly") },
    { key: "statcast", label: t("statcast") },
    { key: "period", label: t("period") },
    { key: "recent", label: t("recent") },
    { key: "career", label: t("career") },
    { key: "gamelogs", label: t("gameLogs") },
  ];

  const content = (
    <div>
      {/* Tab bar */}
      <div className="flex flex-wrap bg-slate-50 rounded-t-lg border-b border-surface-border mb-4" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              "px-4 py-2 text-sm font-medium transition-colors focus:outline-none",
              activeTab === tab.key
                ? "bg-white text-brand border-b-2 border-brand shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div role="tabpanel">
        {activeTab === "splits" && (
          <SplitsTab splits={analytics?.splits ?? null} clutch={analytics?.clutch} />
        )}
        {activeTab === "monthly" && (
          <MonthlyTab monthly={analytics?.monthly ?? null} />
        )}
        {activeTab === "statcast" && (
          <StatcastTab statcast={analytics?.statcast ?? null} locale={locale} />
        )}
        {activeTab === "period" && (
          <PeriodTab playerId={playerId} locale={locale} />
        )}
        {activeTab === "recent" && (
          <RecentFormTab playerId={playerId} />
        )}
        {activeTab === "career" && (
          <CareerTab playerId={playerId} />
        )}
        {activeTab === "gamelogs" && (
          <GameLogTab playerId={playerId} locale={locale} />
        )}
      </div>
    </div>
  );

  // Free users see a blurred/locked overlay — never hidden, shown as upgrade prompt
  if (userPlan === "free") {
    return (
      <div className="relative">
        {/* Blurred content underneath */}
        <div className="pointer-events-none select-none blur-sm opacity-50" aria-hidden>
          {content}
        </div>

        {/* Lock overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/90 rounded-lg">
          <span className="text-4xl" role="img" aria-label="lock">🔒</span>
          <p className="text-navy font-semibold text-center px-4">
            {t("analyticsProOnly")}
          </p>
          <a
            href={`/${locale}/billing`}
            className="px-5 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg text-sm font-medium transition-colors"
          >
            {tPlan("upgrade")}
          </a>
        </div>
      </div>
    );
  }

  return content;
}
