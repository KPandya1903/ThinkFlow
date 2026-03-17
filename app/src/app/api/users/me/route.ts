import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { UserProfile } from '@/types';

/**
 * GET /api/users/me
 * Returns the current authenticated user's profile.
 * Requires authentication.
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

    const [user] = await db
      .select({
        id: users.id,
        display_name: users.displayName,
        email: users.email,
        avatar_url: users.avatarUrl,
        xp: users.xp,
        level: users.level,
        created_at: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: 'not_found', message: 'User not found', status: 404 },
        { status: 404 },
      );
    }

    const profile: UserProfile = {
      id: user.id,
      display_name: user.display_name ?? '',
      email: user.email,
      avatar_url: user.avatar_url,
      xp: user.xp,
      level: user.level,
      created_at: user.created_at.toISOString(),
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error('[GET /api/users/me]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to fetch user profile', status: 500 },
      { status: 500 },
    );
  }
}
