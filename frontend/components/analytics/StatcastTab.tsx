"use client";

import { useTranslations } from "next-intl";
import type { StatcastStats, PitchSplit } from "@/lib/api";
import ZoneHeatmap from "./ZoneHeatmap";
import VelocityChart from "./VelocityChart";
import StatTooltip from "@/components/StatTooltip";

interface StatcastTabProps {
  statcast: StatcastStats | null;
  locale: string;
}

function fmtAvg(v: number | null): string {
  if (v === null) return "—";
  return v.toFixed(3).replace(/^0/, "");
}

function fmtPct(v: number | null): string {
  if (v === null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

function fmtMph(v: number | null): string {
  if (v === null) return "—";
  return `${v.toFixed(1)} mph`;
}

function fmtDeg(v: number | null): string {
  if (v === null) return "—";
  return `${v.toFixed(1)}°`;
}

interface MetricCardProps {
  label: string;
  term: string;
  value: string;
  locale: string;
}

function MetricCard({ label, term, value, locale }: MetricCardProps) {
  return (
    <div className="bg-surface-card rounded-lg border border-surface-border p-3 flex flex-col gap-1 min-w-[100px] shadow-sm">
      <span className="text-xs text-slate-500 uppercase tracking-wide">
        <StatTooltip term={term} locale={locale}>{label}</StatTooltip>
      </span>
      <span className="text-lg font-bold text-slate-900 tabular-nums">{value}</span>
    </div>
  );
}

interface PitchRowProps {
  pitch: PitchSplit;
  locale: string;
}

function PitchRow({ pitch, locale }: PitchRowProps) {
  const name = locale === "ja" ? pitch.pitch_name_ja : pitch.pitch_name_en;
  return (
    <tr className="border-t border-surface-border odd:bg-white even:bg-slate-50">
      <td className="py-2 px-3 text-slate-600 text-sm">{name}</td>
      <td className="py-2 px-3 text-center text-slate-600 text-sm tabular-nums">{pitch.pa}</td>
      <td className="py-2 px-3 text-center text-slate-900 text-sm tabular-nums font-medium">
        {fmtAvg(pitch.avg)}
      </td>
      <td className="py-2 px-3 text-center text-slate-900 text-sm tabular-nums font-medium">
        {fmtPct(pitch.whiff_rate)}
      </td>
      <td className="py-2 px-3 text-center text-slate-900 text-sm tabular-nums font-medium">
        {pitch.hr ?? "—"}
      </td>
    </tr>
  );
}

export default function StatcastTab({ statcast, locale }: StatcastTabProps) {
  const t = useTranslations("player");

  if (!statcast) {
    return (
      <p className="text-slate-500 text-sm py-4 text-center">
        {t("noStatcastData")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric cards — row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          term="exit-velocity"
          label={t("exitVelocity")}
          value={fmtMph(statcast.exit_velocity_avg)}
          locale={locale}
        />
        <MetricCard
          term="barrel-rate"
          label={t("barrelRate")}
          value={fmtPct(statcast.barrel_rate)}
          locale={locale}
        />
        <MetricCard
          term="hard-hit"
          label={t("hardHitRate")}
          value={fmtPct(statcast.hard_hit_rate)}
          locale={locale}
        />
        <MetricCard
          term="launch-angle"
          label={t("launchAngle")}
          value={fmtDeg(statcast.launch_angle_avg)}
          locale={locale}
        />
      </div>

      {/* Metric cards — row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          term="xba"
          label={t("xba")}
          value={fmtAvg(statcast.xba)}
          locale={locale}
        />
        <MetricCard
          term="xslg"
          label={t("xslg")}
          value={fmtAvg(statcast.xslg)}
          locale={locale}
        />
      </div>

      {/* Pitch splits table */}
      {statcast.pitch_splits.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[340px]">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wider bg-slate-100">
                <th className="py-2 px-3 text-left font-medium">{t("pitchType")}</th>
                <th className="py-2 px-3 text-center font-medium">{t("vsBatter")}</th>
                <th className="py-2 px-3 text-center font-medium">{t("avg")}</th>
                <th className="py-2 px-3 text-center font-medium">{t("whiffRate")}</th>
                <th className="py-2 px-3 text-center font-medium">{t("hr")}</th>
              </tr>
            </thead>
            <tbody>
              {statcast.pitch_splits.map((pitch) => (
                <PitchRow key={pitch.pitch_type} pitch={pitch} locale={locale} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Zone heatmap */}
      {statcast.zone_stats.length > 0 && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-slate-600 uppercase tracking-wide">Strike Zone</p>
          <ZoneHeatmap zoneStats={statcast.zone_stats} />
          <div className="flex gap-2 flex-wrap justify-center text-xs text-slate-600 mt-1">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-red-700" />&gt;.320
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-orange-700" />.280-.320
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-slate-600" />.250-.280
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-blue-700" />.200-.250
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-blue-900" />&lt;.200
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-slate-200" />—
            </span>
          </div>
        </div>
      )}

      {/* Pitcher velocity trends */}
      {statcast.velocity_by_month && statcast.velocity_by_month.length > 0 && (
        <VelocityChart data={statcast.velocity_by_month} locale={locale} />
      )}
    </div>
  );
}
