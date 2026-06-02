import Link from "next/link";
import Image from "next/image";
import type { Player } from "@/lib/api";

interface PlayerCardProps {
  player: Player;
  locale: string;
}

export default function PlayerCard({ player, locale }: PlayerCardProps) {
  const displayName = locale === "ja" && player.name_ja ? player.name_ja : player.name_en;
  const subName = locale === "ja" && player.name_ja ? player.name_en : null;
  const teamDisplay = locale === "ja" && player.team_ja ? player.team_ja : player.team_en;

  return (
    <Link
      href={`/${locale}/players/${player.id}`}
      className="group block bg-surface-card border border-surface-border rounded p-4 transition-all duration-200 hover:border-gold hover:shadow-float"
    >
      <div className="flex items-center gap-4">
        {/* Player photo */}
        <div className="w-16 h-16 rounded overflow-hidden bg-surface-muted flex-shrink-0 border border-surface-border">
          {player.photo_url ? (
            <Image
              src={player.photo_url}
              alt={displayName}
              width={64}
              height={64}
              className="w-full h-full object-cover object-top grayscale-[15%] group-hover:grayscale-0 transition-all duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">⚾</div>
          )}
        </div>

        {/* Player info */}
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold text-navy truncate group-hover:text-gold-dark transition-colors leading-snug">
            {displayName}
          </h3>
          {subName && (
            <p className="font-sans text-xs text-ink-muted truncate">{subName}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
            <span className="font-sans text-xs uppercase tracking-wide text-navy truncate max-w-[140px]">
              {teamDisplay}
            </span>
            <span className="h-3 w-px bg-surface-outline" />
            <span className="font-sans text-xs uppercase tracking-wide text-ink-muted">
              {player.position}
            </span>
          </div>
        </div>

        {/* Arrow */}
        <div className="text-surface-outline group-hover:text-gold transition-colors flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
