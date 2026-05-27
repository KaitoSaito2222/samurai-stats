"use client";

import { useTranslations } from "next-intl";
import type { PlayerStats } from "@/lib/api";

interface StatsTableProps {
  stats: PlayerStats;
}

export default function StatsTable({ stats }: StatsTableProps) {
  const t = useTranslations("player");

  const battingRows = [
    { key: t("avg"), value: stats.avg ?? "—" },
    { key: t("hr"), value: stats.hr?.toString() ?? "—" },
    { key: t("rbi"), value: stats.rbi?.toString() ?? "—" },
    { key: t("ops"), value: stats.ops ?? "—" },
  ];

  const pitchingRows = [
    { key: t("era"), value: stats.era ?? "—" },
    { key: t("wins"), value: stats.wins?.toString() ?? "—" },
    { key: t("strikeouts"), value: stats.strikeouts?.toString() ?? "—" },
    { key: t("whip"), value: stats.whip ?? "—" },
  ];

  const rows = stats.type === "batting" ? battingRows : pitchingRows;
  const title = stats.type === "batting" ? t("batting") : t("pitching");

  return (
    <div className="bg-surface-card rounded-xl border border-surface-border overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-border">
        <h2 className="text-lg font-bold text-white">
          {title}{" "}
          <span className="text-sm font-normal text-slate-400">({stats.season})</span>
        </h2>
      </div>
      <div className="divide-y divide-surface-border">
        {rows.map(({ key, value }) => (
          <div key={key} className="flex items-center justify-between px-6 py-3">
            <span className="text-slate-400 text-sm">{key}</span>
            <span className="text-white font-semibold tabular-nums">{value}</span>
          </div>
        ))}
        {/* Games played row */}
        <div className="flex items-center justify-between px-6 py-3">
          <span className="text-slate-400 text-sm">
            {t("stats")} (G)
          </span>
          <span className="text-white font-semibold tabular-nums">{stats.games}</span>
        </div>
      </div>
    </div>
  );
}
