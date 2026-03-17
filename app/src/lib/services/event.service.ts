import { db } from '@/lib/db';
import { userEvents } from '@/lib/db/schema';

interface EventInput {
  userId: string;
  eventType: string;
  puzzleId?: string;
  attemptId?: string;
  payload?: Record<string, unknown>;
}

/**
 * Log a single user event.
 */
export async function logEvent(event: EventInput) {
  await db.insert(userEvents).values({
    userId: event.userId,
    eventType: event.eventType,
    puzzleId: event.puzzleId ?? null,
    attemptId: event.attemptId ?? null,
    payload: event.payload ?? {},
    createdAt: new Date(),
  });
}

/**
 * Batch insert user events (for ML pipeline ingestion).
 * Inserts in a single statement for efficiency.
 */
export async function batchLogEvents(
  userId: string,
  events: Array<{
    event_type: string;
    puzzle_id?: string;
    attempt_id?: string;
    payload?: Record<string, unknown>;
  }>,
): Promise<number> {
  if (events.length === 0) return 0;

  const rows = events.map((e) => ({
    userId,
    eventType: e.event_type,
    puzzleId: e.puzzle_id ?? null,
    attemptId: e.attempt_id ?? null,
    payload: e.payload ?? {},
    createdAt: new Date(),
  }));

  const result = await db.insert(userEvents).values(rows).returning({ id: userEvents.id });

  return result.length;
}
