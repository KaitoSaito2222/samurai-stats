"use client";

import { useTranslations, useLocale } from "next-intl";
import StatTooltip from "@/components/StatTooltip";
import type { PlayerStats } from "@/lib/api";

interface StatsTableProps {
  stats: PlayerStats;
}

export default function StatsTable({ stats }: StatsTableProps) {
  const t = useTranslations("player");
  const locale = useLocale();

  return (
    <div className="space-y-4">
      {stats.batting && (
        <div className="bg-surface-card rounded-xl border border-surface-border overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-border">
            <h2 className="text-lg font-bold text-slate-900">
              {t("batting")}{" "}
              <span className="text-sm font-normal text-slate-500">({stats.batting.season})</span>
            </h2>
          </div>
          <div className="divide-y divide-surface-border">
            {[
              { term: "avg",  label: t("avg"),            value: stats.batting.avg?.toFixed(3) ?? "—" },
              { term: "hr",   label: t("hr"),             value: stats.batting.home_runs?.toString() ?? "—" },
              { term: "rbi",  label: t("rbi"),            value: stats.batting.rbi?.toString() ?? "—" },
              { term: "ops",  label: t("ops"),            value: stats.batting.ops?.toFixed(3) ?? "—" },
              { term: "",     label: t("stats") + " (G)", value: stats.batting.games?.toString() ?? "—" },
            ].map(({ term, label, value }) => (
              <div key={label} className="flex items-center justify-between px-6 py-3">
                <span className="text-slate-600 text-sm">
                  {term ? (
                    <StatTooltip term={term} locale={locale}>{label}</StatTooltip>
                  ) : label}
                </span>
                <span className="text-slate-900 font-semibold tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.pitching && (
        <div className="bg-surface-card rounded-xl border border-surface-border overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-border">
            <h2 className="text-lg font-bold text-slate-900">
              {t("pitching")}{" "}
              <span className="text-sm font-normal text-slate-500">({stats.pitching.season})</span>
            </h2>
          </div>
          <div className="divide-y divide-surface-border">
            {[
              { term: "era",        label: t("era"),            value: stats.pitching.era?.toFixed(2) ?? "—" },
              { term: "wins",       label: t("wins"),           value: stats.pitching.wins?.toString() ?? "—" },
              { term: "strikeouts", label: t("strikeouts"),     value: stats.pitching.strikeouts?.toString() ?? "—" },
              { term: "whip",       label: t("whip"),           value: stats.pitching.whip?.toFixed(2) ?? "—" },
              { term: "",           label: t("stats") + " (G)", value: stats.pitching.games?.toString() ?? "—" },
            ].map(({ term, label, value }) => (
              <div key={label} className="flex items-center justify-between px-6 py-3">
                <span className="text-slate-600 text-sm">
                  {term ? (
                    <StatTooltip term={term} locale={locale}>{label}</StatTooltip>
                  ) : label}
                </span>
                <span className="text-slate-900 font-semibold tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
