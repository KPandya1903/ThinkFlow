import {
  Zap, Puzzle, Flame, Target, ChevronRight,
  Grid3X3, Search, Hash, MessageCircle, Star, Brain,
} from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { users, attempts, userStreaks, userSkills } from '@/lib/db/schema';
import { eq, count, and } from 'drizzle-orm';
import Navbar from '@/components/ui/Navbar';
import StatCard from '@/components/dashboard/StatCard';
import SkillRadar from '@/components/dashboard/SkillRadar';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const userId = session.user.id;

  // Fetch user
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

  const [streak] = await db.select().from(userStreaks).where(eq(userStreaks.userId, userId)).limit(1);

  const skills = await db.select().from(userSkills).where(eq(userSkills.userId, userId));

  const puzzlesSolved = Number(completedCount?.count ?? 0);
  const correctSolved = Number(correctCount?.count ?? 0);
  const accuracy = puzzlesSolved > 0 ? Math.round((correctSolved / puzzlesSolved) * 100) : 0;
  const currentStreak = streak?.currentStreak ?? 0;

  // Build skill radar data (default to 0 for new users)
  const skillMap: Record<string, number> = {};
  skills.forEach(s => { skillMap[s.dimension] = Math.round((s.rating - 800) / 4); }); // normalize 800-1200 to 0-100
  const skillData = [
    { label: 'Logic', value: Math.max(0, Math.min(100, skillMap['logical_reasoning'] ?? 0)) },
    { label: 'Pattern', value: Math.max(0, Math.min(100, skillMap['pattern_recognition'] ?? 0)) },
    { label: 'Speed', value: Math.max(0, Math.min(100, skillMap['speed'] ?? 0)) },
    { label: 'Accuracy', value: Math.max(0, Math.min(100, skillMap['accuracy'] ?? 0)) },
    { label: 'Decision', value: Math.max(0, Math.min(100, skillMap['decision_making'] ?? 0)) },
  ];

  const quickPlay = [
    { label: 'Logic', icon: Hash, href: '/puzzles?category=logical_deduction', color: '#fdcb6e' },
    { label: 'Patterns', icon: Search, href: '/puzzles?category=pattern_recognition', color: '#00cec9' },
    { label: 'Brain Teasers', icon: MessageCircle, href: '/puzzles?category=riddles_verbal', color: '#00b894' },
    { label: 'Strategy', icon: Grid3X3, href: '/puzzles?category=scenario_decision', color: '#6c5ce7' },
  ];

  const displayName = user.displayName || user.username;
  const firstName = displayName.split(' ')[0];

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-txt mb-1">
            Welcome back, <span className="gradient-text">{firstName}</span>
          </h1>
          <p className="text-txt-secondary text-sm">
            {puzzlesSolved === 0
              ? "Ready to start your cognitive training journey?"
              : currentStreak > 0
                ? `Your ${currentStreak}-day streak is going strong!`
                : "Ready for today's challenges?"
            }
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Zap}
            label="Total XP"
            value={user.xp.toLocaleString()}
            iconColor="text-primary-light"
            iconBg="bg-primary/10"
          />
          <StatCard
            icon={Puzzle}
            label="Puzzles Solved"
            value={puzzlesSolved.toString()}
            iconColor="text-accent"
            iconBg="bg-accent/10"
          />
          <StatCard
            icon={Flame}
            label="Day Streak"
            value={currentStreak.toString()}
            iconColor="text-gold"
            iconBg="bg-gold/10"
          />
          <StatCard
            icon={Target}
            label="Accuracy"
            value={puzzlesSolved > 0 ? `${accuracy}%` : '—'}
            iconColor="text-success"
            iconBg="bg-success/10"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Daily Challenge */}
            <div className="glass-card rounded-2xl p-6 relative overflow-hidden hover:transform-none">
              <div className="absolute inset-0 rounded-2xl opacity-50 pointer-events-none" style={{
                background: 'linear-gradient(135deg, rgba(108,92,231,0.1), rgba(0,206,201,0.1))',
              }} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Star className="w-5 h-5 text-primary-light" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-txt">Daily Challenge</h2>
                      <p className="text-xs text-txt-secondary">Solve today&apos;s puzzle for bonus XP</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gold font-mono">+100 XP</span>
                    <Zap className="w-4 h-4 text-gold" />
                  </div>
                </div>
                <div className="bg-background/50 rounded-xl p-4 mb-4">
                  <h3 className="text-base font-medium text-txt mb-1">Daily Challenge</h3>
                  <p className="text-sm text-txt-secondary">
                    Test your skills with a curated puzzle. New challenge every day!
                  </p>
                </div>
                <Link
                  href="/puzzles"
                  className="btn-gradient inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm"
                >
                  <span className="flex items-center gap-2">
                    Start Challenge
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </Link>
              </div>
            </div>

            {/* Skill Radar */}
            <div className="glass-card rounded-2xl p-6 hover:transform-none">
              <h2 className="text-lg font-semibold text-txt mb-4">Skill Radar</h2>
              {puzzlesSolved === 0 ? (
                <div className="text-center py-8">
                  <Brain className="w-10 h-10 text-txt-secondary/30 mx-auto mb-3" />
                  <p className="text-sm text-txt-secondary">Solve puzzles to build your skill profile</p>
                </div>
              ) : (
                <SkillRadar skills={skillData} />
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="glass-card rounded-2xl p-6 hover:transform-none">
              <h2 className="text-lg font-semibold text-txt mb-4">Recent Activity</h2>
              {puzzlesSolved === 0 ? (
                <div className="text-center py-8">
                  <Puzzle className="w-10 h-10 text-txt-secondary/30 mx-auto mb-3" />
                  <p className="text-sm text-txt-secondary">No activity yet</p>
                  <p className="text-xs text-txt-secondary/60 mt-1">Solve your first puzzle!</p>
                </div>
              ) : (
                <p className="text-sm text-txt-secondary">Activity feed coming soon.</p>
              )}
            </div>

            {/* Quick Play */}
            <div className="glass-card rounded-2xl p-6 hover:transform-none">
              <h2 className="text-lg font-semibold text-txt mb-4">Quick Play</h2>
              <div className="grid grid-cols-2 gap-3">
                {quickPlay.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-background/50 border border-border-custom/50 hover:border-primary/30 transition-all"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-6"
                        style={{
                          backgroundColor: `${item.color}15`,
                          border: `1px solid ${item.color}30`,
                        }}
                      >
                        <Icon className="w-5 h-5" style={{ color: item.color }} />
                      </div>
                      <span className="text-sm font-medium text-txt-secondary group-hover:text-txt transition-colors">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
