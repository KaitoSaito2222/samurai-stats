"use client";

import { useTranslations } from "next-intl";
import type { VelocityDataPoint } from "@/lib/api";
import {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryTheme,
} from "victory";

interface VelocityChartProps {
  data: VelocityDataPoint[];
  locale: string;
}

// Color palette for pitch types — one distinct color per type
const PITCH_COLORS: string[] = [
  "#E01A38", // brand red — FF (fastball)
  "#1B3A6B", // navy — SI (sinker)
  "#F59E0B", // amber — SL (slider)
  "#6366F1", // indigo — CU (curveball)
  "#10B981", // emerald — CH (changeup)
  "#8B5CF6", // violet — FC (cutter)
  "#EC4899", // pink — FS (splitter)
  "#14B8A6", // teal — ST (sweeper)
];

export default function VelocityChart({ data, locale }: VelocityChartProps) {
  const t = useTranslations("player");

  if (!data || data.length === 0) {
    return null;
  }

  // Collect unique pitch types, preserving order of first appearance
  const pitchTypes: string[] = [];
  for (const point of data) {
    if (!pitchTypes.includes(point.pitch_type)) {
      pitchTypes.push(point.pitch_type);
    }
  }

  // Group data by pitch type for separate VictoryLine per type
  const seriesByType: Record<string, { x: number; y: number }[]> = {};
  for (const pt of pitchTypes) {
    seriesByType[pt] = data
      .filter((d) => d.pitch_type === pt)
      .sort((a, b) => a.month - b.month)
      .map((d) => ({ x: d.month, y: d.avg_velocity }));
  }

  // Derive x-axis tick values from available months
  const allMonths = Array.from(new Set(data.map((d) => d.month))).sort(
    (a, b) => a - b
  );

  // Y-axis domain: pad around the actual velocity range
  const allVelocities = data.map((d) => d.avg_velocity);
  const minV = Math.min(...allVelocities);
  const maxV = Math.max(...allVelocities);
  const yMin = Math.max(60, Math.floor(minV - 3));
  const yMax = Math.ceil(maxV + 3);

  // Name helper — locale-aware
  const pitchName = (pt: string): string => {
    const point = data.find((d) => d.pitch_type === pt);
    if (!point) return pt;
    return locale === "ja" ? point.pitch_name_ja : point.pitch_name_en;
  };

  try {
    return (
      <div className="w-full">
        <p className="text-xs text-slate-500 uppercase tracking-wide text-center mb-1">
          {t("velocityTrend")}
        </p>

        <VictoryChart
          theme={VictoryTheme.material}
          domainPadding={{ x: 20 }}
          padding={{ top: 20, bottom: 50, left: 55, right: 20 }}
          height={260}
        >
          {/* X-axis: months as "4月" / "4" */}
          <VictoryAxis
            tickValues={allMonths}
            tickFormat={(m: number) =>
              locale === "ja" ? `${m}月` : `${m}`
            }
            style={{
              axis: { stroke: "#CBD5E1" },
              tickLabels: { fill: "#64748B", fontSize: 11 },
              grid: { stroke: "transparent" },
            }}
          />

          {/* Y-axis: velocity in mph */}
          <VictoryAxis
            dependentAxis
            domain={[yMin, yMax]}
            tickFormat={(v: number) => `${v}`}
            label={t("mph")}
            style={{
              axis: { stroke: "#CBD5E1" },
              tickLabels: { fill: "#64748B", fontSize: 10 },
              axisLabel: { fill: "#94A3B8", fontSize: 10, padding: 40 },
              grid: { stroke: "#E2E8F0" },
            }}
          />

          {/* One line per pitch type */}
          {pitchTypes.map((pt, idx) => {
            const lineData = seriesByType[pt];
            if (!lineData || lineData.length < 2) return null;
            return (
              <VictoryLine
                key={pt}
                data={lineData}
                style={{
                  data: {
                    stroke: PITCH_COLORS[idx % PITCH_COLORS.length],
                    strokeWidth: 2.5,
                  },
                }}
              />
            );
          })}
        </VictoryChart>

        {/* Legend */}
        <div className="flex gap-4 justify-center flex-wrap mt-1 text-xs text-slate-500">
          {pitchTypes.map((pt, idx) => (
            <span key={pt} className="flex items-center gap-1">
              <span
                className="inline-block w-6 h-0.5"
                style={{
                  backgroundColor: PITCH_COLORS[idx % PITCH_COLORS.length],
                }}
              />
              {pitchName(pt)}
            </span>
          ))}
        </div>
      </div>
    );
  } catch {
    return null;
  }
}
