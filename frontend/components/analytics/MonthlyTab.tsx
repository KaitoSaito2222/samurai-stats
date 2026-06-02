"use client";

import { useTranslations } from "next-intl";
import type { MonthStat } from "@/lib/api";
import {
  VictoryChart,
  VictoryLine,
  VictoryBar,
  VictoryAxis,
  VictoryTheme,
  VictoryLegend,
} from "victory";

interface MonthlyTabProps {
  monthly: MonthStat[] | null;
}

// Brand/chart colors — must match tailwind.config.ts tokens
const COLOR_AVG = "#E01A38";    // brand red (updated for light theme)
const COLOR_OPS = "#F59E0B";    // amber
const COLOR_HR = "#6366F1";     // indigo

export default function MonthlyTab({ monthly }: MonthlyTabProps) {
  const t = useTranslations("player");

  if (!monthly || monthly.length === 0) {
    return (
      <p className="text-ink-muted text-sm py-4 text-center">
        {t("summaryUnavailable")}
      </p>
    );
  }

  // Filter out months with no data
  const months = monthly.filter((m) => m.avg !== null || m.ops !== null || m.hr !== null);

  if (months.length === 0) {
    return (
      <p className="text-ink-muted text-sm py-4 text-center">
        {t("summaryUnavailable")}
      </p>
    );
  }

  const avgData = months
    .filter((m) => m.avg !== null)
    .map((m) => ({ x: m.month, y: m.avg as number }));

  const opsData = months
    .filter((m) => m.ops !== null)
    .map((m) => ({ x: m.month, y: m.ops as number }));

  const hrData = months
    .filter((m) => m.hr !== null)
    .map((m) => ({ x: m.month, y: m.hr as number }));

  const allMonths = months.map((m) => m.month);
  const minMonth = Math.min(...allMonths);
  const maxMonth = Math.max(...allMonths);

  const tickValues = Array.from(
    { length: maxMonth - minMonth + 1 },
    (_, i) => minMonth + i
  );

  try {
    return (
      <div className="w-full">
        <VictoryChart
          theme={VictoryTheme.material}
          domainPadding={{ x: 20 }}
          padding={{ top: 20, bottom: 50, left: 50, right: 20 }}
          height={280}
        >
          {/* X-axis: months displayed as "4月", "5月" etc. */}
          <VictoryAxis
            tickValues={tickValues}
            tickFormat={(t: number) => `${t}月`}
            style={{
              axis: { stroke: "#CBD5E1" },
              tickLabels: { fill: "#64748B", fontSize: 11 },
              grid: { stroke: "transparent" },
            }}
          />
          {/* Left Y-axis: AVG scale 0 – 0.400 */}
          <VictoryAxis
            dependentAxis
            domain={[0, 0.4]}
            tickFormat={(v: number) => v.toFixed(3).replace(/^0/, "")}
            style={{
              axis: { stroke: "#CBD5E1" },
              tickLabels: { fill: "#64748B", fontSize: 10 },
              grid: { stroke: "#E2E8F0" },
            }}
          />

          {/* HR bars (rendered first so lines overlay on top) */}
          {hrData.length > 0 && (
            <VictoryBar
              data={hrData}
              style={{ data: { fill: COLOR_HR, opacity: 0.5 } }}
              barWidth={14}
            />
          )}

          {/* OPS line */}
          {opsData.length > 0 && (
            <VictoryLine
              data={opsData}
              style={{ data: { stroke: COLOR_OPS, strokeWidth: 2 } }}
            />
          )}

          {/* AVG line */}
          {avgData.length > 0 && (
            <VictoryLine
              data={avgData}
              style={{ data: { stroke: COLOR_AVG, strokeWidth: 2.5 } }}
            />
          )}
        </VictoryChart>

        {/* Legend */}
        <div className="flex gap-4 justify-center mt-1 text-xs text-ink-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block w-6 h-0.5 bg-brand" />
            {t("avg")}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-6 h-0.5 bg-amber-400" />
            {t("ops")}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-3 bg-indigo-500 opacity-60 rounded-sm" />
            {t("hr")}
          </span>
        </div>
      </div>
    );
  } catch {
    return (
      <p className="text-ink-muted text-sm py-4 text-center">
        {t("summaryUnavailable")}
      </p>
    );
  }
}
