import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, attempts, puzzles, userSkills, userStreaks } from '@/lib/db/schema';
import { eq, sql, count, avg } from 'drizzle-orm';
import type { UserStatsResponse, Difficulty, PuzzleCategory } from '@/types';

/**
 * GET /api/users/me/stats
 * Returns detailed statistics for the authenticated user.
 * Includes: total puzzles, by category, by difficulty, skill ratings, streak info.
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authentication required', status: 401 },
        { status: 401 },
      );
    }

    const userId = session.user.id;

    // Fetch user info
    const [user] = await db
      .select({ xp: users.xp, level: users.level })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: 'not_found', message: 'User not found', status: 404 },
        { status: 404 },
      );
    }

    // Total attempted & completed
    const [totalStats] = await db
      .select({
        total_attempted: count(),
        total_completed: sql<number>`count(*) filter (where ${attempts.status} = 'completed')`,
      })
      .from(attempts)
      .where(eq(attempts.userId, userId));

    // By category
    const categoryStats = await db
      .select({
        category: puzzles.category,
        total_attempted: count(),
        total_completed: sql<number>`count(*) filter (where ${attempts.status} = 'completed')`,
        avg_score: avg(attempts.score),
        avg_time: sql<number>`avg(${attempts.durationMs}) / 1000.0`,
      })
      .from(attempts)
      .innerJoin(puzzles, eq(attempts.puzzleId, puzzles.id))
      .where(eq(attempts.userId, userId))
      .groupBy(puzzles.category);

    // By difficulty
    const difficultyStats = await db
      .select({
        difficulty: puzzles.difficulty,
        total_attempted: count(),
        total_completed: sql<number>`count(*) filter (where ${attempts.status} = 'completed')`,
        avg_score: avg(attempts.score),
      })
      .from(attempts)
      .innerJoin(puzzles, eq(attempts.puzzleId, puzzles.id))
      .where(eq(attempts.userId, userId))
      .groupBy(puzzles.difficulty);

    // Skill ratings
    const skills = await db
      .select({
        skill: userSkills.dimension,
        rating: userSkills.rating,
        puzzles_completed: userSkills.totalAttempts,
      })
      .from(userSkills)
      .where(eq(userSkills.userId, userId));

    // Streak info
    const [streak] = await db
      .select({
        currentStreak: userStreaks.currentStreak,
        longestStreak: userStreaks.longestStreak,
      })
      .from(userStreaks)
      .where(eq(userStreaks.userId, userId))
      .limit(1);

    const response: UserStatsResponse = {
      total_puzzles_attempted: Number(totalStats?.total_attempted ?? 0),
      total_puzzles_completed: Number(totalStats?.total_completed ?? 0),
      total_xp: user.xp,
      level: user.level,
      current_streak: streak?.currentStreak ?? 0,
      longest_streak: streak?.longestStreak ?? 0,
      by_category: categoryStats.map((c) => ({
        category: c.category as PuzzleCategory,
        total_attempted: Number(c.total_attempted),
        total_completed: Number(c.total_completed),
        avg_score: Number(c.avg_score ?? 0),
        avg_time: Number(c.avg_time ?? 0),
      })),
      by_difficulty: difficultyStats.map((d) => ({
        difficulty: d.difficulty as Difficulty,
        total_attempted: Number(d.total_attempted),
        total_completed: Number(d.total_completed),
        avg_score: Number(d.avg_score ?? 0),
      })),
      skill_ratings: skills.map((s) => ({
        skill: s.skill,
        rating: s.rating,
        puzzles_completed: s.puzzles_completed,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[GET /api/users/me/stats]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to fetch user stats', status: 500 },
      { status: 500 },
    );
  }
}
