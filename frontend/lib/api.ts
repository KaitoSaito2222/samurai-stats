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

export interface GamePlayer {
  id: string;
  name_ja: string;
  name_en: string;
  photo_url: string | null;
}

export interface Game {
  id: string;
  home_team_ja: string;
  home_team_en: string;
  home_team_id: string | null;
  away_team_ja: string;
  away_team_en: string;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  inning: number | null;
  game_date: string;
  game_time: string | null;
  status: "scheduled" | "live" | "final" | "postponed" | "cancelled";
  venue: string | null;
  japanese_players: GamePlayer[];
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

export interface VelocityDataPoint {
  month: number;
  pitch_type: string;
  pitch_name_ja: string;
  pitch_name_en: string;
  avg_velocity: number;
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
  velocity_by_month?: VelocityDataPoint[];
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
  clutch?: { risp: SplitStat | null; late: SplitStat | null } | null;
  monthly: MonthStat[] | null;
  statcast: StatcastStats | null;
}

export interface GameLogEntry {
  date: string;
  opponent: string;
  game_pk: string;
  at_bats: number | null;
  hits: number | null;
  home_runs: number | null;
  rbi: number | null;
  avg: number | null;
}

export interface GameLogResponse {
  player_id: string;
  season: number;
  entries: GameLogEntry[];
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

// Rankings types
export interface RankingPlayer {
  player_id: string;
  name_en: string;
  name_ja: string;
  team_en: string;
  team_ja: string;
  photo_url: string | null;
  position: string | null;
  // batting-specific
  avg?: number | null;
  home_runs?: number | null;
  rbi?: number | null;
  ops?: number | null;
  games?: number | null;
  // pitching-specific
  era?: number | null;
  wins?: number | null;
  strikeouts?: number | null;
  whip?: number | null;
}

export interface MlbRankingPlayer {
  player_id: string;
  name_en: string;
  name_ja?: string | null;
  team_en: string;
  team_id?: number | null;
  photo_url?: string | null;
  analyzable?: boolean;
  ops?: number | null;
  era?: number | null;
}

export interface Rankings {
  season: number;
  batting: RankingPlayer[];
  pitching: RankingPlayer[];
  mlb_batting: MlbRankingPlayer[];
  mlb_pitching: MlbRankingPlayer[];
}

// Game detail types
export type GameDetail = Game;

export interface BoxscoreBatter {
  player_id: string;
  name_en: string;
  name_ja: string;
  is_analyzable: boolean;
  position: string;
  batting_order: number | null;
  at_bats: number;
  runs: number;
  hits: number;
  doubles: number;
  home_runs: number;
  rbi: number;
  walks: number;
  strikeouts: number;
  avg: number | null;
}

export interface BoxscorePitcher {
  player_id: string;
  name_en: string;
  name_ja: string;
  is_analyzable: boolean;
  innings_pitched: string;
  hits: number;
  runs: number;
  earned_runs: number;
  walks: number;
  strikeouts: number;
  home_runs: number;
  era: number | null;
}

export interface TeamBoxscore {
  team_en: string;
  team_ja: string;
  batters: BoxscoreBatter[];
  pitchers: BoxscorePitcher[];
}

export interface GameBoxscore {
  home: TeamBoxscore | null;
  away: TeamBoxscore | null;
}

export interface TodayStats {
  date: string;
  at_bats: number;
  hits: number;
  home_runs: number;
  rbi: number;
}

// Chat types
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Favorites
export interface FavoritePlayer {
  player_id: string;
  created_at: string;
}

// API functions
export const getRankings = (season?: number) =>
  api.get<Rankings>("/api/rankings", { params: season ? { season } : {} });

export const getGame = (id: string) =>
  api.get<GameDetail>(`/api/games/${id}`);

export const getPlayerAnalytics = (id: string, season?: number) =>
  api.get<PlayerAnalytics>(`/api/players/${id}/analytics`, {
    params: season ? { season } : {},
  });

export const generateAIAnalysis = (playerId: string, lang: "ja" | "en") =>
  api.post<{ analysis: string; calls_used: number; calls_limit: number }>(
    `/api/ai/analysis/${playerId}`,
    { lang }
  );

export const getFavorites = () =>
  api.get<FavoritePlayer[]>("/api/user/favorites");

export const addFavorite = (playerId: string) =>
  api.post(`/api/user/favorites/${playerId}`);

export const removeFavorite = (playerId: string) =>
  api.delete(`/api/user/favorites/${playerId}`);

export const createCheckout = () =>
  api.post<{ url: string }>("/api/billing/checkout");

export const createPortal = () =>
  api.get<{ url: string }>("/api/billing/portal");

// Period comparison types
export interface PeriodStats {
  season: number;
  start_date: string;
  end_date: string;
  avg: number | null;
  ops: number | null;
  home_runs: number | null;
  rbi: number | null;
  hits: number | null;
  plate_appearances: number | null;
}

export interface PeriodComparison {
  player_id: string;
  current: PeriodStats;
  last_year: PeriodStats;
}

export const getPeriodComparison = (
  playerId: string,
  start?: string,
  end?: string
) =>
  api.get<PeriodComparison>(`/api/players/${playerId}/period-comparison`, {
    params: {
      ...(start ? { start } : {}),
      ...(end ? { end } : {}),
    },
  });

// Recent form types
export interface RecentFormWindow {
  days: number;
  avg: number | null;
  ops: number | null;
  home_runs: number | null;
  rbi: number | null;
  hits: number | null;
  plate_appearances: number | null;
}

export interface RecentFormResponse {
  player_id: string;
  windows: RecentFormWindow[];
}

export const getRecentForm = (playerId: string) =>
  api.get<RecentFormResponse>(`/api/players/${playerId}/recent-form`);

// Career types
export interface CareerSeasonStat {
  season: number;
  stat_type: string;
  avg?: number | null;
  ops?: number | null;
  home_runs?: number | null;
  rbi?: number | null;
  era?: number | null;
  wins?: number | null;
  strikeouts?: number | null;
  whip?: number | null;
  games?: number | null;
}

export interface CareerResponse {
  player_id: string;
  seasons: CareerSeasonStat[];
}

export const getCareer = (playerId: string) =>
  api.get<CareerResponse>(`/api/players/${playerId}/career`);

export const getGameLogs = (playerId: string, season?: number) =>
  api.get<GameLogResponse>(`/api/players/${playerId}/game-logs`, {
    params: season ? { season } : {},
  });

export default api;
