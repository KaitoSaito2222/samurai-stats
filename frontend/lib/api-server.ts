import axios from "axios";
import type { PaginatedPlayers, Game, Player, PlayerStats, PlayerAnalytics, Rankings, GameDetail } from "./api";

// Server-side only — uses the internal Docker service URL (not exposed to the browser).
// Do NOT import this file in Client Components.
const serverApi = axios.create({
  baseURL: process.env.API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL,
});

export const getJapanesePlayersServer = (page = 1, limit = 20) =>
  serverApi.get<PaginatedPlayers>("/api/players/japanese", {
    params: { page, limit },
  });

export const getTodayGamesServer = () =>
  serverApi.get<Game[]>("/api/games/today");

export const getPlayerServer = (id: string | number) =>
  serverApi.get<Player>(`/api/players/${id}`);

export const getPlayerStatsServer = (id: string | number) =>
  serverApi.get<PlayerStats>(`/api/players/${id}/stats`);

export const getPlayerAnalyticsServer = (id: string | number, season?: number) =>
  serverApi.get<PlayerAnalytics>(`/api/players/${id}/analytics`, {
    params: season ? { season } : {},
  });

export const getRankingsServer = (season?: number) =>
  serverApi.get<Rankings>("/api/rankings", { params: season ? { season } : {} });

export const getGameServer = (id: string) =>
  serverApi.get<GameDetail>(`/api/games/${id}`);
