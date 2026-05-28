"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { getRecentForm } from "@/lib/api";
import type { RecentFormWindow } from "@/lib/api";

interface RecentFormTabProps {
  playerId: string;
}

// Color-code AVG: hot (>= .280), cold (<= .200), neutral otherwise
function avgColorClass(avg: number | null): string {
  if (avg === null) return "text-slate-400";
  if (avg >= 0.28) return "text-green-600";
  if (avg <= 0.2) return "text-red-600";
  return "text-slate-900";
}

function formatAvg(avg: number | null): string {
  if (avg === null) return "---";
  return avg.toFixed(3).replace(/^0/, "");
}

function formatStat(val: number | null | undefined): string {
  if (val === null || val === undefined) return "---";
  return String(val);
}

function windowLabel(days: number, t: ReturnType<typeof useTranslations>): string {
  if (days === 7) return t("last7d");
  if (days === 14) return t("last14d");
  return t("last30d");
}

// Loading skeleton for 3 cards
function RecentFormSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-surface-card border border-surface-border rounded-xl p-4 animate-pulse"
        >
          <div className="h-4 bg-slate-200 rounded w-2/3 mb-3" />
          <div className="h-9 bg-slate-200 rounded w-1/2 mb-3" />
          <div className="space-y-2">
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-5/6" />
            <div className="h-3 bg-slate-100 rounded w-4/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RecentFormTab({ playerId }: RecentFormTabProps) {
  const t = useTranslations("player");
  const locale = useLocale();

  const [windows, setWindows] = useState<RecentFormWindow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(false);

    getRecentForm(playerId)
      .then((res) => {
        if (!cancelled) {
          setWindows(res.data.windows);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [playerId]);

  if (loading) {
    return <RecentFormSkeleton />;
  }

  if (error || !windows) {
    return (
      <p className="text-slate-500 text-sm py-4 text-center">
        {t("recentNoData")}
      </p>
    );
  }

  // Empty state: all windows have null or 0 plate_appearances
  const hasAnyData = windows.some(
    (w) => w.plate_appearances !== null && w.plate_appearances > 0
  );
  if (!hasAnyData) {
    return (
      <p className="text-slate-500 text-sm py-4 text-center">
        {t("recentNoData")}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {windows.map((w) => {
        const hasPa = w.plate_appearances !== null && w.plate_appearances > 0;
        const colorClass = hasPa ? avgColorClass(w.avg) : "text-slate-400";
        const isHot = w.avg !== null && w.avg >= 0.28;
        const isCold = w.avg !== null && w.avg <= 0.2;

        return (
          <div
            key={w.days}
            className="bg-surface-card border border-surface-border rounded-xl p-4 flex flex-col gap-2"
          >
            {/* Card header */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">
                {windowLabel(w.days, t)}
              </span>
              {hasPa && isHot && (
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  {t("hot")}
                </span>
              )}
              {hasPa && isCold && (
                <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  {t("cold")}
                </span>
              )}
            </div>

            {/* AVG — large and color-coded */}
            <div className={`text-3xl font-bold tabular-nums ${colorClass}`}>
              {hasPa ? formatAvg(w.avg) : "---"}
            </div>

            {/* Secondary stats */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
              <div className="flex justify-between">
                <dt className="text-slate-400">{t("ops")}</dt>
                <dd className="font-medium tabular-nums">
                  {hasPa && w.ops !== null
                    ? w.ops.toFixed(3).replace(/^0/, "")
                    : "---"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">{t("hr")}</dt>
                <dd className="font-medium tabular-nums">
                  {hasPa ? formatStat(w.home_runs) : "---"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">{t("rbi")}</dt>
                <dd className="font-medium tabular-nums">
                  {hasPa ? formatStat(w.rbi) : "---"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">{t("vsBatter")}</dt>
                <dd className="font-medium tabular-nums">
                  {formatStat(w.plate_appearances)}
                </dd>
              </div>
            </dl>
          </div>
        );
      })}
    </div>
  );
}
