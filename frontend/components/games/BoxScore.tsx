"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { GameBoxscore } from "@/lib/api";
import BattingTable from "./BattingTable";
import PitchingTable from "./PitchingTable";

interface Props {
  boxscore: GameBoxscore;
  homeTeam: string;
  awayTeam: string;
  locale: string;
}

export default function BoxScore({ boxscore, homeTeam, awayTeam, locale }: Props) {
  const tb = useTranslations("games.boxscore");
  const [activeTab, setActiveTab] = useState<"away" | "home">("away");

  const team = activeTab === "home" ? boxscore.home : boxscore.away;
  const hasData = team && (team.batters.length > 0 || team.pitchers.length > 0);

  const tabs = [
    { key: "away" as const, label: awayTeam },
    { key: "home" as const, label: homeTeam },
  ];

  return (
    <div className="bg-surface-card border border-surface-border rounded overflow-hidden">
      <div className="flex bg-navy">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 px-4 py-3 text-sm font-sans font-semibold transition-colors ${
              activeTab === key
                ? "bg-gold text-navy"
                : "text-white/70 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-6">
        {!hasData ? (
          <p className="text-center font-sans text-sm text-ink-muted py-6">
            {tb("lineupNotAvailable")}
          </p>
        ) : (
          <>
            {team!.batters.length > 0 && (
              <div>
                <h3 className="font-sans text-xs font-semibold uppercase tracking-wide text-navy border-b-2 border-gold pb-1 inline-block mb-3">
                  {tb("batting")}
                </h3>
                <BattingTable batters={team!.batters} locale={locale} />
              </div>
            )}
            {team!.pitchers.length > 0 && (
              <div>
                <h3 className="font-sans text-xs font-semibold uppercase tracking-wide text-navy border-b-2 border-gold pb-1 inline-block mb-3">
                  {tb("pitching")}
                </h3>
                <PitchingTable pitchers={team!.pitchers} locale={locale} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
