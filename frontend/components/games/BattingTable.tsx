"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { BoxscoreBatter } from "@/lib/api";

interface Props {
  batters: BoxscoreBatter[];
  locale: string;
}

export default function BattingTable({ batters, locale }: Props) {
  const t = useTranslations("games.boxscore");

  if (batters.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-sans border-collapse">
        <thead>
          <tr className="bg-navy text-white uppercase tracking-wide">
            <th className="px-2 py-2 text-center w-7">{t("order")}</th>
            <th className="px-3 py-2 text-left min-w-[120px]">{t("player")}</th>
            <th className="px-2 py-2 text-center">{t("pos")}</th>
            <th className="px-2 py-2 text-center">{t("ab")}</th>
            <th className="px-2 py-2 text-center">{t("r")}</th>
            <th className="px-2 py-2 text-center">{t("h")}</th>
            <th className="px-2 py-2 text-center">{t("double")}</th>
            <th className="px-2 py-2 text-center">{t("hr")}</th>
            <th className="px-2 py-2 text-center">{t("rbi")}</th>
            <th className="px-2 py-2 text-center">{t("bb")}</th>
            <th className="px-2 py-2 text-center">{t("k")}</th>
            <th className="px-2 py-2 text-center">{t("avg")}</th>
          </tr>
        </thead>
        <tbody>
          {batters.map((b, i) => {
            const name = locale === "ja" && b.name_ja ? b.name_ja : b.name_en;
            const rowClass = b.is_analyzable
              ? "bg-gold/10 border-b border-gold/30"
              : i % 2 === 0
              ? "bg-surface-card border-b border-surface-border"
              : "bg-surface-muted border-b border-surface-border";

            return (
              <tr key={b.player_id} className={rowClass}>
                <td className="px-2 py-2 text-center text-ink-muted tabular-nums">
                  {b.batting_order ?? "–"}
                </td>
                <td className="px-3 py-2">
                  {b.is_analyzable ? (
                    <Link
                      href={`/${locale}/players/${b.player_id}`}
                      className="font-bold text-navy hover:text-gold-dark transition-colors"
                    >
                      🇯🇵 {name}
                    </Link>
                  ) : (
                    <span className="text-ink">{name}</span>
                  )}
                </td>
                <td className="px-2 py-2 text-center text-ink-muted">{b.position}</td>
                <td className="px-2 py-2 text-center tabular-nums">{b.at_bats}</td>
                <td className="px-2 py-2 text-center tabular-nums">{b.runs}</td>
                <td className="px-2 py-2 text-center tabular-nums font-medium">{b.hits}</td>
                <td className="px-2 py-2 text-center tabular-nums">{b.doubles}</td>
                <td className="px-2 py-2 text-center tabular-nums">
                  {b.home_runs > 0 ? (
                    <span className="font-bold text-navy">{b.home_runs}</span>
                  ) : (
                    b.home_runs
                  )}
                </td>
                <td className="px-2 py-2 text-center tabular-nums">{b.rbi}</td>
                <td className="px-2 py-2 text-center tabular-nums">{b.walks}</td>
                <td className="px-2 py-2 text-center tabular-nums">{b.strikeouts}</td>
                <td className="px-2 py-2 text-center tabular-nums text-ink-muted">
                  {b.avg != null ? b.avg.toFixed(3).replace(/^0/, "") : "–"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
