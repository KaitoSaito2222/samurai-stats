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

// API response types — mirrors backend Pydantic schemas exactly
export interface Player {
  id: string;
  name_ja: string;
  name_en: string;
  team_ja: string;
  team_en: string;
  position: string;
  photo_url: string | null;
  is_japanese: boolean;
  active?: boolean;
}

export interface BattingStats {
  avg: number | null;
  home_runs: number | null;
  rbi: number | null;
  ops: number | null;
  hits: number | null;
  games: number | null;
  season: number;
}

export interface PitchingStats {
  era: number | null;
  wins: number | null;
  strikeouts: number | null;
  whip: number | null;
  innings_pitched: number | null;
  games: number | null;
  season: number;
}

export interface PlayerStats {
  player_id: string;
  batting: BattingStats | null;
  pitching: PitchingStats | null;
}

export interface Game {
  id: string;
  home_team_ja: string;
  home_team_en: string;
  away_team_ja: string;
  away_team_en: string;
  home_score: number | null;
  away_score: number | null;
  inning: number | null;
  game_date: string;
  status: "scheduled" | "live" | "final" | "postponed" | "cancelled";
  venue: string | null;
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
  has_next: boolean;
}

export interface SplitStat {
  pa: number;
  avg: number | null;
  ops: number | null;
  hr: number | null;
}

export interface MonthStat {
  month: number;
  avg: number | null;
  ops: number | null;
  hr: number | null;
  games: number | null;
}

export interface PitchSplit {
  pitch_type: string;
  pitch_name_ja: string;
  pitch_name_en: string;
  pa: number;
  avg: number | null;
  whiff_rate: number | null;
  hr: number | null;
  k: number | null;
}

export interface ZoneStat {
  zone: number; // 1-9
  pa: number;
  avg: number | null;
}

export interface StatcastStats {
  exit_velocity_avg: number | null;
  barrel_rate: number | null;
  hard_hit_rate: number | null;
  launch_angle_avg: number | null;
  xba: number | null;
  xslg: number | null;
  pitch_splits: PitchSplit[];
  zone_stats: ZoneStat[];
}

export interface PlayerAnalytics {
  player_id: string;
  season: number;
  splits: {
    vs_left: SplitStat | null;
    vs_right: SplitStat | null;
    home: SplitStat | null;
    away: SplitStat | null;
    day: SplitStat | null;
    night: SplitStat | null;
  } | null;
  monthly: MonthStat[] | null;
  statcast: StatcastStats | null;
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
