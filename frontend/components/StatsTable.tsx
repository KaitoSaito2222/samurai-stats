"use client";

import { useTranslations } from "next-intl";
import type { PlayerStats } from "@/lib/api";

interface StatsTableProps {
  stats: PlayerStats;
}

export default function StatsTable({ stats }: StatsTableProps) {
  const t = useTranslations("player");

  return (
    <div className="space-y-4">
      {stats.batting && (
        <div className="bg-surface-card rounded-xl border border-surface-border overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-border">
            <h2 className="text-lg font-bold text-white">
              {t("batting")}{" "}
              <span className="text-sm font-normal text-slate-400">({stats.batting.season})</span>
            </h2>
          </div>
          <div className="divide-y divide-surface-border">
            {[
              { label: t("avg"),            value: stats.batting.avg?.toFixed(3) ?? "—" },
              { label: t("hr"),             value: stats.batting.home_runs?.toString() ?? "—" },
              { label: t("rbi"),            value: stats.batting.rbi?.toString() ?? "—" },
              { label: t("ops"),            value: stats.batting.ops?.toFixed(3) ?? "—" },
              { label: t("stats") + " (G)", value: stats.batting.games?.toString() ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-6 py-3">
                <span className="text-slate-400 text-sm">{label}</span>
                <span className="text-white font-semibold tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.pitching && (
        <div className="bg-surface-card rounded-xl border border-surface-border overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-border">
            <h2 className="text-lg font-bold text-white">
              {t("pitching")}{" "}
              <span className="text-sm font-normal text-slate-400">({stats.pitching.season})</span>
            </h2>
          </div>
          <div className="divide-y divide-surface-border">
            {[
              { label: t("era"),            value: stats.pitching.era?.toFixed(2) ?? "—" },
              { label: t("wins"),           value: stats.pitching.wins?.toString() ?? "—" },
              { label: t("strikeouts"),     value: stats.pitching.strikeouts?.toString() ?? "—" },
              { label: t("whip"),           value: stats.pitching.whip?.toFixed(2) ?? "—" },
              { label: t("stats") + " (G)", value: stats.pitching.games?.toString() ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-6 py-3">
                <span className="text-slate-400 text-sm">{label}</span>
                <span className="text-white font-semibold tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
