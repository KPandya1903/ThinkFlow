import { db } from '@/lib/db';
import { users, userStreaks, achievements, userAchievements } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

// ---- Level Thresholds ----
// XP required to reach each level (cumulative)
function levelFromXP(totalXP: number): number {
  // Level formula: level = floor(sqrt(totalXP / 100)) + 1
  // Level 1: 0 XP, Level 2: 100 XP, Level 3: 400 XP, Level 5: 1600 XP, etc.
  return Math.floor(Math.sqrt(totalXP / 100)) + 1;
}

// ---- Award XP ----

export async function awardXP(
  userId: string,
  xp: number,
): Promise<{ totalXP: number; level: number; leveledUp: boolean }> {
  // Atomically increment XP
  const [updated] = await db
    .update(users)
    .set({
      xp: sql`${users.xp} + ${xp}`,
    })
    .where(eq(users.id, userId))
    .returning({ xp: users.xp, level: users.level });

  if (!updated) {
    throw new Error('User not found');
  }

  const newLevel = levelFromXP(updated.xp);
  const leveledUp = newLevel > updated.level;

  // Update level if it changed
  if (leveledUp) {
    await db
      .update(users)
      .set({ level: newLevel })
      .where(eq(users.id, userId));
  }

  return {
    totalXP: updated.xp,
    level: newLevel,
    leveledUp,
  };
}

// ---- Streak Management ----

export async function updateStreak(
  userId: string,
  isCorrect: boolean,
): Promise<{ currentStreak: number; longestStreak: number }> {
  // Get or create streak record
  let [streak] = await db
    .select()
    .from(userStreaks)
    .where(eq(userStreaks.userId, userId))
    .limit(1);

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayStr = now.toISOString().split("T")[0]; // "YYYY-MM-DD"

  if (!streak) {
    // Create new streak record
    const [created] = await db
      .insert(userStreaks)
      .values({
        userId,
        currentStreak: isCorrect ? 1 : 0,
        longestStreak: isCorrect ? 1 : 0,
        lastActiveDate: todayStr,
      })
      .returning();
    return {
      currentStreak: created.currentStreak,
      longestStreak: created.longestStreak,
    };
  }

  const lastActivity = streak.lastActiveDate
    ? new Date(streak.lastActiveDate)
    : new Date(0);
  lastActivity.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor(
    (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24),
  );

  let newCurrentStreak = streak.currentStreak;

  if (!isCorrect) {
    // Incorrect answer doesn't break streak, just don't extend it
    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
    };
  }

  if (daysDiff === 0) {
    // Already played today — streak count stays the same
    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
    };
  } else if (daysDiff === 1) {
    // Consecutive day — extend streak
    newCurrentStreak = streak.currentStreak + 1;
  } else {
    // Missed a day — reset streak
    newCurrentStreak = 1;
  }

  const newLongestStreak = Math.max(streak.longestStreak, newCurrentStreak);

  await db
    .update(userStreaks)
    .set({
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      lastActiveDate: todayStr,
    })
    .where(eq(userStreaks.userId, userId));

  return {
    currentStreak: newCurrentStreak,
    longestStreak: newLongestStreak,
  };
}

// ---- Achievement Checking ----

interface AchievementCheck {
  id: string;
  name: string;
  condition: (stats: UserAchievementStats) => boolean;
}

interface UserAchievementStats {
  totalCompleted: number;
  currentStreak: number;
  longestStreak: number;
  totalXP: number;
  level: number;
}

// Predefined achievement conditions
const ACHIEVEMENT_CHECKS: AchievementCheck[] = [
  { id: 'first_solve', name: 'First Solve', condition: (s) => s.totalCompleted >= 1 },
  { id: 'ten_solves', name: 'Decathlon', condition: (s) => s.totalCompleted >= 10 },
  { id: 'fifty_solves', name: 'Half Century', condition: (s) => s.totalCompleted >= 50 },
  { id: 'hundred_solves', name: 'Centurion', condition: (s) => s.totalCompleted >= 100 },
  { id: 'streak_3', name: '3-Day Streak', condition: (s) => s.longestStreak >= 3 },
  { id: 'streak_7', name: 'Week Warrior', condition: (s) => s.longestStreak >= 7 },
  { id: 'streak_30', name: 'Monthly Master', condition: (s) => s.longestStreak >= 30 },
  { id: 'level_5', name: 'Level 5', condition: (s) => s.level >= 5 },
  { id: 'level_10', name: 'Level 10', condition: (s) => s.level >= 10 },
  { id: 'xp_1000', name: 'XP Collector', condition: (s) => s.totalXP >= 1000 },
  { id: 'xp_10000', name: 'XP Hoarder', condition: (s) => s.totalXP >= 10000 },
];

export async function checkAchievements(
  userId: string,
  stats: UserAchievementStats,
): Promise<string[]> {
  // Get user's existing achievements
  const existingAchievements = await db
    .select({ achievementId: userAchievements.achievementId })
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));

  const existingIds = new Set(existingAchievements.map((a) => a.achievementId));
  const newlyEarned: string[] = [];

  for (const check of ACHIEVEMENT_CHECKS) {
    if (existingIds.has(check.id)) continue;
    if (!check.condition(stats)) continue;

    // Check if achievement exists in achievements table
    const [achievement] = await db
      .select({ id: achievements.id })
      .from(achievements)
      .where(eq(achievements.id, check.id))
      .limit(1);

    if (!achievement) continue;

    // Award achievement
    await db.insert(userAchievements).values({
      userId,
      achievementId: check.id,
      unlockedAt: new Date(),
    });

    newlyEarned.push(check.name);
  }

  return newlyEarned;
}
