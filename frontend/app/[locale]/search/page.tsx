"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import api from "@/lib/api";
import type { Player, PaginatedPlayers } from "@/lib/api";

export default function SearchPage() {
  const t = useTranslations("search");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get<PaginatedPlayers>("/api/players/search", {
        params: { q, page: 1, limit: 20 },
      });
      setResults(res.data.items);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch(query);
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="border-b border-surface-border pb-3">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-gold-dark mb-1">MLB</p>
        <h1 className="font-display text-2xl sm:text-[28px] font-bold text-navy leading-tight">{t("title")}</h1>
      </div>

      {/* Search input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("placeholder")}
          className="flex-1 px-4 py-3 bg-surface-card border border-navy rounded-lg font-serif text-ink placeholder-ink-muted/60 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-colors"
        />
        <button
          onClick={() => handleSearch(query)}
          disabled={loading || !query.trim()}
          className="px-6 py-3 bg-navy hover:bg-navy-dark text-white font-sans text-sm font-semibold uppercase tracking-wide rounded-lg disabled:opacity-50 transition-colors"
        >
          {loading ? "..." : t("searchButton")}
        </button>
      </div>

      {/* Results */}
      {loading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-surface-muted animate-pulse rounded" />
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-serif text-ink-muted">{t("noResults")}</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((player) => {
            const displayName = locale === "ja" && player.name_ja ? player.name_ja : player.name_en;
            const teamDisplay = locale === "ja" && player.team_ja ? player.team_ja : player.team_en;
            return (
              <Link
                key={player.id}
                href={`/${locale}/players/${player.id}`}
                className="flex items-center gap-4 px-4 py-3 bg-surface-card border border-surface-border rounded hover:border-gold hover:shadow-float transition-all group"
              >
                <div className="w-10 h-10 rounded overflow-hidden bg-surface-muted flex-shrink-0 border border-surface-border">
                  {player.photo_url ? (
                    <Image src={player.photo_url} alt={displayName} width={40} height={40} className="w-full h-full object-cover object-top" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">⚾</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-navy group-hover:text-gold-dark transition-colors truncate">{displayName}</p>
                  <p className="font-sans text-xs uppercase tracking-wide text-ink-muted truncate">{teamDisplay} · {player.position}</p>
                </div>
                {player.is_japanese && (
                  <span className="text-base flex-shrink-0">🇯🇵</span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
