import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { users, attempts, userStreaks, userSkills, userAchievements, achievements } from '@/lib/db/schema';
import { eq, count, avg, and } from 'drizzle-orm';
import Navbar from '@/components/ui/Navbar';
import { Zap, Puzzle, Flame, Target, Clock, Trophy, Lock, Star, Award, Brain } from 'lucide-react';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const userId = session.user.id;

  // Fetch user data
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) redirect('/sign-in');

  // Fetch stats
  const [completedCount] = await db
    .select({ count: count() })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.status, 'completed')));

  const [correctCount] = await db
    .select({ count: count() })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.isCorrect, true)));

  const [avgTime] = await db
    .select({ avg: avg(attempts.durationMs) })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.status, 'completed')));

  const [streak] = await db.select().from(userStreaks).where(eq(userStreaks.userId, userId)).limit(1);

  const puzzlesSolved = Number(completedCount?.count ?? 0);
  const correctSolved = Number(correctCount?.count ?? 0);
  const accuracy = puzzlesSolved > 0 ? Math.round((correctSolved / puzzlesSolved) * 100) : 0;
  const avgTimeMin = avgTime?.avg ? `${Math.round(Number(avgTime.avg) / 60000)}m` : '0m';

  // XP and level
  const xp = user.xp;
  const level = user.level;
  const xpForNext = level * level * 100;
  const xpProgress = xpForNext > 0 ? Math.min((xp / xpForNext) * 100, 100) : 0;
  const initials = (user.displayName || user.username).slice(0, 2).toUpperCase();

  // Achievements
  const unlockedAchievements = await db
    .select({ achievementId: userAchievements.achievementId })
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));
  const unlockedIds = new Set(unlockedAchievements.map(a => a.achievementId));

  const allAchievements = [
    { id: 'first_solve', name: 'First Solve', description: 'Complete your first puzzle', icon: Star },
    { id: 'speed_demon', name: 'Speed Demon', description: 'Solve under 5 minutes', icon: Zap },
    { id: 'streak_3', name: 'Streak Starter', description: '3 day streak', icon: Flame },
    { id: 'perfect', name: 'Perfect Score', description: 'Solve with no mistakes', icon: Target },
    { id: 'century', name: 'Century', description: 'Solve 100 puzzles', icon: Award },
    { id: 'expert', name: 'Expert Mind', description: 'Solve 10 Expert puzzles', icon: Brain },
    { id: 'grandmaster', name: 'Grandmaster', description: 'Reach Level 20', icon: Trophy },
    { id: 'allrounder', name: 'All-Rounder', description: 'Solve in every category', icon: Puzzle },
  ];

  const statsGrid = [
    { icon: Zap, label: 'Total XP', value: xp.toLocaleString(), color: 'text-primary-light' },
    { icon: Puzzle, label: 'Puzzles Solved', value: puzzlesSolved.toString(), color: 'text-accent' },
    { icon: Flame, label: 'Best Streak', value: `${streak?.longestStreak ?? 0} days`, color: 'text-gold' },
    { icon: Target, label: 'Accuracy', value: `${accuracy}%`, color: 'text-success' },
    { icon: Clock, label: 'Avg Time', value: avgTimeMin, color: 'text-primary-light' },
    { icon: Trophy, label: 'Level', value: level.toString(), color: 'text-gold' },
  ];

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 mb-8 hover:transform-none">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-white">
                {initials}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gold flex items-center justify-center shadow-lg">
                <span className="text-xs font-bold text-background font-mono">{level}</span>
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-txt mb-1">{user.displayName || user.username}</h1>
              <p className="text-txt-secondary text-sm mb-4">Level {level} Thinker</p>

              <div className="max-w-md">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-txt-secondary">XP Progress</span>
                  <span className="text-xs font-mono text-primary-light">
                    {xp.toLocaleString()} / {xpForNext.toLocaleString()} XP
                  </span>
                </div>
                <div className="h-3 rounded-full bg-surface-elevated overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent relative overflow-hidden"
                    style={{ width: `${xpProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </div>
                </div>
                <p className="text-xs text-txt-secondary mt-1">
                  {(xpForNext - xp).toLocaleString()} XP to Level {level + 1}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {statsGrid.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="glass-card rounded-xl p-4 text-center hover:transform-none">
                <Icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
                <div className="font-mono text-lg font-bold text-txt">{stat.value}</div>
                <div className="text-xs text-txt-secondary">{stat.label}</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Achievements */}
          <div className="glass-card rounded-2xl p-6 hover:transform-none">
            <h2 className="text-lg font-semibold text-txt mb-4">Achievements</h2>
            <div className="grid grid-cols-2 gap-3">
              {allAchievements.map((ach) => {
                const Icon = ach.icon;
                const unlocked = unlockedIds.has(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`rounded-xl p-4 text-center border transition-all ${
                      unlocked
                        ? 'bg-surface border-gold/20 hover:-translate-y-1 hover:shadow-lg cursor-default'
                        : 'bg-surface/50 border-border-custom/30 opacity-50'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 border-2 relative ${
                        unlocked
                          ? 'bg-gold/10 border-gold'
                          : 'bg-surface-elevated border-border-custom'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${unlocked ? 'text-gold' : 'text-txt-secondary/50'}`} />
                      {!unlocked && (
                        <div className="absolute inset-0 rounded-full bg-surface-elevated/70 flex items-center justify-center">
                          <Lock className="w-3.5 h-3.5 text-txt-secondary/50" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-txt mb-0.5">{ach.name}</h3>
                    <p className="text-xs text-txt-secondary">{ach.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Empty State or Activity */}
          <div className="glass-card rounded-2xl p-6 hover:transform-none">
            <h2 className="text-lg font-semibold text-txt mb-4">Recent Activity</h2>
            {puzzlesSolved === 0 ? (
              <div className="text-center py-12">
                <Brain className="w-12 h-12 text-txt-secondary/30 mx-auto mb-3" />
                <p className="text-txt-secondary text-sm">No activity yet</p>
                <p className="text-txt-secondary/60 text-xs mt-1">Start solving puzzles to see your progress here!</p>
                <a href="/puzzles" className="inline-block mt-4 px-6 py-2 rounded-xl btn-gradient text-sm font-medium text-white">
                  <span>Browse Puzzles</span>
                </a>
              </div>
            ) : (
              <p className="text-txt-secondary text-sm">Activity tracking coming soon.</p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
