// ============================================================
// ITHINK — Shared API Request/Response Types
// ============================================================

// ---- Enums / Literals ----

export type PuzzleType =
  | 'kakurasu'
  | 'futoshiki'
  | 'takuzu'
  | 'knights_knaves'
  | 'zebra'
  | 'logic_problems'
  | 'number_sequences'
  | 'arc_agi'
  | 'tsp'
  | 'brainteaser'
  | 'logicbench'
  | 'fermi'
  | 'optimization'
  | 'probability'
  | 'game_theory'
  | 'strategy'
  | 'lsat_logic';

export type PuzzleCategory =
  | 'structured_grid'
  | 'logical_deduction'
  | 'pattern_recognition'
  | 'scenario_decision'
  | 'riddles_verbal'
  | 'estimation_strategy'
  | 'probability_game_theory';

export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type AttemptStatus = 'in_progress' | 'completed' | 'abandoned' | 'timed_out';
export type GameMode = 'practice' | 'timed' | 'blitz' | 'daily';
export type LeaderboardScope = 'global' | 'weekly' | 'daily';

// ---- Puzzle Types ----

export interface PuzzleConfig {
  gridSize?: number;
  clueCount?: number;
  [key: string]: unknown;
}

export interface PuzzleListItem {
  id: string;
  type: PuzzleType;
  category: PuzzleCategory;
  difficulty: Difficulty;
  title: string;
  estimated_time: number;
  play_count: number;
  avg_solve_time: number | null;
  created_at: string;
}

export interface PuzzleDetail {
  id: string;
  type: PuzzleType;
  category: PuzzleCategory;
  difficulty: Difficulty;
  title: string;
  config: PuzzleConfig;
  initial_state: unknown;
  hints: string[];
  estimated_time: number;
}

// ---- GET /api/puzzles ----

export interface GetPuzzlesParams {
  category?: PuzzleCategory;
  type?: PuzzleType;
  difficulty?: Difficulty;
  page?: number;
  limit?: number;
}

export interface GetPuzzlesResponse {
  data: PuzzleListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ---- GET /api/puzzles/[id] ----

export type GetPuzzleByIdResponse = PuzzleDetail;

// ---- Attempt Types ----

export interface AttemptRecord {
  id: string;
  user_id: string;
  puzzle_id: string;
  status: AttemptStatus;
  started_at: string;
  completed_at: string | null;
  current_state: unknown;
  action_log: AttemptAction[];
  hints_used: number;
  score: number | null;
  xp_earned: number | null;
}

export interface AttemptAction {
  timestamp: number;
  action: string;
  data?: unknown;
}

// ---- POST /api/attempts ----

export interface CreateAttemptRequest {
  puzzle_id: string;
}

export interface CreateAttemptResponse {
  id: string;
  puzzle_id: string;
  started_at: string;
  status: AttemptStatus;
}

// ---- PATCH /api/attempts/[id] ----

export interface UpdateAttemptRequest {
  current_state?: unknown;
  action_log?: AttemptAction[];
}

export interface UpdateAttemptResponse {
  id: string;
  status: AttemptStatus;
  updated_at: string;
}

// ---- POST /api/attempts/[id]/complete ----

export interface CompleteAttemptRequest {
  final_answer: unknown;
}

export interface CompleteAttemptResponse {
  is_correct: boolean;
  score: number;
  xp_earned: number;
  new_level: number;
  new_total_xp: number;
  streak: number;
  time_taken: number;
}

// ---- POST /api/attempts/[id]/hint ----

export interface HintResponse {
  hint_index: number;
  hint: string;
  hints_used: number;
  hints_remaining: number;
}

// ---- GET /api/users/me ----

export interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  xp: number;
  level: number;
  created_at: string;
}

// ---- GET /api/users/me/stats ----

export interface CategoryStat {
  category: PuzzleCategory;
  total_attempted: number;
  total_completed: number;
  avg_score: number;
  avg_time: number;
}

export interface DifficultyStat {
  difficulty: Difficulty;
  total_attempted: number;
  total_completed: number;
  avg_score: number;
}

export interface SkillRating {
  skill: string;
  rating: number;
  puzzles_completed: number;
}

export interface UserStatsResponse {
  total_puzzles_attempted: number;
  total_puzzles_completed: number;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  by_category: CategoryStat[];
  by_difficulty: DifficultyStat[];
  skill_ratings: SkillRating[];
}

// ---- GET /api/leaderboard ----

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  xp: number;
  level: number;
  puzzles_completed: number;
}

export interface GetLeaderboardParams {
  scope?: LeaderboardScope;
  limit?: number;
}

export interface GetLeaderboardResponse {
  scope: LeaderboardScope;
  entries: LeaderboardEntry[];
  updated_at: string;
}

// ---- POST /api/events/track ----

export interface TrackEvent {
  event_type: string;
  puzzle_id?: string;
  attempt_id?: string;
  payload?: Record<string, unknown>;
}

export interface TrackEventsRequest {
  events: TrackEvent[];
}

export interface TrackEventsResponse {
  inserted: number;
}

// ---- Generic API Error ----

export interface ApiError {
  error: string;
  message: string;
  status: number;
}
