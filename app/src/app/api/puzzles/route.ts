import { NextRequest, NextResponse } from 'next/server';
import { getPuzzles } from '@/lib/services/puzzle.service';
import type { Difficulty, PuzzleCategory, PuzzleType } from '@/types';

/**
 * GET /api/puzzles
 * Query params: category, type, difficulty, page, limit
 * Returns paginated list of puzzles (WITHOUT solution field).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const category = searchParams.get('category') as PuzzleCategory | null;
    const type = searchParams.get('type') as PuzzleType | null;
    const difficultyRaw = searchParams.get('difficulty');
    const pageRaw = searchParams.get('page');
    const limitRaw = searchParams.get('limit');

    const difficulty = difficultyRaw ? (Number(difficultyRaw) as Difficulty) : undefined;
    const page = pageRaw ? Number(pageRaw) : 1;
    const limit = limitRaw ? Number(limitRaw) : 20;

    // Validate difficulty if provided
    if (difficulty !== undefined && (isNaN(difficulty) || difficulty < 1 || difficulty > 5)) {
      return NextResponse.json(
        { error: 'bad_request', message: 'Difficulty must be between 1 and 5', status: 400 },
        { status: 400 },
      );
    }

    // Validate page/limit
    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { error: 'bad_request', message: 'Page must be a positive integer', status: 400 },
        { status: 400 },
      );
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'bad_request', message: 'Limit must be between 1 and 100', status: 400 },
        { status: 400 },
      );
    }

    const result = await getPuzzles({
      category: category ?? undefined,
      type: type ?? undefined,
      difficulty,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[GET /api/puzzles]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to fetch puzzles', status: 500 },
      { status: 500 },
    );
  }
}
