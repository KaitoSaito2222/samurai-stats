"use client";

import { useState, useEffect } from "react";
import { addFavorite, removeFavorite, getFavorites } from "@/lib/api";

interface FavoriteButtonProps {
  playerId: string;
  isLoggedIn: boolean;
  locale: string;
}

export default function FavoriteButton({ playerId, isLoggedIn, locale }: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    getFavorites().then((res) => {
      setIsFavorite(res.data.some((f) => f.player_id === playerId));
    }).catch(() => {});
  }, [playerId, isLoggedIn]);

  const toggle = async () => {
    if (!isLoggedIn) {
      window.location.href = `/${locale}/login`;
      return;
    }
    setLoading(true);
    try {
      if (isFavorite) {
        await removeFavorite(playerId);
        setIsFavorite(false);
      } else {
        await addFavorite(playerId);
        setIsFavorite(true);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      className={`p-2 rounded-lg transition-colors ${
        isFavorite
          ? "text-gold bg-white/10 hover:bg-white/20"
          : "text-white/50 hover:text-gold hover:bg-white/10"
      }`}
    >
      <svg className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    </button>
  );
}
