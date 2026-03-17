// ─── XP & Level Scoring System ──────────────────────────────────────────────
// Pure functions for calculating XP rewards and user levels.
// No side effects — safe for server or client.

import type { DifficultyLevel } from '@/engines/types';

// ─── Constants ──────────────────────────────────────────────────────────────

const BASE_XP_BY_DIFFICULTY = {
  1: 10,
  2: 20,
  3: 35,
  4: 50,
  5: 75,
} as const satisfies Record<DifficultyLevel, number>;

const TIME_BONUS_MULTIPLIER = 0.3;
const ACCURACY_BONUS_MULTIPLIER = 0.2;
const HINT_PENALTY_XP = 5;
const MINIMUM_XP = 5;

// ─── XP Calculation ─────────────────────────────────────────────────────────

export interface XPCalculationInput {
  readonly difficulty: DifficultyLevel;
  /** Actual time taken in seconds */
  readonly timeTakenSeconds: number;
  /** Estimated / par time in seconds */
  readonly estimatedTimeSeconds: number;
  /** Total mistakes made during the puzzle */
  readonly mistakes: number;
  /** Total hints used */
  readonly hintsUsed: number;
}

export interface XPBreakdown {
  readonly base: number;
  readonly timeBonus: number;
  readonly accuracyBonus: number;
  readonly hintPenalty: number;
  readonly total: number;
}

/**
 * Calculate the XP earned for completing a puzzle.
 *
 * Formula:
 *  - base       = BASE_XP_BY_DIFFICULTY[difficulty]
 *  - timeBonus  = base * 0.3  (if timeTaken < estimatedTime)
 *  - accBonus   = base * 0.2  (if 0 mistakes)
 *  - hintPen    = 5 per hint used
 *  - total      = max(5, base + timeBonus + accBonus - hintPen)
 */
export function calculateXP(input: XPCalculationInput): XPBreakdown {
  const base = BASE_XP_BY_DIFFICULTY[input.difficulty];

  const timeBonus =
    input.timeTakenSeconds < input.estimatedTimeSeconds
      ? Math.round(base * TIME_BONUS_MULTIPLIER)
      : 0;

  const accuracyBonus =
    input.mistakes === 0
      ? Math.round(base * ACCURACY_BONUS_MULTIPLIER)
      : 0;

  const hintPenalty = input.hintsUsed * HINT_PENALTY_XP;

  const rawTotal = base + timeBonus + accuracyBonus - hintPenalty;
  const total = Math.max(MINIMUM_XP, rawTotal);

  return { base, timeBonus, accuracyBonus, hintPenalty, total };
}

// ─── Level System ───────────────────────────────────────────────────────────
// Level = floor(sqrt(totalXP / 100)) + 1
// XP required to reach level N: (N - 1)^2 * 100

/**
 * Derive the user level from total accumulated XP.
 * Level 1 starts at 0 XP.
 */
export function calculateLevel(totalXP: number): number {
  return Math.floor(Math.sqrt(totalXP / 100)) + 1;
}

/**
 * Total XP needed to reach the *next* level.
 * If user is level 3, returns the XP threshold for level 4.
 */
export function xpForNextLevel(currentLevel: number): number {
  return currentLevel * currentLevel * 100;
}

/**
 * Fractional progress (0–1) towards the next level.
 * Useful for rendering progress bars.
 */
export function xpProgress(totalXP: number): number {
  const level = calculateLevel(totalXP);
  const currentThreshold = (level - 1) * (level - 1) * 100;
  const nextThreshold = xpForNextLevel(level);
  const range = nextThreshold - currentThreshold;

  if (range === 0) return 0;

  return (totalXP - currentThreshold) / range;
}
