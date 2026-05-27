import axios from "axios";
import { supabase } from "./supabase";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

// Attach Supabase JWT to every request
api.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Handle error codes globally
// Note: lib/api.ts may be imported in SSR (Server Components, Route Handlers).
// Guard all browser APIs with typeof window !== "undefined" to avoid
// "ReferenceError: window is not defined" in Node.js.
api.interceptors.response.use(
  (response) => {
    // Check X-AI-Remaining header on successful responses too
    const remaining = response.headers?.["x-ai-remaining"];
    if (remaining !== undefined && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("ai-remaining", { detail: Number(remaining) })
      );
    }
    return response;
  },
  (error) => {
    const code = error.response?.data?.code;

    if (code === "PRO_REQUIRED" && typeof window !== "undefined") {
      const locale = window.location.pathname.split("/")[1] || "ja";
      window.location.href = `/${locale}/billing`;
    }

    // LIMIT_EXCEEDED is handled inline by components (they check for this error code)

    // X-AI-Remaining: warn Pro users when fewer than 10 daily AI calls remain
    const remaining = error.response?.headers?.["x-ai-remaining"];
    if (remaining !== undefined && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("ai-remaining", { detail: Number(remaining) })
      );
    }

    return Promise.reject(error);
  }
);

// API response types
export interface Player {
  id: number;
  fullName: string;
  fullNameJa?: string;
  currentTeam: {
    id: number;
    name: string;
    abbreviation: string;
  };
  primaryPosition: {
    code: string;
    name: string;
    type: string;
    abbreviation: string;
  };
  photoUrl?: string;
  active: boolean;
}

export interface PlayerStats {
  type: "batting" | "pitching";
  season: number;
  avg?: string;
  hr?: number;
  rbi?: number;
  ops?: string;
  era?: string;
  wins?: number;
  strikeouts?: number;
  whip?: string;
  games: number;
}

export interface Game {
  id: number;
  homeTeam: {
    id: number;
    name: string;
    abbreviation: string;
    score?: number;
  };
  awayTeam: {
    id: number;
    name: string;
    abbreviation: string;
    score?: number;
  };
  status: "Live" | "Final" | "Scheduled" | "Postponed";
  startTimeUtc: string;
  inning?: number;
  inningHalf?: string;
}

export interface UserPlan {
  plan: "free" | "pro";
  aiUsageToday: number;
  aiDailyLimit: number;
}

export interface PaginatedPlayers {
  items: Player[];
  total: number;
  page: number;
  limit: number;
}

// API functions
export const getJapanesePlayers = (page = 1, limit = 20) =>
  api.get<PaginatedPlayers>("/api/players/japanese", { params: { page, limit } });

export const getPlayer = (id: number | string) =>
  api.get<Player>(`/api/players/${id}`);

export const getPlayerStats = (id: number | string) =>
  api.get<PlayerStats>(`/api/players/${id}/stats`);

export const getTodayGames = () => api.get<Game[]>("/api/games/today");

export const generateAISummary = (playerId: number | string, lang: "ja" | "en") =>
  api.post<{ summary: string }>(`/api/ai/summary/${playerId}`, { lang });

export const getUserPlan = () => api.get<UserPlan>("/api/user/plan");

export default api;
