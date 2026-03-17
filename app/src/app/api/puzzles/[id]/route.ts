import { NextRequest, NextResponse } from 'next/server';
import { getPuzzleById } from '@/lib/services/puzzle.service';

/**
 * GET /api/puzzles/[id]
 * Returns a single puzzle for gameplay.
 * NEVER returns the solution — it is stripped server-side.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'bad_request', message: 'Invalid puzzle ID format', status: 400 },
        { status: 400 },
      );
    }

    const puzzle = await getPuzzleById(id);

    if (!puzzle) {
      return NextResponse.json(
        { error: 'not_found', message: 'Puzzle not found', status: 404 },
        { status: 404 },
      );
    }

    return NextResponse.json(puzzle);
  } catch (error) {
    console.error('[GET /api/puzzles/[id]]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to fetch puzzle', status: 500 },
      { status: 500 },
    );
  }
}
