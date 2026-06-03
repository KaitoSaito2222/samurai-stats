import axios from "axios";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { PaginatedPlayers, Game, Player, PlayerStats, PlayerAnalytics, Rankings, GameDetail, GameBoxscore, TodayStats, UserPlan } from "./api";

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

export const getGameBoxscoreServer = (id: string) =>
  serverApi.get<GameBoxscore>(`/api/games/${id}/boxscore`);

export const getGamesByDateServer = (date: string) =>
  serverApi.get<Game[]>("/api/games", { params: { date } });

export const getYesterdayGamesServer = () =>
  serverApi.get<Game[]>("/api/games/yesterday");

export const getPlayerTodayStatsServer = (id: string | number) =>
  serverApi.get<TodayStats | null>(`/api/players/${id}/today-stats`);

// Fetch the current user's plan server-side using the session cookie.
// Returns null when no session is present (unauthenticated / free).
export async function getUserPlanServer(): Promise<{ data: UserPlan | null }> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { data: null };
  try {
    const res = await serverApi.get<UserPlan>("/api/user/plan", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    return { data: res.data };
  } catch {
    return { data: null };
  }
}
