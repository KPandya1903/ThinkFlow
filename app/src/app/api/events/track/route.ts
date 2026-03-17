import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { batchLogEvents } from '@/lib/services/event.service';
import type { TrackEventsRequest, TrackEventsResponse } from '@/types';

/**
 * POST /api/events/track
 * Batch insert user events for ML pipeline.
 * Body: { events: [{ event_type, puzzle_id?, attempt_id?, payload? }] }
 * Requires authentication.
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

    const body: TrackEventsRequest = await request.json();

    if (!body.events || !Array.isArray(body.events)) {
      return NextResponse.json(
        { error: 'bad_request', message: 'events array is required', status: 400 },
        { status: 400 },
      );
    }

    if (body.events.length === 0) {
      return NextResponse.json({ inserted: 0 } satisfies TrackEventsResponse);
    }

    // Validate max batch size
    if (body.events.length > 500) {
      return NextResponse.json(
        { error: 'bad_request', message: 'Maximum 500 events per batch', status: 400 },
        { status: 400 },
      );
    }

    // Validate each event has event_type
    for (const event of body.events) {
      if (!event.event_type || typeof event.event_type !== 'string') {
        return NextResponse.json(
          { error: 'bad_request', message: 'Each event must have a valid event_type string', status: 400 },
          { status: 400 },
        );
      }
    }

    const inserted = await batchLogEvents(session.user.id, body.events);

    const response: TrackEventsResponse = { inserted };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[POST /api/events/track]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to track events', status: 500 },
      { status: 500 },
    );
  }
}
