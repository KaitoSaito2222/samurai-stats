"use client";

import { useTranslations, useLocale } from "next-intl";
import StatTooltip from "@/components/StatTooltip";
import type { PlayerStats } from "@/lib/api";

interface StatsTableProps {
  stats: PlayerStats;
}

interface Col {
  term: string;
  label: string;
  value: string;
}

/**
 * Editorial data table: navy header row, gold-tinted total row,
 * Inter tabular numerals. One row of season totals per stat group.
 */
function StatTable({
  title,
  subtitle,
  season,
  cols,
  locale,
}: {
  title: string;
  subtitle: string;
  season: number;
  cols: Col[];
  locale: string;
}) {
  return (
    <section>
      <div className="flex items-end justify-between mb-4 border-b border-surface-border pb-3">
        <div>
          <h3 className="font-display text-2xl font-bold text-navy leading-tight">{title}</h3>
          <p className="font-serif text-sm text-ink-muted">{season} {subtitle}</p>
        </div>
      </div>

      <div className="overflow-x-auto bg-surface-card border border-surface-border rounded">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-navy text-white">
              {cols.map(({ term, label }) => (
                <th
                  key={label}
                  className="px-4 py-3 text-right first:text-left font-sans text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                >
                  {term ? (
                    <StatTooltip term={term} locale={locale}>{label}</StatTooltip>
                  ) : label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-gold/10 border-t-2 border-gold">
              {cols.map(({ label, value }, i) => (
                <td
                  key={label}
                  className={`px-4 py-4 font-sans tabular-nums font-bold text-navy ${
                    i === 0 ? "text-left uppercase tracking-wide text-xs" : "text-right text-base"
                  }`}
                >
                  {value}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function StatsTable({ stats }: StatsTableProps) {
  const t = useTranslations("player");
  const locale = useLocale();

  return (
    <div className="space-y-10">
      {stats.batting && (
        <StatTable
          title={t("batting")}
          subtitle={t("stats")}
          season={stats.batting.season}
          locale={locale}
          cols={[
            { term: "",    label: t("stats") + " (G)", value: stats.batting.games?.toString() ?? "—" },
            { term: "avg", label: t("avg"),            value: stats.batting.avg?.toFixed(3) ?? "—" },
            { term: "hr",  label: t("hr"),             value: stats.batting.home_runs?.toString() ?? "—" },
            { term: "rbi", label: t("rbi"),            value: stats.batting.rbi?.toString() ?? "—" },
            { term: "ops", label: t("ops"),            value: stats.batting.ops?.toFixed(3) ?? "—" },
            { term: "",    label: "H",                 value: stats.batting.hits?.toString() ?? "—" },
          ]}
        />
      )}

      {stats.pitching && (
        <StatTable
          title={t("pitching")}
          subtitle={t("stats")}
          season={stats.pitching.season}
          locale={locale}
          cols={[
            { term: "",           label: t("stats") + " (G)", value: stats.pitching.games?.toString() ?? "—" },
            { term: "era",        label: t("era"),            value: stats.pitching.era?.toFixed(2) ?? "—" },
            { term: "wins",       label: t("wins"),           value: stats.pitching.wins?.toString() ?? "—" },
            { term: "strikeouts", label: t("strikeouts"),     value: stats.pitching.strikeouts?.toString() ?? "—" },
            { term: "whip",       label: t("whip"),           value: stats.pitching.whip?.toFixed(2) ?? "—" },
          ]}
        />
      )}
    </div>
  );
}
