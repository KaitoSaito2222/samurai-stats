"use client";

import { useTranslations } from "next-intl";
import type { SplitStat, PlayerAnalytics } from "@/lib/api";

interface SplitsTabProps {
  splits: PlayerAnalytics["splits"];
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

interface SplitRowProps {
  label: string;
  stat: SplitStat | null;
}

function SplitRow({ label, stat }: SplitRowProps) {
  return (
    <tr className="border-t border-surface-border">
      <td className="py-2 px-3 text-slate-300 text-sm">{label}</td>
      <td className="py-2 px-3 text-center text-slate-300 text-sm tabular-nums">
        {stat ? stat.pa : "—"}
      </td>
      <td className="py-2 px-3 text-center text-white text-sm tabular-nums font-medium">
        {stat ? fmtAvg(stat.avg) : "—"}
      </td>
      <td className="py-2 px-3 text-center text-white text-sm tabular-nums font-medium">
        {stat ? fmtOps(stat.ops) : "—"}
      </td>
      <td className="py-2 px-3 text-center text-white text-sm tabular-nums font-medium">
        {stat ? fmtHr(stat.hr) : "—"}
      </td>
    </tr>
  );
}

export default function SplitsTab({ splits }: SplitsTabProps) {
  const t = useTranslations("player");

  if (!splits) {
    return (
      <p className="text-slate-400 text-sm py-4 text-center">
        {t("summaryUnavailable")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px]">
        <thead>
          <tr className="text-xs text-slate-500 uppercase tracking-wider">
            <th className="py-2 px-3 text-left font-medium">状況</th>
            <th className="py-2 px-3 text-center font-medium">{t("vsBatter")}</th>
            <th className="py-2 px-3 text-center font-medium">{t("avg")}</th>
            <th className="py-2 px-3 text-center font-medium">{t("ops")}</th>
            <th className="py-2 px-3 text-center font-medium">{t("hr")}</th>
          </tr>
        </thead>
        <tbody>
          <SplitRow label={t("vsLeft")} stat={splits.vs_left} />
          <SplitRow label={t("vsRight")} stat={splits.vs_right} />
          <SplitRow label={t("home")} stat={splits.home} />
          <SplitRow label={t("away")} stat={splits.away} />
          <SplitRow label={t("day")} stat={splits.day} />
          <SplitRow label={t("night")} stat={splits.night} />
        </tbody>
      </table>
    </div>
  );
}
