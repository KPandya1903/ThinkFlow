import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { leaderboardEntries, users } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { GetLeaderboardResponse, LeaderboardEntry, LeaderboardScope } from '@/types';

/**
 * GET /api/leaderboard
 * Query params: scope (global/weekly/daily), limit
 * Returns top users ranked by XP.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const scope = (searchParams.get('scope') ?? 'global') as LeaderboardScope;
    const limitRaw = searchParams.get('limit');
    const limit = limitRaw ? Math.min(Math.max(1, Number(limitRaw)), 100) : 25;

    // Validate scope
    if (!['global', 'weekly', 'daily'].includes(scope)) {
      return NextResponse.json(
        { error: 'bad_request', message: 'Scope must be global, weekly, or daily', status: 400 },
        { status: 400 },
      );
    }

    // Determine period string for scoped leaderboards
    const now = new Date();
    let period: string;

    if (scope === 'daily') {
      period = now.toISOString().split('T')[0]; // "YYYY-MM-DD"
    } else if (scope === 'weekly') {
      // ISO week: get Monday of current week
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      period = monday.toISOString().split('T')[0];
    } else {
      period = 'all_time';
    }

    // For global scope, query directly from users table ranked by XP
    if (scope === 'global') {
      const topUsers = await db
        .select({
          user_id: users.id,
          display_name: users.displayName,
          avatar_url: users.avatarUrl,
          xp: users.xp,
          level: users.level,
          puzzles_completed: sql<number>`(
            select count(*) from attempts
            where attempts.user_id = ${users.id}
            and attempts.status = 'completed'
          )`,
        })
        .from(users)
        .orderBy(desc(users.xp))
        .limit(limit);

      const entries: LeaderboardEntry[] = topUsers.map((u, i) => ({
        rank: i + 1,
        user_id: u.user_id,
        display_name: u.display_name ?? 'Anonymous',
        avatar_url: u.avatar_url,
        xp: u.xp,
        level: u.level,
        puzzles_completed: Number(u.puzzles_completed),
      }));

      const response: GetLeaderboardResponse = {
        scope,
        entries,
        updated_at: new Date().toISOString(),
      };

      return NextResponse.json(response);
    }

    // For weekly/daily scopes, query from leaderboard_entries table
    const rows = await db
      .select({
        user_id: leaderboardEntries.userId,
        score: leaderboardEntries.score,
        rank: leaderboardEntries.rank,
        display_name: users.displayName,
        avatar_url: users.avatarUrl,
        xp: users.xp,
        level: users.level,
      })
      .from(leaderboardEntries)
      .innerJoin(users, eq(leaderboardEntries.userId, users.id))
      .where(
        and(
          eq(leaderboardEntries.scope, scope),
          eq(leaderboardEntries.period, period),
        ),
      )
      .orderBy(desc(leaderboardEntries.score))
      .limit(limit);

    const entries: LeaderboardEntry[] = rows.map((r, i) => ({
      rank: r.rank ?? i + 1,
      user_id: r.user_id,
      display_name: r.display_name ?? 'Anonymous',
      avatar_url: r.avatar_url,
      xp: r.xp,
      level: r.level,
      puzzles_completed: 0, // Scoped leaderboards track score, not puzzle count
    }));

    const response: GetLeaderboardResponse = {
      scope,
      entries,
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[GET /api/leaderboard]', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to fetch leaderboard', status: 500 },
      { status: 500 },
    );
  }
}
