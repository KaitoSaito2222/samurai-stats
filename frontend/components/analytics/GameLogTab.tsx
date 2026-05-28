"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { VictoryChart, VictoryScatter, VictoryAxis, VictoryTheme } from "victory";
import { getGameLogs } from "@/lib/api";
import type { GameLogEntry } from "@/lib/api";

interface GameLogTabProps {
  playerId: string;
  locale: string;
}

// Brand colors matching tailwind.config.ts tokens
const COLOR_HR = "#E01A38";    // brand red — game with HR
const COLOR_DEFAULT = "#1B3A6B"; // navy — no HR

function fmtAvg(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return v.toFixed(3).replace(/^0/, "");
}

export default function GameLogTab({ playerId }: GameLogTabProps) {
  const t = useTranslations("player");
  const [entries, setEntries] = useState<GameLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    getGameLogs(playerId)
      .then((res) => {
        setEntries(res.data.entries);
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [playerId]);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-48 bg-slate-100 rounded-lg" />
        <div className="h-24 bg-slate-100 rounded-lg" />
      </div>
    );
  }

  if (error || entries.length === 0) {
    return (
      <p className="text-slate-500 text-sm py-4 text-center">
        {t("gameLogNoData")}
      </p>
    );
  }

  // Build scatter data: x = game number (1-based), y = hits
  const scatterData = entries.map((entry, idx) => ({
    x: idx + 1,
    y: entry.hits ?? 0,
    size: Math.max(4, (entry.rbi ?? 0) * 2 + 4),
    fill: (entry.home_runs ?? 0) > 0 ? COLOR_HR : COLOR_DEFAULT,
    entry,
  }));

  // Recent 10 games (last entries)
  const recent10 = entries.slice(-10).reverse();

  const maxY = Math.max(...entries.map((e) => e.hits ?? 0), 3);

  return (
    <div className="w-full space-y-4">
      {/* Scatter chart */}
      <div>
        <VictoryChart
          theme={VictoryTheme.material}
          domainPadding={{ x: 10, y: 10 }}
          padding={{ top: 20, bottom: 50, left: 40, right: 20 }}
          height={220}
          domain={{ y: [0, maxY + 1] }}
        >
          <VictoryAxis
            label={t("gameLogs")}
            style={{
              axis: { stroke: "#CBD5E1" },
              tickLabels: { fill: "#64748B", fontSize: 10 },
              axisLabel: { fill: "#94A3B8", fontSize: 10, padding: 35 },
              grid: { stroke: "transparent" },
            }}
          />
          <VictoryAxis
            dependentAxis
            tickValues={Array.from({ length: maxY + 2 }, (_, i) => i)}
            tickFormat={(v: number) => (Number.isInteger(v) ? String(v) : "")}
            style={{
              axis: { stroke: "#CBD5E1" },
              tickLabels: { fill: "#64748B", fontSize: 10 },
              grid: { stroke: "#E2E8F0" },
            }}
          />
          <VictoryScatter
            data={scatterData}
            x="x"
            y="y"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            size={({ datum }: any) => datum.size}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            style={{ data: { fill: ({ datum }: any) => datum.fill, opacity: 0.8 } }}
          />
        </VictoryChart>
        {/* Legend */}
        <div className="flex gap-4 justify-center mt-1 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: COLOR_HR }} />
            {t("hr")}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: COLOR_DEFAULT }} />
            {t("avg")}
          </span>
        </div>
      </div>

      {/* Recent 10 games table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[380px] text-xs">
          <thead>
            <tr className="text-xs text-slate-500 uppercase tracking-wider bg-slate-100">
              <th className="py-1.5 px-2 text-left font-medium">{t("splitsHeader")}</th>
              <th className="py-1.5 px-2 text-left font-medium">{t("opponent")}</th>
              <th className="py-1.5 px-2 text-center font-medium">AB</th>
              <th className="py-1.5 px-2 text-center font-medium">H</th>
              <th className="py-1.5 px-2 text-center font-medium">{t("hr")}</th>
              <th className="py-1.5 px-2 text-center font-medium">{t("rbi")}</th>
              <th className="py-1.5 px-2 text-center font-medium">{t("avg")}</th>
            </tr>
          </thead>
          <tbody>
            {recent10.map((entry) => (
              <tr
                key={`${entry.date}-${entry.game_pk}`}
                className="border-t border-surface-border odd:bg-white even:bg-slate-50"
              >
                <td className="py-1.5 px-2 text-slate-600 tabular-nums">{entry.date}</td>
                <td className="py-1.5 px-2 text-slate-700">{entry.opponent}</td>
                <td className="py-1.5 px-2 text-center text-slate-800 tabular-nums">
                  {entry.at_bats ?? "—"}
                </td>
                <td className="py-1.5 px-2 text-center text-slate-800 tabular-nums font-medium">
                  {entry.hits ?? "—"}
                </td>
                <td className="py-1.5 px-2 text-center tabular-nums font-medium">
                  {(entry.home_runs ?? 0) > 0 ? (
                    <span className="text-brand font-bold">{entry.home_runs}</span>
                  ) : (
                    <span className="text-slate-800">{entry.home_runs ?? "—"}</span>
                  )}
                </td>
                <td className="py-1.5 px-2 text-center text-slate-800 tabular-nums">
                  {entry.rbi ?? "—"}
                </td>
                <td className="py-1.5 px-2 text-center text-slate-800 tabular-nums">
                  {fmtAvg(entry.avg)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
