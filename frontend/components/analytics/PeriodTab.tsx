"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { VictoryGroup, VictoryBar, VictoryChart, VictoryAxis, VictoryTheme } from "victory";
import { getPeriodComparison } from "@/lib/api";
import type { PeriodComparison, PeriodStats } from "@/lib/api";

// Chart colors — must stay in sync with tailwind.config.ts tokens
const COLOR_CURRENT = "#E01A38";  // brand red
const COLOR_LAST_YEAR = "#94A3B8"; // slate-400

interface PeriodTabProps {
  playerId: string;
  locale: string;
}

/** Format a YYYY-MM-DD date string as "M/D" for the period label. */
function formatDateShort(dateStr: string, locale: string): string {
  const [, m, d] = dateStr.split("-");
  const month = parseInt(m, 10);
  const day = parseInt(d, 10);
  if (locale === "ja") return `${month}/${day}`;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[month - 1]} ${day}`;
}

function hasData(p: PeriodStats | null): boolean {
  if (!p) return false;
  return (p.plate_appearances ?? 0) > 0;
}

interface StatRowProps {
  label: string;
  currentVal: string;
  lastVal: string;
}

function StatRow({ label, currentVal, lastVal }: StatRowProps) {
  return (
    <tr className="border-b border-surface-border last:border-0">
      <td className="py-2 pr-4 text-sm text-ink-muted font-medium">{label}</td>
      <td className="py-2 px-3 text-sm text-center font-semibold text-gold-dark">{currentVal}</td>
      <td className="py-2 pl-3 text-sm text-center text-ink-muted">{lastVal}</td>
    </tr>
  );
}

function fmt(val: number | null, decimals: number): string {
  if (val === null || val === undefined) return "—";
  return decimals > 0
    ? val.toFixed(decimals).replace(/^0(\.)/, "$1")
    : String(val);
}

export default function PeriodTab({ playerId, locale }: PeriodTabProps) {
  const t = useTranslations("player");
  const [data, setData] = useState<PeriodComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getPeriodComparison(playerId)
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [playerId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 py-4">
        <div className="h-4 bg-surface-muted rounded w-1/3 mx-auto" />
        <div className="h-48 bg-surface-muted rounded" />
        <div className="h-24 bg-surface-muted rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-ink-muted text-sm py-4 text-center">
        {t("summaryUnavailable")}
      </p>
    );
  }

  const { current, last_year } = data;

  // No data for either period
  if (!hasData(current) && !hasData(last_year)) {
    return (
      <p className="text-ink-muted text-sm py-4 text-center">
        {t("noPeriodData")}
      </p>
    );
  }

  const periodStart = formatDateShort(current.start_date, locale);
  const periodEnd = formatDateShort(current.end_date, locale);
  const periodLabel = t("periodLabel", { start: periodStart, end: periodEnd });
  const currentYearLabel = t("currentYear", { year: String(current.season) });
  const lastYearLabel = t("lastYear");

  // Build bar chart data for AVG, OPS, HR, RBI
  const barMetrics = [
    { label: t("avg"), current: current.avg ?? 0, last: last_year.avg ?? 0, decimals: 3 },
    { label: t("ops"), current: current.ops ?? 0, last: last_year.ops ?? 0, decimals: 3 },
  ];

  const currentBarData = barMetrics.map((m, i) => ({ x: m.label, y: m.current }));
  const lastBarData = barMetrics.map((m, i) => ({ x: m.label, y: m.last }));

  return (
    <div className="w-full space-y-4">
      {/* Period label header */}
      <p className="text-center text-sm font-medium text-ink-muted">{periodLabel}</p>

      {/* Grouped bar chart: AVG and OPS */}
      <div className="w-full">
        <VictoryChart
          theme={VictoryTheme.material}
          domainPadding={{ x: 40 }}
          padding={{ top: 20, bottom: 50, left: 60, right: 20 }}
          height={240}
        >
          <VictoryAxis
            style={{
              axis: { stroke: "#CBD5E1" },
              tickLabels: { fill: "#64748B", fontSize: 11 },
              grid: { stroke: "transparent" },
            }}
          />
          <VictoryAxis
            dependentAxis
            tickFormat={(v: number) => v.toFixed(3).replace(/^0(\.)/, "$1")}
            style={{
              axis: { stroke: "#CBD5E1" },
              tickLabels: { fill: "#64748B", fontSize: 10 },
              grid: { stroke: "#E2E8F0" },
            }}
          />
          <VictoryGroup offset={18}>
            <VictoryBar
              data={currentBarData}
              style={{ data: { fill: COLOR_CURRENT } }}
              barWidth={14}
            />
            <VictoryBar
              data={lastBarData}
              style={{ data: { fill: COLOR_LAST_YEAR } }}
              barWidth={14}
            />
          </VictoryGroup>
        </VictoryChart>

        {/* Legend */}
        <div className="flex gap-6 justify-center text-xs text-ink-muted mt-1">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-brand" />
            {currentYearLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-slate-400" />
            {lastYearLabel}
          </span>
        </div>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b-2 border-surface-border">
              <th className="py-2 pr-4 text-xs text-ink-muted/70 font-normal" />
              <th className="py-2 px-3 text-xs text-center text-gold-dark font-semibold">
                {currentYearLabel}
              </th>
              <th className="py-2 pl-3 text-xs text-center text-ink-muted/70 font-normal">
                {lastYearLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            <StatRow
              label={t("avg")}
              currentVal={fmt(current.avg, 3)}
              lastVal={fmt(last_year.avg, 3)}
            />
            <StatRow
              label={t("ops")}
              currentVal={fmt(current.ops, 3)}
              lastVal={fmt(last_year.ops, 3)}
            />
            <StatRow
              label={t("hr")}
              currentVal={fmt(current.home_runs, 0)}
              lastVal={fmt(last_year.home_runs, 0)}
            />
            <StatRow
              label={t("rbi")}
              currentVal={fmt(current.rbi, 0)}
              lastVal={fmt(last_year.rbi, 0)}
            />
            <StatRow
              label="H"
              currentVal={fmt(current.hits, 0)}
              lastVal={fmt(last_year.hits, 0)}
            />
            <StatRow
              label={t("vsBatter")}
              currentVal={fmt(current.plate_appearances, 0)}
              lastVal={fmt(last_year.plate_appearances, 0)}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
