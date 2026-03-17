import { db } from '@/lib/db';
import { puzzles, attempts } from '@/lib/db/schema';
import { eq, and, sql, count } from 'drizzle-orm';
import type {
  PuzzleListItem,
  PuzzleDetail,
  PuzzleCategory,
  PuzzleType,
  Difficulty,
} from '@/types';

// ---- Helpers ----

/**
 * Strip the solution field from a puzzle row so it is never leaked to clients.
 */
function stripSolution<T extends { solution?: unknown }>(
  puzzle: T,
): Omit<T, 'solution'> {
  const { solution: _solution, ...rest } = puzzle;
  return rest;
}

// ---- Service Functions ----

interface GetPuzzlesOptions {
  category?: PuzzleCategory;
  type?: PuzzleType;
  difficulty?: Difficulty;
  page?: number;
  limit?: number;
}

export async function getPuzzles(options: GetPuzzlesOptions) {
  const {
    category,
    type,
    difficulty,
    page = 1,
    limit = 20,
  } = options;

  const safeLimit = Math.min(Math.max(1, limit), 100);
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * safeLimit;
  const conditions = [];

  if (category) conditions.push(eq(puzzles.category, category));
  if (type) conditions.push(eq(puzzles.type, type));
  if (difficulty) conditions.push(eq(puzzles.difficulty, difficulty));

  // Only show active puzzles
  conditions.push(eq(puzzles.isActive, true));

  const whereClause = and(...conditions);

  // Count total matching puzzles
  const [totalResult] = await db
    .select({ count: count() })
    .from(puzzles)
    .where(whereClause);

  const total = totalResult?.count ?? 0;

  // Fetch puzzles with play_count and avg_solve_time from the puzzles table directly
  const rows = await db
    .select({
      id: puzzles.id,
      type: puzzles.type,
      category: puzzles.category,
      difficulty: puzzles.difficulty,
      title: puzzles.title,
      estimatedTimeSeconds: puzzles.estimatedTimeSeconds,
      playCount: puzzles.playCount,
      avgSolveTime: puzzles.avgSolveTime,
      createdAt: puzzles.createdAt,
    })
    .from(puzzles)
    .where(whereClause)
    .orderBy(puzzles.createdAt)
    .limit(safeLimit)
    .offset(offset);

  const data: PuzzleListItem[] = rows.map((r) => ({
    id: r.id,
    type: r.type as PuzzleType,
    category: r.category as PuzzleCategory,
    difficulty: r.difficulty as Difficulty,
    title: r.title,
    estimated_time: r.estimatedTimeSeconds ?? 0,
    play_count: r.playCount,
    avg_solve_time: r.avgSolveTime,
    created_at: r.createdAt.toISOString(),
  }));

  return {
    data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}

export async function getPuzzleById(id: string): Promise<PuzzleDetail | null> {
  const [row] = await db
    .select()
    .from(puzzles)
    .where(and(eq(puzzles.id, id), eq(puzzles.isActive, true)))
    .limit(1);

  if (!row) return null;

  const safe = stripSolution(row);

  return {
    id: safe.id,
    type: safe.type as PuzzleType,
    category: safe.category as PuzzleCategory,
    difficulty: safe.difficulty as Difficulty,
    title: safe.title,
    config: (safe.config ?? {}) as PuzzleDetail['config'],
    initial_state: safe.initialState,
    hints: (safe.hints ?? []) as string[],
    estimated_time: safe.estimatedTimeSeconds ?? 0,
  };
}

export async function getRandomPuzzle(options?: {
  category?: PuzzleCategory;
  type?: PuzzleType;
  difficulty?: Difficulty;
}): Promise<PuzzleDetail | null> {
  const conditions = [eq(puzzles.isActive, true)];

  if (options?.category) conditions.push(eq(puzzles.category, options.category));
  if (options?.type) conditions.push(eq(puzzles.type, options.type));
  if (options?.difficulty) conditions.push(eq(puzzles.difficulty, options.difficulty));

  const whereClause = and(...conditions);

  const [row] = await db
    .select()
    .from(puzzles)
    .where(whereClause)
    .orderBy(sql`random()`)
    .limit(1);

  if (!row) return null;

  const safe = stripSolution(row);

  return {
    id: safe.id,
    type: safe.type as PuzzleType,
    category: safe.category as PuzzleCategory,
    difficulty: safe.difficulty as Difficulty,
    title: safe.title,
    config: (safe.config ?? {}) as PuzzleDetail['config'],
    initial_state: safe.initialState,
    hints: (safe.hints ?? []) as string[],
    estimated_time: safe.estimatedTimeSeconds ?? 0,
  };
}
