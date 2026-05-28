"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getCareer } from "@/lib/api";
import type { CareerSeasonStat } from "@/lib/api";
import {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryTheme,
} from "victory";

interface CareerTabProps {
  playerId: string;
}

// Chart colors
const COLOR_AVG = "#E01A38";   // brand red
const COLOR_OPS = "#F59E0B";   // amber
const COLOR_ERA = "#1B3A6B";   // navy
const COLOR_WHIP = "#F59E0B";  // amber

function formatAvg(val: number | null | undefined): string {
  if (val == null) return "---";
  return val.toFixed(3).replace(/^0/, "");
}

function formatDecimal(val: number | null | undefined, dp = 2): string {
  if (val == null) return "---";
  return val.toFixed(dp);
}

function formatInt(val: number | null | undefined): string {
  if (val == null) return "---";
  return String(val);
}

// Loading skeleton
function CareerSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-5 bg-slate-200 rounded w-1/4 mb-2" />
      <div className="h-56 bg-slate-100 rounded" />
      <div className="space-y-2 mt-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 bg-slate-100 rounded" />
        ))}
      </div>
    </div>
  );
}

// Season table for batting
function BattingTable({ seasons }: { seasons: CareerSeasonStat[] }) {
  const t = useTranslations("player");
  return (
    <div className="overflow-x-auto mt-4">
      <table className="min-w-full text-xs text-slate-700">
        <thead>
          <tr className="border-b border-surface-border text-slate-500">
            <th className="py-1 pr-3 text-left font-medium">Year</th>
            <th className="py-1 pr-3 text-right font-medium">G</th>
            <th className="py-1 pr-3 text-right font-medium">{t("avg")}</th>
            <th className="py-1 pr-3 text-right font-medium">{t("ops")}</th>
            <th className="py-1 pr-3 text-right font-medium">{t("hr")}</th>
            <th className="py-1 text-right font-medium">{t("rbi")}</th>
          </tr>
        </thead>
        <tbody>
          {seasons.map((s) => (
            <tr
              key={`${s.season}-batting`}
              className="border-b border-surface-border last:border-0"
            >
              <td className="py-1 pr-3 font-medium tabular-nums">{s.season}</td>
              <td className="py-1 pr-3 text-right tabular-nums">
                {formatInt(s.games)}
              </td>
              <td className="py-1 pr-3 text-right tabular-nums">
                {formatAvg(s.avg)}
              </td>
              <td className="py-1 pr-3 text-right tabular-nums">
                {s.ops != null ? s.ops.toFixed(3).replace(/^0/, "") : "---"}
              </td>
              <td className="py-1 pr-3 text-right tabular-nums">
                {formatInt(s.home_runs)}
              </td>
              <td className="py-1 text-right tabular-nums">
                {formatInt(s.rbi)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Season table for pitching
function PitchingTable({ seasons }: { seasons: CareerSeasonStat[] }) {
  const t = useTranslations("player");
  return (
    <div className="overflow-x-auto mt-4">
      <table className="min-w-full text-xs text-slate-700">
        <thead>
          <tr className="border-b border-surface-border text-slate-500">
            <th className="py-1 pr-3 text-left font-medium">Year</th>
            <th className="py-1 pr-3 text-right font-medium">G</th>
            <th className="py-1 pr-3 text-right font-medium">{t("era")}</th>
            <th className="py-1 pr-3 text-right font-medium">{t("wins")}</th>
            <th className="py-1 pr-3 text-right font-medium">{t("strikeouts")}</th>
            <th className="py-1 text-right font-medium">{t("whip")}</th>
          </tr>
        </thead>
        <tbody>
          {seasons.map((s) => (
            <tr
              key={`${s.season}-pitching`}
              className="border-b border-surface-border last:border-0"
            >
              <td className="py-1 pr-3 font-medium tabular-nums">{s.season}</td>
              <td className="py-1 pr-3 text-right tabular-nums">
                {formatInt(s.games)}
              </td>
              <td className="py-1 pr-3 text-right tabular-nums">
                {formatDecimal(s.era)}
              </td>
              <td className="py-1 pr-3 text-right tabular-nums">
                {formatInt(s.wins)}
              </td>
              <td className="py-1 pr-3 text-right tabular-nums">
                {formatInt(s.strikeouts)}
              </td>
              <td className="py-1 text-right tabular-nums">
                {formatDecimal(s.whip)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Victory line chart for batting (AVG + OPS)
function BattingChart({ seasons }: { seasons: CareerSeasonStat[] }) {
  const t = useTranslations("player");

  const avgData = seasons
    .filter((s) => s.avg != null)
    .map((s) => ({ x: s.season, y: s.avg as number }));

  const opsData = seasons
    .filter((s) => s.ops != null)
    .map((s) => ({ x: s.season, y: s.ops as number }));

  if (avgData.length === 0 && opsData.length === 0) return null;

  const allSeasons = seasons.map((s) => s.season);
  const minSeason = Math.min(...allSeasons);
  const maxSeason = Math.max(...allSeasons);
  const tickValues = Array.from(
    { length: maxSeason - minSeason + 1 },
    (_, i) => minSeason + i
  );

  return (
    <div className="w-full">
      <VictoryChart
        theme={VictoryTheme.material}
        domainPadding={{ x: 20 }}
        padding={{ top: 20, bottom: 50, left: 55, right: 20 }}
        height={260}
      >
        <VictoryAxis
          tickValues={tickValues}
          tickFormat={(v: number) => String(v)}
          style={{
            axis: { stroke: "#CBD5E1" },
            tickLabels: { fill: "#64748B", fontSize: 10, angle: -45 },
            grid: { stroke: "transparent" },
          }}
        />
        <VictoryAxis
          dependentAxis
          domain={[0, 1.2]}
          tickFormat={(v: number) =>
            v <= 0.4 ? v.toFixed(3).replace(/^0/, "") : v.toFixed(2)
          }
          style={{
            axis: { stroke: "#CBD5E1" },
            tickLabels: { fill: "#64748B", fontSize: 10 },
            grid: { stroke: "#E2E8F0" },
          }}
        />
        {opsData.length > 0 && (
          <VictoryLine
            data={opsData}
            style={{ data: { stroke: COLOR_OPS, strokeWidth: 2 } }}
          />
        )}
        {avgData.length > 0 && (
          <VictoryLine
            data={avgData}
            style={{ data: { stroke: COLOR_AVG, strokeWidth: 2.5 } }}
          />
        )}
      </VictoryChart>

      {/* Legend */}
      <div className="flex gap-4 justify-center mt-1 text-xs text-slate-500">
        {avgData.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-6 h-0.5 bg-brand" />
            {t("avg")}
          </span>
        )}
        {opsData.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-6 h-0.5 bg-amber-400" />
            {t("ops")}
          </span>
        )}
      </div>
    </div>
  );
}

// Victory line chart for pitching (ERA + WHIP)
function PitchingChart({ seasons }: { seasons: CareerSeasonStat[] }) {
  const t = useTranslations("player");

  const eraData = seasons
    .filter((s) => s.era != null)
    .map((s) => ({ x: s.season, y: s.era as number }));

  const whipData = seasons
    .filter((s) => s.whip != null)
    .map((s) => ({ x: s.season, y: s.whip as number }));

  if (eraData.length === 0 && whipData.length === 0) return null;

  const allSeasons = seasons.map((s) => s.season);
  const minSeason = Math.min(...allSeasons);
  const maxSeason = Math.max(...allSeasons);
  const tickValues = Array.from(
    { length: maxSeason - minSeason + 1 },
    (_, i) => minSeason + i
  );

  return (
    <div className="w-full">
      <VictoryChart
        theme={VictoryTheme.material}
        domainPadding={{ x: 20 }}
        padding={{ top: 20, bottom: 50, left: 50, right: 20 }}
        height={260}
      >
        <VictoryAxis
          tickValues={tickValues}
          tickFormat={(v: number) => String(v)}
          style={{
            axis: { stroke: "#CBD5E1" },
            tickLabels: { fill: "#64748B", fontSize: 10, angle: -45 },
            grid: { stroke: "transparent" },
          }}
        />
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: "#CBD5E1" },
            tickLabels: { fill: "#64748B", fontSize: 10 },
            grid: { stroke: "#E2E8F0" },
          }}
        />
        {whipData.length > 0 && (
          <VictoryLine
            data={whipData}
            style={{ data: { stroke: COLOR_WHIP, strokeWidth: 2 } }}
          />
        )}
        {eraData.length > 0 && (
          <VictoryLine
            data={eraData}
            style={{ data: { stroke: COLOR_ERA, strokeWidth: 2.5 } }}
          />
        )}
      </VictoryChart>

      {/* Legend */}
      <div className="flex gap-4 justify-center mt-1 text-xs text-slate-500">
        {eraData.length > 0 && (
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-6 h-0.5"
              style={{ backgroundColor: COLOR_ERA }}
            />
            {t("era")}
          </span>
        )}
        {whipData.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-6 h-0.5 bg-amber-400" />
            {t("whip")}
          </span>
        )}
      </div>
    </div>
  );
}

export default function CareerTab({ playerId }: CareerTabProps) {
  const t = useTranslations("player");

  const [seasons, setSeasons] = useState<CareerSeasonStat[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(false);

    getCareer(playerId)
      .then((res) => {
        if (!cancelled) {
          setSeasons(res.data.seasons);
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
    return <CareerSkeleton />;
  }

  if (error || !seasons) {
    return (
      <p className="text-slate-500 text-sm py-4 text-center">
        {t("careerNoData")}
      </p>
    );
  }

  const battingSeasons = seasons.filter((s) => s.stat_type === "batting");
  const pitchingSeasons = seasons.filter((s) => s.stat_type === "pitching");

  if (battingSeasons.length === 0 && pitchingSeasons.length === 0) {
    return (
      <p className="text-slate-500 text-sm py-4 text-center">
        {t("careerNoData")}
      </p>
    );
  }

  try {
    return (
      <div className="space-y-8">
        {/* Batting section */}
        {battingSeasons.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              {t("batting")}
            </h3>
            <BattingChart seasons={battingSeasons} />
            <BattingTable seasons={battingSeasons} />
          </section>
        )}

        {/* Pitching section */}
        {pitchingSeasons.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              {t("pitching")}
            </h3>
            <PitchingChart seasons={pitchingSeasons} />
            <PitchingTable seasons={pitchingSeasons} />
          </section>
        )}
      </div>
    );
  } catch {
    return (
      <p className="text-slate-500 text-sm py-4 text-center">
        {t("careerNoData")}
      </p>
    );
  }
}
