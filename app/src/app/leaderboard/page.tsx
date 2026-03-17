import Navbar from '@/components/ui/Navbar';
import { Trophy, Medal, Zap, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

function getRankStyle(rank: number) {
  if (rank === 1) return { bg: 'bg-gold/10', border: 'border-gold/30', text: 'text-gold' };
  if (rank === 2) return { bg: 'bg-txt-secondary/5', border: 'border-txt-secondary/20', text: 'text-txt-secondary' };
  if (rank === 3) return { bg: 'bg-[#CD7F32]/10', border: 'border-[#CD7F32]/30', text: 'text-[#CD7F32]' };
  return { bg: '', border: 'border-border-custom/30', text: 'text-txt-secondary' };
}

function getInitials(displayName: string | null, username: string): string {
  const name = displayName || username;
  return name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default async function LeaderboardPage() {
  const [session, leaderboard] = await Promise.all([
    auth(),
    db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        xp: users.xp,
        level: users.level,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .orderBy(desc(users.xp))
      .limit(50),
  ]);

  // Determine the current user's ID (if logged in) so we can highlight their row
  const currentUserId = session?.user?.id ?? null;

  // Empty state
  if (leaderboard.length === 0) {
    return (
      <>
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-txt mb-1">
              <span className="gradient-text">Leaderboard</span>
            </h1>
            <p className="text-txt-secondary text-sm">
              Top thinkers ranked by total XP earned.
            </p>
          </div>
          <div className="glass-card rounded-2xl p-12 text-center hover:transform-none">
            <Users className="w-12 h-12 text-txt-secondary/40 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-txt mb-2">No rankings yet</h2>
            <p className="text-txt-secondary text-sm max-w-md mx-auto">
              Be the first to climb the leaderboard! Start solving puzzles to earn XP and claim the top spot.
            </p>
          </div>
        </main>
      </>
    );
  }

  // Build ranked entries
  const ranked = leaderboard.map((user, i) => ({
    ...user,
    rank: i + 1,
    initials: getInitials(user.displayName, user.username),
    name: user.displayName || user.username,
  }));

  const hasTopThree = ranked.length >= 3;

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-txt mb-1">
            <span className="gradient-text">Leaderboard</span>
          </h1>
          <p className="text-txt-secondary text-sm">
            Top thinkers ranked by total XP earned.
          </p>
        </div>

        {/* Top 3 podium */}
        {hasTopThree && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[ranked[1], ranked[0], ranked[2]].map((user, i) => {
              const order = [2, 1, 3][i];
              const isFirst = order === 1;
              return (
                <div
                  key={user.id}
                  className={cn(
                    'glass-card rounded-2xl p-4 text-center hover:transform-none',
                    isFirst && 'ring-1 ring-gold/30 -mt-4 pb-6'
                  )}
                >
                  <div className="relative inline-block mb-3">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className={cn(
                          'rounded-xl object-cover',
                          isFirst ? 'w-16 h-16' : 'w-12 h-12'
                        )}
                      />
                    ) : (
                      <div
                        className={cn(
                          'rounded-xl flex items-center justify-center font-bold text-white',
                          isFirst ? 'w-16 h-16 text-xl bg-gradient-to-br from-gold to-primary' : 'w-12 h-12 text-base bg-gradient-to-br from-primary to-accent'
                        )}
                      >
                        {user.initials}
                      </div>
                    )}
                    <div
                      className={cn(
                        'absolute -bottom-1 -right-1 rounded-full flex items-center justify-center',
                        isFirst ? 'w-7 h-7 bg-gold' : 'w-6 h-6 bg-surface-elevated border border-border-custom'
                      )}
                    >
                      {order === 1 && <Trophy className="w-3.5 h-3.5 text-background" />}
                      {order === 2 && <Medal className="w-3 h-3 text-txt-secondary" />}
                      {order === 3 && <Medal className="w-3 h-3 text-[#CD7F32]" />}
                    </div>
                  </div>
                  <h3 className={cn('font-semibold text-sm', isFirst ? 'text-gold' : 'text-txt')}>
                    {user.name}
                  </h3>
                  <p className="font-mono text-xs text-primary-light mt-1">
                    {user.xp.toLocaleString()} XP
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Full list */}
        <div className="glass-card rounded-2xl overflow-hidden hover:transform-none">
          <div className="grid grid-cols-[48px_1fr_auto_auto] sm:grid-cols-[48px_1fr_100px_80px] gap-x-4 items-center px-4 py-3 border-b border-border-custom/50 text-xs text-txt-secondary font-medium">
            <span>#</span>
            <span>Player</span>
            <span className="hidden sm:block text-right">XP</span>
            <span className="text-right">Level</span>
          </div>
          {ranked.map((user) => {
            const style = getRankStyle(user.rank);
            const isCurrentUser = currentUserId === user.id;
            return (
              <div
                key={user.id}
                className={cn(
                  'grid grid-cols-[48px_1fr_auto_auto] sm:grid-cols-[48px_1fr_100px_80px] gap-x-4 items-center px-4 py-3 border-b border-border-custom/20 last:border-0 transition-colors',
                  isCurrentUser ? 'bg-primary/5' : 'hover:bg-surface/50'
                )}
              >
                <span className={cn('font-mono font-bold text-sm', style.text)}>
                  {user.rank}
                </span>
                <div className="flex items-center gap-3">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-primary to-accent"
                    >
                      {user.initials}
                    </div>
                  )}
                  <div>
                    <span className={cn('text-sm font-medium', isCurrentUser ? 'text-primary-light' : 'text-txt')}>
                      {user.name}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[10px] ml-2 text-primary-light">(you)</span>
                    )}
                  </div>
                </div>
                <div className="hidden sm:flex items-center justify-end gap-1">
                  <Zap className="w-3.5 h-3.5 text-primary-light" />
                  <span className="font-mono text-sm text-txt">{user.xp.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface-elevated border border-border-custom/50 font-mono text-sm font-semibold text-txt">
                    {user.level}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
