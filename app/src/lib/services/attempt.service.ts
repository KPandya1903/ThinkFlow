import { db } from '@/lib/db';
import { attempts, puzzles, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { awardXP, updateStreak } from './gamification.service';
import { logEvent } from './event.service';
import type { AttemptAction, CompleteAttemptResponse } from '@/types';

// ---- Create Attempt ----

export async function createAttempt(userId: string, puzzleId: string) {
  // Verify puzzle exists
  const [puzzle] = await db
    .select({ id: puzzles.id })
    .from(puzzles)
    .where(eq(puzzles.id, puzzleId))
    .limit(1);

  if (!puzzle) {
    throw new Error('Puzzle not found');
  }

  const [attempt] = await db
    .insert(attempts)
    .values({
      userId,
      puzzleId,
      status: 'in_progress',
      startedAt: new Date(),
      hintsUsed: 0,
      finalState: null,
      actionLog: [],
    })
    .returning();

  await logEvent({
    userId,
    eventType: 'attempt_started',
    puzzleId,
    attemptId: attempt.id,
    payload: {},
  });

  return {
    id: attempt.id,
    puzzle_id: attempt.puzzleId,
    started_at: attempt.startedAt.toISOString(),
    status: attempt.status,
  };
}

// ---- Update Attempt (sync state) ----

export async function updateAttempt(
  attemptId: string,
  userId: string,
  data: {
    current_state?: unknown;
    action_log?: AttemptAction[];
  },
) {
  // Verify ownership and status
  const [existing] = await db
    .select()
    .from(attempts)
    .where(and(eq(attempts.id, attemptId), eq(attempts.userId, userId)))
    .limit(1);

  if (!existing) {
    throw new Error('Attempt not found');
  }

  if (existing.status !== 'in_progress') {
    throw new Error('Attempt is no longer in progress');
  }

  const updateFields: Record<string, unknown> = {};

  if (data.current_state !== undefined) {
    updateFields.finalState = data.current_state;
  }

  if (data.action_log !== undefined) {
    updateFields.actionLog = data.action_log;
  }

  const [updated] = await db
    .update(attempts)
    .set(updateFields)
    .where(eq(attempts.id, attemptId))
    .returning();

  return {
    id: updated.id,
    status: updated.status,
    updated_at: new Date().toISOString(),
  };
}

// ---- Complete Attempt ----

export async function completeAttempt(
  attemptId: string,
  userId: string,
  finalAnswer: unknown,
): Promise<CompleteAttemptResponse> {
  // 1. Load attempt + puzzle
  const [attempt] = await db
    .select()
    .from(attempts)
    .where(and(eq(attempts.id, attemptId), eq(attempts.userId, userId)))
    .limit(1);

  if (!attempt) {
    throw new Error('Attempt not found');
  }

  if (attempt.status !== 'in_progress') {
    throw new Error('Attempt is no longer in progress');
  }

  const [puzzle] = await db
    .select()
    .from(puzzles)
    .where(eq(puzzles.id, attempt.puzzleId))
    .limit(1);

  if (!puzzle) {
    throw new Error('Puzzle not found');
  }

  // 2. Server-side validation — compare final answer with stored solution
  const isCorrect = validateSolution(finalAnswer, puzzle.solution);

  // 3. Calculate time taken
  const timeTaken = Math.floor(
    (Date.now() - attempt.startedAt.getTime()) / 1000,
  );

  // 4. Calculate score
  const score = calculateScore({
    isCorrect,
    difficulty: puzzle.difficulty,
    timeTaken,
    estimatedTime: puzzle.estimatedTimeSeconds ?? 300,
    hintsUsed: attempt.hintsUsed,
  });

  // 5. Calculate XP
  const xpEarned = isCorrect ? calculateXP(score, puzzle.difficulty) : 0;

  // 6. Update attempt record
  const now = new Date();
  await db
    .update(attempts)
    .set({
      status: isCorrect ? 'completed' : 'abandoned',
      completedAt: now,
      isCorrect,
      finalState: finalAnswer,
      score,
      durationMs: timeTaken * 1000,
    })
    .where(eq(attempts.id, attemptId));

  // 7. Award XP and update user
  let newTotalXP = 0;
  let newLevel = 1;

  if (xpEarned > 0) {
    const xpResult = await awardXP(userId, xpEarned);
    newTotalXP = xpResult.totalXP;
    newLevel = xpResult.level;
  } else {
    // Fetch current user stats
    const [user] = await db
      .select({ xp: users.xp, level: users.level })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    newTotalXP = user?.xp ?? 0;
    newLevel = user?.level ?? 1;
  }

  // 8. Update streak
  const streakResult = await updateStreak(userId, isCorrect);

  // 9. Log event
  await logEvent({
    userId,
    eventType: 'attempt_completed',
    puzzleId: puzzle.id,
    attemptId,
    payload: {
      is_correct: isCorrect,
      score,
      xp_earned: xpEarned,
      time_taken: timeTaken,
      hints_used: attempt.hintsUsed,
    },
  });

  return {
    is_correct: isCorrect,
    score,
    xp_earned: xpEarned,
    new_level: newLevel,
    new_total_xp: newTotalXP,
    streak: streakResult.currentStreak,
    time_taken: timeTaken,
  };
}

// ---- Hint ----

export async function useHint(attemptId: string, userId: string) {
  // Load attempt
  const [attempt] = await db
    .select()
    .from(attempts)
    .where(and(eq(attempts.id, attemptId), eq(attempts.userId, userId)))
    .limit(1);

  if (!attempt) {
    throw new Error('Attempt not found');
  }

  if (attempt.status !== 'in_progress') {
    throw new Error('Attempt is no longer in progress');
  }

  // Load puzzle hints
  const [puzzle] = await db
    .select({ hints: puzzles.hints })
    .from(puzzles)
    .where(eq(puzzles.id, attempt.puzzleId))
    .limit(1);

  if (!puzzle) {
    throw new Error('Puzzle not found');
  }

  const hints = (puzzle.hints ?? []) as string[];
  const hintIndex = attempt.hintsUsed;

  if (hintIndex >= hints.length) {
    throw new Error('No more hints available');
  }

  // Increment hints_used
  const newHintsUsed = hintIndex + 1;
  await db
    .update(attempts)
    .set({ hintsUsed: newHintsUsed })
    .where(eq(attempts.id, attemptId));

  return {
    hint_index: hintIndex,
    hint: hints[hintIndex],
    hints_used: newHintsUsed,
    hints_remaining: hints.length - newHintsUsed,
  };
}

// ---- Scoring Helpers ----

function validateSolution(answer: unknown, solution: unknown): boolean {
  return JSON.stringify(answer) === JSON.stringify(solution);
}

function calculateScore(params: {
  isCorrect: boolean;
  difficulty: number;
  timeTaken: number;
  estimatedTime: number;
  hintsUsed: number;
}): number {
  if (!params.isCorrect) return 0;

  const baseScore = 1000;

  // Difficulty multiplier: 1x for easy, up to 2.5x for expert
  const difficultyMultiplier = 0.5 + params.difficulty * 0.5;

  // Time bonus: up to 50% bonus for finishing in half the estimated time
  const timeRatio = params.timeTaken / params.estimatedTime;
  const timeBonus = timeRatio <= 0.5 ? 1.5 : timeRatio <= 1.0 ? 1 + (1 - timeRatio) : Math.max(0.5, 1 - (timeRatio - 1) * 0.25);

  // Hint penalty: -15% per hint used
  const hintPenalty = Math.max(0.25, 1 - params.hintsUsed * 0.15);

  return Math.round(baseScore * difficultyMultiplier * timeBonus * hintPenalty);
}

function calculateXP(score: number, difficulty: number): number {
  // Base XP scales with score and difficulty
  const baseXP = Math.round(score * 0.1);
  const difficultyBonus = Math.round(difficulty * 5);
  return baseXP + difficultyBonus;
}
