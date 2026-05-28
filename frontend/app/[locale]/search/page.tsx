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
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>

      {/* Search input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("placeholder")}
          className="flex-1 px-4 py-3 bg-surface-card border border-surface-border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand shadow-sm"
        />
        <button
          onClick={() => handleSearch(query)}
          disabled={loading || !query.trim()}
          className="px-6 py-3 bg-brand hover:bg-brand-dark text-white font-medium rounded-xl disabled:opacity-50 transition-colors shadow-sm"
        >
          {loading ? "..." : t("searchButton")}
        </button>
      </div>

      {/* Results */}
      {loading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 animate-pulse rounded-xl" />
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-slate-500">{t("noResults")}</p>
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
                className="flex items-center gap-4 p-4 bg-surface-card border border-surface-border rounded-xl hover:shadow-md transition-shadow group"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                  {player.photo_url ? (
                    <Image src={player.photo_url} alt={displayName} width={40} height={40} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">⚾</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 group-hover:text-brand transition-colors truncate">{displayName}</p>
                  <p className="text-xs text-slate-500 truncate">{teamDisplay} · {player.position}</p>
                </div>
                {player.is_japanese && (
                  <span className="px-2 py-0.5 bg-brand/10 text-brand text-xs rounded-full font-medium flex-shrink-0">🇯🇵</span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
