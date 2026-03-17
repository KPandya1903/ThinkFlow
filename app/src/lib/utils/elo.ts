// ─── Elo-Like Skill Rating System ───────────────────────────────────────────
// Rates users per skill dimension using an adapted Elo formula.
// Pure functions — no side effects.

import type { DifficultyLevel, SkillDimension } from '@/engines/types';

// ─── Constants ──────────────────────────────────────────────────────────────

const K_FACTOR_THRESHOLDS = [
  { maxGames: 30, k: 32 },
  { maxGames: 100, k: 24 },
] as const;

const DEFAULT_K_FACTOR = 16;
const ELO_SCALE = 400;

/** Default starting rating for new users */
export const DEFAULT_RATING = 1200;

// ─── Difficulty → Elo mapping ───────────────────────────────────────────────
// Maps puzzle difficulty (1–5) to an equivalent Elo rating so the expected-
// score formula works the same way as in chess (player vs opponent).

const DIFFICULTY_RATING_MAP = {
  1: 800,
  2: 1000,
  3: 1200,
  4: 1400,
  5: 1600,
} as const satisfies Record<DifficultyLevel, number>;

// ─── K-Factor ───────────────────────────────────────────────────────────────

function getKFactor(gamesPlayed: number): number {
  for (const tier of K_FACTOR_THRESHOLDS) {
    if (gamesPlayed < tier.maxGames) return tier.k;
  }
  return DEFAULT_K_FACTOR;
}

// ─── Expected Score ─────────────────────────────────────────────────────────

/**
 * Expected score (probability of winning) using the logistic Elo curve.
 * `1 / (1 + 10^((puzzleRating - userRating) / 400))`
 */
function expectedScore(userRating: number, puzzleRating: number): number {
  return 1 / (1 + Math.pow(10, (puzzleRating - userRating) / ELO_SCALE));
}

// ─── Performance Score ──────────────────────────────────────────────────────

export interface PerformanceInput {
  /** Did the user solve the puzzle correctly? (true = 1.0, false = 0.0) */
  readonly correct: boolean;
  /** Ratio of estimated time to actual time (clamped 0–2). >1 means faster than expected. */
  readonly timeRatio: number;
  /** Accuracy as fraction (0–1): 1 = no mistakes */
  readonly accuracy: number;
  /** Independence as fraction (0–1): 1 = no hints used */
  readonly independence: number;
}

/**
 * Composite performance metric (0–1) used as the "actual score" in the Elo update.
 *
 * Weights:
 *  - correctness:  0.6
 *  - time ratio:   0.2
 *  - accuracy:     0.1
 *  - independence:  0.1
 */
export function calculatePerformance(input: PerformanceInput): number {
  const correctness = input.correct ? 1.0 : 0.0;
  const clampedTimeRatio = Math.min(Math.max(input.timeRatio, 0), 2) / 2; // normalise to 0–1
  const clampedAccuracy = Math.min(Math.max(input.accuracy, 0), 1);
  const clampedIndependence = Math.min(Math.max(input.independence, 0), 1);

  return (
    correctness * 0.6 +
    clampedTimeRatio * 0.2 +
    clampedAccuracy * 0.1 +
    clampedIndependence * 0.1
  );
}

// ─── Rating Update ──────────────────────────────────────────────────────────

export interface SkillRatingInput {
  readonly currentRating: number;
  readonly gamesPlayed: number;
  readonly puzzleDifficulty: DifficultyLevel;
  readonly performance: PerformanceInput;
}

export interface SkillRatingResult {
  readonly newRating: number;
  readonly ratingDelta: number;
  readonly expected: number;
  readonly actual: number;
  readonly kFactor: number;
}

/**
 * Update a user's Elo-like skill rating after completing a puzzle.
 *
 * newRating = oldRating + K * (actual - expected)
 *
 * The rating is floored at 100 to prevent extreme drops.
 */
export function updateSkillRating(input: SkillRatingInput): SkillRatingResult {
  const puzzleRating = DIFFICULTY_RATING_MAP[input.puzzleDifficulty];
  const k = getKFactor(input.gamesPlayed);
  const expected = expectedScore(input.currentRating, puzzleRating);
  const actual = calculatePerformance(input.performance);

  const delta = Math.round(k * (actual - expected));
  const newRating = Math.max(100, input.currentRating + delta);

  return {
    newRating,
    ratingDelta: newRating - input.currentRating,
    expected,
    actual,
    kFactor: k,
  };
}

// ─── Per-Dimension Bulk Update ──────────────────────────────────────────────

export interface DimensionRating {
  readonly dimension: SkillDimension;
  readonly rating: number;
  readonly gamesPlayed: number;
}

/**
 * Convenience: update multiple skill dimension ratings at once from
 * a single puzzle completion.
 */
export function updateMultipleDimensions(
  ratings: readonly DimensionRating[],
  puzzleDifficulty: DifficultyLevel,
  performance: PerformanceInput,
): ReadonlyArray<DimensionRating & { readonly ratingDelta: number }> {
  return ratings.map((dim) => {
    const result = updateSkillRating({
      currentRating: dim.rating,
      gamesPlayed: dim.gamesPlayed,
      puzzleDifficulty,
      performance,
    });
    return {
      dimension: dim.dimension,
      rating: result.newRating,
      gamesPlayed: dim.gamesPlayed + 1,
      ratingDelta: result.ratingDelta,
    };
  });
}
