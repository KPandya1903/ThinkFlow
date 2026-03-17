import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { useHint } from '@/lib/services/attempt.service';

/**
 * POST /api/attempts/[id]/hint
 * Request a hint for the current attempt.
 * Increments hints_used and returns the next hint from the puzzle's hints array.
 * Requires authentication and ownership.
 */
export async function POST(
  _request: NextRequest,
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

    const result = await useHint(id, session.user.id);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get hint';

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

    if (message === 'No more hints available') {
      return NextResponse.json(
        { error: 'gone', message, status: 410 },
        { status: 410 },
      );
    }

    console.error('[POST /api/attempts/[id]/hint]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to get hint', status: 500 },
      { status: 500 },
    );
  }
}
