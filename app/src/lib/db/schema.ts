import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  real,
  date,
  timestamp,
  jsonb,
  bigserial,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums as union types ────────────────────────────────────────────────────

export type AuthProvider = "credentials" | "google";

export type PuzzleType =
  | "kakurasu"
  | "futoshiki"
  | "takuzu"
  | "knights_knaves"
  | "zebra"
  | "logic_problems"
  | "number_sequences"
  | "number_sequence"
  | "arc_agi"
  | "tsp"
  | "brainteaser"
  // Interview-grade types
  | "fermi"
  | "optimization"
  | "probability"
  | "game_theory"
  | "strategy"
  | "lsat_logic"
  | "logicbench";

export type PuzzleCategory =
  | "structured_grid"
  | "logical_deduction"
  | "pattern_recognition"
  | "scenario_decision"
  | "riddles_verbal"
  // Interview-grade categories
  | "estimation_strategy"
  | "probability_game_theory"
  | "logic_deduction";

export type AttemptStatus =
  | "in_progress"
  | "completed"
  | "abandoned"
  | "timed_out";

export type GameMode = "practice" | "timed" | "blitz" | "daily";

export type AchievementCategory = "milestone" | "mastery" | "social" | "special";
export type AchievementRarity = "common" | "rare" | "epic" | "legendary";

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    username: varchar("username", { length: 40 }).notNull().unique(),
    displayName: varchar("display_name", { length: 100 }),
    avatarUrl: text("avatar_url"),
    passwordHash: text("password_hash"),
    authProvider: varchar("auth_provider", { length: 20 })
      .notNull()
      .default("credentials")
      .$type<AuthProvider>(),
    xp: integer("xp").notNull().default(0),
    level: integer("level").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_username_idx").on(table.username),
  ]
);

// ─── Puzzles ─────────────────────────────────────────────────────────────────

export const puzzles = pgTable(
  "puzzles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: varchar("type", { length: 30 }).notNull().$type<PuzzleType>(),
    category: varchar("category", { length: 30 })
      .notNull()
      .$type<PuzzleCategory>(),
    difficulty: integer("difficulty").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    config: jsonb("config"),
    initialState: jsonb("initial_state"),
    solution: jsonb("solution"),
    hints: jsonb("hints"),
    estimatedTimeSeconds: integer("estimated_time_seconds"),
    skillTags: text("skill_tags").array(),
    source: varchar("source", { length: 100 }),
    isActive: boolean("is_active").notNull().default(true),
    playCount: integer("play_count").notNull().default(0),
    avgSolveTime: real("avg_solve_time"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("puzzles_type_idx").on(table.type),
    index("puzzles_category_idx").on(table.category),
    index("puzzles_difficulty_idx").on(table.difficulty),
    index("puzzles_type_difficulty_idx").on(table.type, table.difficulty),
    index("puzzles_active_idx").on(table.isActive),
  ]
);

// ─── Attempts ────────────────────────────────────────────────────────────────

export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    puzzleId: uuid("puzzle_id")
      .notNull()
      .references(() => puzzles.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 })
      .notNull()
      .default("in_progress")
      .$type<AttemptStatus>(),
    isCorrect: boolean("is_correct"),
    score: real("score"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),
    totalActions: integer("total_actions").notNull().default(0),
    mistakes: integer("mistakes").notNull().default(0),
    hintsUsed: integer("hints_used").notNull().default(0),
    undoCount: integer("undo_count").notNull().default(0),
    finalState: jsonb("final_state"),
    actionLog: jsonb("action_log"),
    gameMode: varchar("game_mode", { length: 20 })
      .notNull()
      .default("practice")
      .$type<GameMode>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("attempts_user_id_idx").on(table.userId),
    index("attempts_puzzle_id_idx").on(table.puzzleId),
    index("attempts_user_puzzle_idx").on(table.userId, table.puzzleId),
    index("attempts_status_idx").on(table.status),
    index("attempts_game_mode_idx").on(table.gameMode),
    index("attempts_user_status_idx").on(table.userId, table.status),
  ]
);

// ─── User Skills ─────────────────────────────────────────────────────────────

export const userSkills = pgTable(
  "user_skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dimension: varchar("dimension", { length: 50 }).notNull(),
    rating: real("rating").notNull().default(1000),
    confidence: real("confidence").notNull().default(0.5),
    totalAttempts: integer("total_attempts").notNull().default(0),
    correctRate: real("correct_rate").notNull().default(0),
  },
  (table) => [
    uniqueIndex("user_skills_user_dimension_idx").on(
      table.userId,
      table.dimension
    ),
    index("user_skills_user_id_idx").on(table.userId),
  ]
);

// ─── User Streaks ────────────────────────────────────────────────────────────

export const userStreaks = pgTable(
  "user_streaks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    currentStreak: integer("current_streak").notNull().default(0),
    longestStreak: integer("longest_streak").notNull().default(0),
    lastActiveDate: date("last_active_date"),
    streakFreezes: integer("streak_freezes").notNull().default(0),
  },
  (table) => [index("user_streaks_user_id_idx").on(table.userId)]
);

// ─── Achievements ────────────────────────────────────────────────────────────

export const achievements = pgTable("achievements", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  iconName: varchar("icon_name", { length: 50 }),
  category: varchar("category", { length: 20 })
    .notNull()
    .$type<AchievementCategory>(),
  condition: jsonb("condition"),
  xpReward: integer("xp_reward").notNull().default(0),
  rarity: varchar("rarity", { length: 20 })
    .notNull()
    .default("common")
    .$type<AchievementRarity>(),
});

// ─── User Achievements ──────────────────────────────────────────────────────

export const userAchievements = pgTable(
  "user_achievements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    achievementId: varchar("achievement_id", { length: 50 })
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_achievements_user_achievement_idx").on(
      table.userId,
      table.achievementId
    ),
    index("user_achievements_user_id_idx").on(table.userId),
  ]
);

// ─── Leaderboard Entries ─────────────────────────────────────────────────────

export const leaderboardEntries = pgTable(
  "leaderboard_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scope: varchar("scope", { length: 50 }).notNull(),
    period: varchar("period", { length: 50 }).notNull(),
    score: real("score").notNull().default(0),
    rank: integer("rank"),
    metadata: jsonb("metadata"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("leaderboard_user_scope_period_idx").on(
      table.userId,
      table.scope,
      table.period
    ),
    index("leaderboard_entries_user_id_idx").on(table.userId),
    index("leaderboard_entries_scope_period_idx").on(table.scope, table.period),
    index("leaderboard_entries_score_idx").on(table.score),
  ]
);

// ─── User Events ─────────────────────────────────────────────────────────────

export const userEvents = pgTable(
  "user_events",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    userId: uuid("user_id"),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    puzzleId: uuid("puzzle_id"),
    attemptId: uuid("attempt_id"),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("user_events_user_id_idx").on(table.userId),
    index("user_events_event_type_idx").on(table.eventType),
    index("user_events_user_event_idx").on(table.userId, table.eventType),
    index("user_events_created_at_idx").on(table.createdAt),
  ]
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many, one }) => ({
  attempts: many(attempts),
  skills: many(userSkills),
  streak: one(userStreaks),
  achievements: many(userAchievements),
  leaderboardEntries: many(leaderboardEntries),
  events: many(userEvents),
}));

export const puzzlesRelations = relations(puzzles, ({ many }) => ({
  attempts: many(attempts),
}));

export const attemptsRelations = relations(attempts, ({ one }) => ({
  user: one(users, {
    fields: [attempts.userId],
    references: [users.id],
  }),
  puzzle: one(puzzles, {
    fields: [attempts.puzzleId],
    references: [puzzles.id],
  }),
}));

export const userSkillsRelations = relations(userSkills, ({ one }) => ({
  user: one(users, {
    fields: [userSkills.userId],
    references: [users.id],
  }),
}));

export const userStreaksRelations = relations(userStreaks, ({ one }) => ({
  user: one(users, {
    fields: [userStreaks.userId],
    references: [users.id],
  }),
}));

export const userAchievementsRelations = relations(
  userAchievements,
  ({ one }) => ({
    user: one(users, {
      fields: [userAchievements.userId],
      references: [users.id],
    }),
    achievement: one(achievements, {
      fields: [userAchievements.achievementId],
      references: [achievements.id],
    }),
  })
);

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const leaderboardEntriesRelations = relations(
  leaderboardEntries,
  ({ one }) => ({
    user: one(users, {
      fields: [leaderboardEntries.userId],
      references: [users.id],
    }),
  })
);

export const userEventsRelations = relations(userEvents, ({ one }) => ({
  user: one(users, {
    fields: [userEvents.userId],
    references: [users.id],
  }),
}));

// ─── Type Inference ──────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Puzzle = typeof puzzles.$inferSelect;
export type NewPuzzle = typeof puzzles.$inferInsert;

export type Attempt = typeof attempts.$inferSelect;
export type NewAttempt = typeof attempts.$inferInsert;

export type UserSkill = typeof userSkills.$inferSelect;
export type NewUserSkill = typeof userSkills.$inferInsert;

export type UserStreak = typeof userStreaks.$inferSelect;
export type NewUserStreak = typeof userStreaks.$inferInsert;

export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;

export type UserAchievement = typeof userAchievements.$inferSelect;
export type NewUserAchievement = typeof userAchievements.$inferInsert;

export type LeaderboardEntry = typeof leaderboardEntries.$inferSelect;
export type NewLeaderboardEntry = typeof leaderboardEntries.$inferInsert;

export type UserEvent = typeof userEvents.$inferSelect;
export type NewUserEvent = typeof userEvents.$inferInsert;
