// ─── User Store (Zustand) ───────────────────────────────────────────────────
// Client-side state for the authenticated user: profile, XP, streak, and
// skill ratings.  Persists nothing — all writes go through server actions.

import { create } from 'zustand';

import type { SkillDimension } from '@/engines/types';
import { calculateLevel, xpForNextLevel, xpProgress } from '@/lib/utils/scoring';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SkillRating {
  readonly dimension: SkillDimension;
  readonly rating: number;
  readonly gamesPlayed: number;
}

export interface UserStats {
  readonly totalXP: number;
  readonly level: number;
  readonly xpToNextLevel: number;
  readonly levelProgress: number;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly puzzlesSolved: number;
  readonly skillRatings: readonly SkillRating[];
}

export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly image: string | null;
}

interface UserState {
  // ── Data ─────────────────────────────────────────────────────────────
  user: User | null;
  stats: UserStats | null;
  isLoading: boolean;
  error: string | null;

  // ── Actions ──────────────────────────────────────────────────────────
  setUser: (user: User) => void;
  setStats: (stats: UserStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  /**
   * Optimistically add XP and recompute derived level fields.
   * The caller is responsible for persisting via a server action.
   */
  updateXP: (earnedXP: number) => void;

  /**
   * Increment the daily streak. Resets to 1 if called after a gap.
   * The caller provides whether the streak is continued or restarted.
   */
  updateStreak: (continued: boolean) => void;

  /** Update skill ratings after a puzzle completion */
  updateSkillRatings: (updated: readonly SkillRating[]) => void;

  /** Clear all user data (logout) */
  clear: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useUserStore = create<UserState>()((set, get) => ({
  user: null,
  stats: null,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user, error: null }),

  setStats: (stats) => set({ stats }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  updateXP: (earnedXP) => {
    const { stats } = get();
    if (!stats) return;

    const newTotalXP = stats.totalXP + earnedXP;
    const newLevel = calculateLevel(newTotalXP);
    const newXPToNext = xpForNextLevel(newLevel);
    const newProgress = xpProgress(newTotalXP);

    set({
      stats: {
        ...stats,
        totalXP: newTotalXP,
        level: newLevel,
        xpToNextLevel: newXPToNext,
        levelProgress: newProgress,
        puzzlesSolved: stats.puzzlesSolved + 1,
      },
    });
  },

  updateStreak: (continued) => {
    const { stats } = get();
    if (!stats) return;

    const newStreak = continued ? stats.currentStreak + 1 : 1;
    const newLongest = Math.max(stats.longestStreak, newStreak);

    set({
      stats: {
        ...stats,
        currentStreak: newStreak,
        longestStreak: newLongest,
      },
    });
  },

  updateSkillRatings: (updated) => {
    const { stats } = get();
    if (!stats) return;

    // Merge updated ratings into existing, preserving any dimensions not in `updated`
    const updatedMap = new Map(updated.map((r) => [r.dimension, r]));
    const merged = stats.skillRatings.map(
      (existing) => updatedMap.get(existing.dimension) ?? existing,
    );

    // Add any new dimensions that weren't in the original set
    for (const rating of updated) {
      if (!stats.skillRatings.some((r) => r.dimension === rating.dimension)) {
        merged.push(rating);
      }
    }

    set({
      stats: { ...stats, skillRatings: merged },
    });
  },

  clear: () =>
    set({
      user: null,
      stats: null,
      isLoading: false,
      error: null,
    }),
}));
