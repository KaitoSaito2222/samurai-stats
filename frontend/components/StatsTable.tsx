"use client";

import { useTranslations, useLocale } from "next-intl";
import StatTooltip from "@/components/StatTooltip";
import type { PlayerStats } from "@/lib/api";

interface StatsTableProps {
  stats: PlayerStats;
}

interface StatCell {
  term: string;
  label: string;
  value: string;
}

function StatBlock({
  title,
  season,
  marquee,
  rest,
  locale,
}: {
  title: string;
  season: number;
  marquee: StatCell;
  rest: StatCell[];
  locale: string;
}) {
  return (
    <div className="bg-surface-card rounded-2xl border border-surface-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700">
          <span className="w-1 h-4 rounded-full bg-brand" />
          {title}
        </h2>
        <span className="text-xs font-semibold text-slate-400 tabular-nums">{season}</span>
      </div>

      {/* Marquee stat */}
      <div className="flex items-baseline justify-between px-5 py-4 bg-gradient-to-r from-brand/[0.06] to-transparent">
        <span className="text-sm font-medium text-slate-500">
          {marquee.term ? (
            <StatTooltip term={marquee.term} locale={locale}>{marquee.label}</StatTooltip>
          ) : marquee.label}
        </span>
        <span className="text-3xl font-extrabold text-brand tabular-nums leading-none">
          {marquee.value}
        </span>
      </div>

      {/* Remaining stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-surface-border border-t border-surface-border">
        {rest.map(({ term, label, value }) => (
          <div key={label} className="bg-surface-card px-4 py-4 text-center">
            <div className="text-xl font-bold text-slate-900 tabular-nums leading-none">{value}</div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400 mt-1.5">
              {term ? (
                <StatTooltip term={term} locale={locale}>{label}</StatTooltip>
              ) : label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StatsTable({ stats }: StatsTableProps) {
  const t = useTranslations("player");
  const locale = useLocale();

  return (
    <div className="space-y-4">
      {stats.batting && (
        <StatBlock
          title={t("batting")}
          season={stats.batting.season}
          locale={locale}
          marquee={{ term: "avg", label: t("avg"), value: stats.batting.avg?.toFixed(3) ?? "—" }}
          rest={[
            { term: "hr",  label: t("hr"),             value: stats.batting.home_runs?.toString() ?? "—" },
            { term: "rbi", label: t("rbi"),            value: stats.batting.rbi?.toString() ?? "—" },
            { term: "ops", label: t("ops"),            value: stats.batting.ops?.toFixed(3) ?? "—" },
            { term: "",    label: t("stats") + " (G)", value: stats.batting.games?.toString() ?? "—" },
          ]}
        />
      )}

      {stats.pitching && (
        <StatBlock
          title={t("pitching")}
          season={stats.pitching.season}
          locale={locale}
          marquee={{ term: "era", label: t("era"), value: stats.pitching.era?.toFixed(2) ?? "—" }}
          rest={[
            { term: "wins",       label: t("wins"),           value: stats.pitching.wins?.toString() ?? "—" },
            { term: "strikeouts", label: t("strikeouts"),     value: stats.pitching.strikeouts?.toString() ?? "—" },
            { term: "whip",       label: t("whip"),           value: stats.pitching.whip?.toFixed(2) ?? "—" },
            { term: "",           label: t("stats") + " (G)", value: stats.pitching.games?.toString() ?? "—" },
          ]}
        />
      )}
    </div>
  );
}
