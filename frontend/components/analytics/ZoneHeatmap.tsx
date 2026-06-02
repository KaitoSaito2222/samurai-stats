"use client";

import type { ZoneStat } from "@/lib/api";

interface ZoneHeatmapProps {
  zoneStats: ZoneStat[];
}

function isEmptyZone(stat: ZoneStat | undefined): boolean {
  return !stat || stat.pa < 5 || stat.avg === null;
}

function getZoneBg(stat: ZoneStat | undefined): string {
  if (isEmptyZone(stat)) return "bg-slate-200";
  const avg = stat!.avg!;
  if (avg < 0.2) return "bg-blue-900";
  if (avg < 0.25) return "bg-blue-700";
  if (avg < 0.28) return "bg-slate-600";
  if (avg < 0.32) return "bg-orange-700";
  return "bg-red-700";
}

function fmtAvg(v: number | null): string {
  if (v === null) return "—";
  return v.toFixed(3).replace(/^0/, "");
}

export default function ZoneHeatmap({ zoneStats }: ZoneHeatmapProps) {
  // Zone layout (batter's perspective):
  // [1][2][3]  <- high
  // [4][5][6]  <- middle
  // [7][8][9]  <- low
  const rows = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ];

  const statByZone = Object.fromEntries(zoneStats.map((z) => [z.zone, z]));

  return (
    <div className="inline-grid grid-cols-3 gap-1" aria-label="Strike zone heatmap">
      {rows.flat().map((zone) => {
        const stat = statByZone[zone] as ZoneStat | undefined;
        const bg = getZoneBg(stat);
        const isEmpty = isEmptyZone(stat);
        return (
          <div
            key={zone}
            className={`${bg} rounded flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20`}
            title={`Zone ${zone}`}
          >
            <span className={`text-sm font-bold tabular-nums ${isEmpty ? "text-slate-400" : "text-white"}`}>
              {fmtAvg(stat?.avg ?? null)}
            </span>
            {!isEmptyZone(stat) && (
              <span className={`text-xs tabular-nums ${isEmpty ? "text-slate-400" : "text-white/60"}`}>{stat?.pa}PA</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
