import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { completeAttempt } from '@/lib/services/attempt.service';
import type { CompleteAttemptRequest } from '@/types';

/**
 * POST /api/attempts/[id]/complete
 * Submit final answer for server-side validation.
 * Calculates score, awards XP, updates streak, logs to user_events.
 * Requires authentication and ownership.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authentication required', status: 401 },
        { status: 401 },
      );
    }

    const { id } = await params;

    // UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'bad_request', message: 'Invalid attempt ID format', status: 400 },
        { status: 400 },
      );
    }

    const body: CompleteAttemptRequest = await request.json();

    if (body.final_answer === undefined || body.final_answer === null) {
      return NextResponse.json(
        { error: 'bad_request', message: 'final_answer is required', status: 400 },
        { status: 400 },
      );
    }

    const result = await completeAttempt(id, session.user.id, body.final_answer);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete attempt';

    if (message === 'Attempt not found') {
      return NextResponse.json(
        { error: 'not_found', message, status: 404 },
        { status: 404 },
      );
    }

    if (message === 'Attempt is no longer in progress') {
      return NextResponse.json(
        { error: 'conflict', message, status: 409 },
        { status: 409 },
      );
    }

    console.error('[POST /api/attempts/[id]/complete]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to complete attempt', status: 500 },
      { status: 500 },
    );
  }
}
