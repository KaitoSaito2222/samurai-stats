"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  VictoryBar,
  VictoryGroup,
  VictoryChart,
  VictoryAxis,
  VictoryLabel,
} from "victory";
import type { SplitStat, PlayerAnalytics } from "@/lib/api";

interface SplitsTabProps {
  splits: PlayerAnalytics["splits"];
}

// Brand colors matching tailwind.config.ts tokens
const COLOR_A = "#E01A38"; // brand red — vs Left / Home / Day
const COLOR_B = "#1B3A6B"; // navy — vs Right / Away / Night

type Metric = "avg" | "ops" | "hr";

function getSplitValue(stat: SplitStat | null, metric: Metric): number {
  if (!stat) return 0;
  if (metric === "avg") return stat.avg ?? 0;
  if (metric === "ops") return stat.ops ?? 0;
  return stat.hr ?? 0;
}

function formatValue(v: number | null, metric: Metric): string {
  if (v === null) return "—";
  if (metric === "avg") return v.toFixed(3).replace(/^0/, "");
  if (metric === "ops") return v.toFixed(3);
  return String(v);
}

function fmtAvg(v: number | null): string {
  if (v === null) return "—";
  return v.toFixed(3).replace(/^0/, "");
}
function fmtOps(v: number | null): string {
  if (v === null) return "—";
  return v.toFixed(3);
}
function fmtHr(v: number | null): string {
  if (v === null) return "—";
  return String(v);
}

interface SituationChartProps {
  labelA: string;
  labelB: string;
  statA: SplitStat | null;
  statB: SplitStat | null;
  metric: Metric;
}

function SituationChart({ labelA, labelB, statA, statB, metric }: SituationChartProps) {
  const valA = getSplitValue(statA, metric);
  const valB = getSplitValue(statB, metric);
  const maxY = Math.max(valA, valB, metric === "hr" ? 1 : 0.001) * 1.4;

  const rawA = statA ? (metric === "avg" ? statA.avg : metric === "ops" ? statA.ops : statA.hr) : null;
  const rawB = statB ? (metric === "avg" ? statB.avg : metric === "ops" ? statB.ops : statB.hr) : null;
  const barData = [
    { x: labelA, y: valA, label: formatValue(rawA, metric), fill: COLOR_A },
    { x: labelB, y: valB, label: formatValue(rawB, metric), fill: COLOR_B },
  ];

  return (
    <VictoryChart
      domainPadding={{ x: 40 }}
      padding={{ top: 30, bottom: 40, left: 10, right: 10 }}
      height={160}
      domain={{ y: [0, maxY] }}
    >
      <VictoryAxis
        style={{
          axis: { stroke: "#DDE3ED" },
          tickLabels: { fill: "#475569", fontSize: 10 },
          grid: { stroke: "transparent" },
        }}
      />
      <VictoryAxis
        dependentAxis
        style={{
          axis: { stroke: "transparent" },
          tickLabels: { fill: "transparent" },
          grid: { stroke: "transparent" },
        }}
      />
      <VictoryGroup>
        <VictoryBar
          data={barData}
          x="x"
          y="y"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          style={{ data: { fill: ({ datum }: any) => datum.fill } }}
          barWidth={32}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          labels={({ datum }: any) => datum.label}
          labelComponent={
            <VictoryLabel
              dy={-6}
              style={{ fontSize: 10, fill: "#1E293B", fontWeight: 600 }}
            />
          }
          cornerRadius={{ top: 3 }}
        />
      </VictoryGroup>
    </VictoryChart>
  );
}

interface SummaryRowProps {
  label: string;
  stat: SplitStat | null;
}

function SummaryRow({ label, stat }: SummaryRowProps) {
  return (
    <tr className="border-t border-surface-border odd:bg-white even:bg-slate-50">
      <td className="py-1.5 px-3 text-slate-600 text-xs">{label}</td>
      <td className="py-1.5 px-3 text-center text-slate-500 text-xs tabular-nums">
        {stat ? stat.pa : "—"}
      </td>
      <td className="py-1.5 px-3 text-center text-slate-800 text-xs tabular-nums font-medium">
        {stat ? fmtAvg(stat.avg) : "—"}
      </td>
      <td className="py-1.5 px-3 text-center text-slate-800 text-xs tabular-nums font-medium">
        {stat ? fmtOps(stat.ops) : "—"}
      </td>
      <td className="py-1.5 px-3 text-center text-slate-800 text-xs tabular-nums font-medium">
        {stat ? fmtHr(stat.hr) : "—"}
      </td>
    </tr>
  );
}

export default function SplitsTab({ splits }: SplitsTabProps) {
  const t = useTranslations("player");
  const [metric, setMetric] = useState<Metric>("avg");

  const isEmpty =
    !splits ||
    (splits.vs_left === null &&
      splits.vs_right === null &&
      splits.home === null &&
      splits.away === null &&
      splits.day === null &&
      splits.night === null);

  if (isEmpty) {
    return (
      <p className="text-slate-500 text-sm py-4 text-center">
        {t("splitsNoData")}
      </p>
    );
  }

  const metrics: Metric[] = ["avg", "ops", "hr"];
  const metricLabels: Record<Metric, string> = {
    avg: t("avg"),
    ops: t("ops"),
    hr: t("hr"),
  };

  return (
    <div className="space-y-4">
      {/* Metric selector */}
      <div className="flex gap-2 justify-center">
        {metrics.map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
              metric === m
                ? "bg-brand text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {metricLabels[m]}
          </button>
        ))}
      </div>

      {/* 3 chart cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* vs LHP / vs RHP */}
        <div className="bg-surface-muted rounded-lg p-2">
          <p className="text-xs text-slate-500 text-center mb-0 font-medium">
            {t("vsLeft")} / {t("vsRight")}
          </p>
          <SituationChart
            labelA={t("vsLeft")}
            labelB={t("vsRight")}
            statA={splits!.vs_left}
            statB={splits!.vs_right}
            metric={metric}
          />
          <div className="flex justify-around text-xs mt-0">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLOR_A }} />
              {t("vsLeft")}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLOR_B }} />
              {t("vsRight")}
            </span>
          </div>
        </div>

        {/* Home / Away */}
        <div className="bg-surface-muted rounded-lg p-2">
          <p className="text-xs text-slate-500 text-center mb-0 font-medium">
            {t("home")} / {t("away")}
          </p>
          <SituationChart
            labelA={t("home")}
            labelB={t("away")}
            statA={splits!.home}
            statB={splits!.away}
            metric={metric}
          />
          <div className="flex justify-around text-xs mt-0">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLOR_A }} />
              {t("home")}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLOR_B }} />
              {t("away")}
            </span>
          </div>
        </div>

        {/* Day / Night */}
        <div className="bg-surface-muted rounded-lg p-2">
          <p className="text-xs text-slate-500 text-center mb-0 font-medium">
            {t("day")} / {t("night")}
          </p>
          <SituationChart
            labelA={t("day")}
            labelB={t("night")}
            statA={splits!.day}
            statB={splits!.night}
            metric={metric}
          />
          <div className="flex justify-around text-xs mt-0">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLOR_A }} />
              {t("day")}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLOR_B }} />
              {t("night")}
            </span>
          </div>
        </div>
      </div>

      {/* Compact reference table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[300px]">
          <thead>
            <tr className="text-xs text-slate-500 uppercase tracking-wider bg-slate-100">
              <th className="py-1.5 px-3 text-left font-medium">{t("splitsHeader")}</th>
              <th className="py-1.5 px-3 text-center font-medium">{t("vsBatter")}</th>
              <th className="py-1.5 px-3 text-center font-medium">{t("avg")}</th>
              <th className="py-1.5 px-3 text-center font-medium">{t("ops")}</th>
              <th className="py-1.5 px-3 text-center font-medium">{t("hr")}</th>
            </tr>
          </thead>
          <tbody>
            <SummaryRow label={t("vsLeft")} stat={splits!.vs_left} />
            <SummaryRow label={t("vsRight")} stat={splits!.vs_right} />
            <SummaryRow label={t("home")} stat={splits!.home} />
            <SummaryRow label={t("away")} stat={splits!.away} />
            <SummaryRow label={t("day")} stat={splits!.day} />
            <SummaryRow label={t("night")} stat={splits!.night} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
