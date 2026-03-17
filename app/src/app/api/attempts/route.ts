import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createAttempt } from '@/lib/services/attempt.service';
import type { CreateAttemptRequest } from '@/types';

/**
 * POST /api/attempts
 * Start a new attempt for a puzzle. Requires authentication.
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authentication required', status: 401 },
        { status: 401 },
      );
    }

    const body: CreateAttemptRequest = await request.json();

    if (!body.puzzle_id) {
      return NextResponse.json(
        { error: 'bad_request', message: 'puzzle_id is required', status: 400 },
        { status: 400 },
      );
    }

    // UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.puzzle_id)) {
      return NextResponse.json(
        { error: 'bad_request', message: 'Invalid puzzle_id format', status: 400 },
        { status: 400 },
      );
    }

    const attempt = await createAttempt(session.user.id, body.puzzle_id);

    return NextResponse.json(attempt, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create attempt';

    if (message === 'Puzzle not found') {
      return NextResponse.json(
        { error: 'not_found', message, status: 404 },
        { status: 404 },
      );
    }

    console.error('[POST /api/attempts]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to create attempt', status: 500 },
      { status: 500 },
    );
  }
}
