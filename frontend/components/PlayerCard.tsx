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
      className="block bg-surface-card hover:bg-surface-muted border border-surface-border rounded-xl p-4 transition-all shadow-sm hover:shadow-md group"
    >
      <div className="flex items-center gap-4">
        {/* Player photo */}
        <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
          {player.photo_url ? (
            <Image
              src={player.photo_url}
              alt={displayName}
              width={64}
              height={64}
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">
              ⚾
            </div>
          )}
        </div>

        {/* Player info */}
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-900 truncate group-hover:text-brand transition-colors">
            {displayName}
          </h3>
          {subName && (
            <p className="text-xs text-slate-500 truncate">{subName}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="px-2 py-0.5 bg-brand/15 text-brand text-xs rounded-full font-medium truncate max-w-[120px]">
              {teamDisplay}
            </span>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">
              {player.position}
            </span>
          </div>
        </div>

        {/* Arrow */}
        <div className="text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
