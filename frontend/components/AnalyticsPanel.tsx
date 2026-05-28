"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { PlayerAnalytics } from "@/lib/api";
import SplitsTab from "./analytics/SplitsTab";
import MonthlyTab from "./analytics/MonthlyTab";
import StatcastTab from "./analytics/StatcastTab";

interface AnalyticsPanelProps {
  analytics: PlayerAnalytics | null;
  userPlan: "free" | "pro";
  locale: string;
}

type TabKey = "splits" | "monthly" | "statcast";

export default function AnalyticsPanel({
  analytics,
  userPlan,
  locale,
}: AnalyticsPanelProps) {
  const t = useTranslations("player");
  const tPlan = useTranslations("plan");
  const [activeTab, setActiveTab] = useState<TabKey>("splits");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "splits", label: t("splits") },
    { key: "monthly", label: t("monthly") },
    { key: "statcast", label: t("statcast") },
  ];

  const content = (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-surface-border mb-4" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              "px-4 py-2 text-sm font-medium transition-colors focus:outline-none",
              activeTab === tab.key
                ? "border-b-2 border-brand text-brand"
                : "text-slate-400 hover:text-slate-200",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div role="tabpanel">
        {activeTab === "splits" && (
          <SplitsTab splits={analytics?.splits ?? null} />
        )}
        {activeTab === "monthly" && (
          <MonthlyTab monthly={analytics?.monthly ?? null} />
        )}
        {activeTab === "statcast" && (
          <StatcastTab statcast={analytics?.statcast ?? null} locale={locale} />
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
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface-DEFAULT/80 rounded-lg">
          <span className="text-4xl" role="img" aria-label="lock">🔒</span>
          <p className="text-white font-semibold text-center px-4">
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
