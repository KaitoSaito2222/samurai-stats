"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { BoxscorePitcher } from "@/lib/api";

interface Props {
  pitchers: BoxscorePitcher[];
  locale: string;
}

export default function PitchingTable({ pitchers, locale }: Props) {
  const t = useTranslations("games.boxscore");

  if (pitchers.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-sans border-collapse">
        <thead>
          <tr className="bg-navy text-white uppercase tracking-wide">
            <th className="px-3 py-2 text-left min-w-[120px]">{t("player")}</th>
            <th className="px-2 py-2 text-center">{t("ip")}</th>
            <th className="px-2 py-2 text-center">{t("h")}</th>
            <th className="px-2 py-2 text-center">{t("r")}</th>
            <th className="px-2 py-2 text-center">{t("er")}</th>
            <th className="px-2 py-2 text-center">{t("bb")}</th>
            <th className="px-2 py-2 text-center">{t("k")}</th>
            <th className="px-2 py-2 text-center">{t("hr")}</th>
            <th className="px-2 py-2 text-center">{t("era")}</th>
          </tr>
        </thead>
        <tbody>
          {pitchers.map((p, i) => {
            const name = locale === "ja" && p.name_ja ? p.name_ja : p.name_en;
            const rowClass = p.is_analyzable
              ? "bg-gold/10 border-b border-gold/30"
              : i % 2 === 0
              ? "bg-surface-card border-b border-surface-border"
              : "bg-surface-muted border-b border-surface-border";

            return (
              <tr key={p.player_id} className={rowClass}>
                <td className="px-3 py-2">
                  {p.is_analyzable ? (
                    <Link
                      href={`/${locale}/players/${p.player_id}`}
                      className="font-bold text-navy hover:text-gold-dark transition-colors"
                    >
                      🇯🇵 {name}
                    </Link>
                  ) : (
                    <span className="text-ink">{name}</span>
                  )}
                </td>
                <td className="px-2 py-2 text-center tabular-nums font-medium">
                  {p.innings_pitched}
                </td>
                <td className="px-2 py-2 text-center tabular-nums">{p.hits}</td>
                <td className="px-2 py-2 text-center tabular-nums">{p.runs}</td>
                <td className="px-2 py-2 text-center tabular-nums">{p.earned_runs}</td>
                <td className="px-2 py-2 text-center tabular-nums">{p.walks}</td>
                <td className="px-2 py-2 text-center tabular-nums">{p.strikeouts}</td>
                <td className="px-2 py-2 text-center tabular-nums">{p.home_runs}</td>
                <td className="px-2 py-2 text-center tabular-nums text-ink-muted">
                  {p.era != null ? p.era.toFixed(2) : "–"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
