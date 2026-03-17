import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateAttempt } from '@/lib/services/attempt.service';
import type { UpdateAttemptRequest } from '@/types';

/**
 * PATCH /api/attempts/[id]
 * Sync current state and action log during gameplay.
 * Requires authentication and ownership.
 */
export async function PATCH(
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

    const body: UpdateAttemptRequest = await request.json();

    const result = await updateAttempt(id, session.user.id, {
      current_state: body.current_state,
      action_log: body.action_log,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update attempt';

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

    console.error('[PATCH /api/attempts/[id]]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to update attempt', status: 500 },
      { status: 500 },
    );
  }
}
