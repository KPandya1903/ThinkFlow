import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { puzzles, attempts, users, userStreaks } from "@/lib/db/schema";
import { auth } from "@/lib/auth";

// XP by difficulty
const XP_MAP: Record<number, number> = { 1: 10, 2: 20, 3: 35, 4: 50, 5: 75 };

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

interface SolutionInfo {
  text: string;
  explanation?: string;
  acceptableRange?: [number, number];
}

function extractSolutionInfo(solution: unknown): SolutionInfo {
  if (typeof solution === "string") return { text: solution };
  if (typeof solution === "number") return { text: String(solution) };

  if (solution && typeof solution === "object") {
    const sol = solution as Record<string, unknown>;

    // { answer: "...", acceptableRange: [low, high], explanation: "..." }
    if (sol.answer !== undefined) {
      const info: SolutionInfo = { text: String(sol.answer) };
      if (
        Array.isArray(sol.acceptableRange) &&
        sol.acceptableRange.length === 2
      ) {
        info.acceptableRange = [
          Number(sol.acceptableRange[0]),
          Number(sol.acceptableRange[1]),
        ];
      }
      if (typeof sol.explanation === "string") info.explanation = sol.explanation;
      return info;
    }

    // { solution: "..." }
    if (sol.solution !== undefined) {
      const info: SolutionInfo = { text: String(sol.solution) };
      if (typeof sol.explanation === "string") info.explanation = sol.explanation;
      return info;
    }

    // { text: "..." }
    if (sol.text !== undefined) return { text: String(sol.text) };

    // { value: "..." }
    if (sol.value !== undefined) return { text: String(sol.value) };

    // { answerKey: "E" } (brainteasers)
    if (sol.answerKey !== undefined) {
      const info: SolutionInfo = { text: String(sol.answerKey) };
      if (typeof sol.explanation === "string") info.explanation = sol.explanation;
      return info;
    }

    // Array — join values
    if (Array.isArray(solution)) return { text: solution.join(", ") };

    // Last resort: find first string value
    for (const value of Object.values(sol)) {
      if (typeof value === "string" && value.length > 0) return { text: value };
    }
  }

  return { text: String(solution) };
}

function extractSolutionText(solution: unknown): string {
  return extractSolutionInfo(solution).text;
}

function checkMathAnswer(userAnswer: string, expected: string): boolean {
  const userNum = parseFloat(userAnswer.trim());
  const expectedNum = parseFloat(expected.trim());
  if (!isNaN(userNum) && !isNaN(expectedNum)) {
    return userNum === expectedNum;
  }
  return normalize(userAnswer) === normalize(expected);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const userAnswer = body.answer as string;

    if (!userAnswer) {
      return NextResponse.json({ error: "Answer is required" }, { status: 400 });
    }

    // Get puzzle with solution
    const [puzzle] = await db
      .select()
      .from(puzzles)
      .where(eq(puzzles.id, id))
      .limit(1);

    if (!puzzle) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    // Extract the actual answer + metadata from solution (handles various formats)
    const solutionInfo = extractSolutionInfo(puzzle.solution);
    const solution = solutionInfo.text;

    // Type-aware answer checking
    const MATH_TYPES = new Set([
      "probability",
      "optimization",
    ]);

    let correct: boolean;

    if (puzzle.type === "lsat_logic") {
      // User submits a label ("A"–"E"); solution stores correctIndex
      const sol = puzzle.solution as { correctIndex: number; correctAnswer: string } | null;
      if (sol != null) {
        const LABELS = ["A", "B", "C", "D", "E"];
        const submittedIndex = LABELS.indexOf(userAnswer.trim().toUpperCase());
        correct = submittedIndex !== -1 && submittedIndex === sol.correctIndex;
      } else {
        correct = false;
      }
    } else if (puzzle.type === "logicbench") {
      // User submits a label ("A"–"D"); solution stores correctLabel
      const sol = puzzle.solution as { correctLabel: string; correctIndex: number; correctText: string } | null;
      if (sol != null) {
        correct = userAnswer.trim().toUpperCase() === sol.correctLabel.toUpperCase();
      } else {
        correct = false;
      }
    } else if (puzzle.type === "fermi" && solutionInfo.acceptableRange) {
      // Fermi estimation: accept any number within the acceptable range
      const userNum = parseFloat(userAnswer.trim());
      if (!isNaN(userNum)) {
        const [low, high] = solutionInfo.acceptableRange;
        correct = userNum >= low && userNum <= high;
      } else {
        // User didn't submit a number — fall back to text comparison
        correct = normalize(userAnswer) === normalize(solution);
      }
    } else if (MATH_TYPES.has(puzzle.type)) {
      // Math-oriented puzzles: try numeric comparison first, then string
      correct = checkMathAnswer(userAnswer, solution);
    } else {
      correct = normalize(userAnswer) === normalize(solution);
    }

    // If user is authenticated, record the attempt and award XP
    const session = await auth();
    let xpEarned = 0;

    if (session?.user?.id) {
      const userId = session.user.id;
      const baseXp = XP_MAP[puzzle.difficulty] ?? 20;
      xpEarned = correct ? baseXp : Math.round(baseXp * 0.1); // Small XP even for wrong answers

      // Record attempt
      await db.insert(attempts).values({
        userId,
        puzzleId: id,
        status: "completed",
        isCorrect: correct,
        score: correct ? 1.0 : 0.0,
        startedAt: new Date(),
        completedAt: new Date(),
        durationMs: body.timeMs ?? 0,
        hintsUsed: body.hintsUsed ?? 0,
        gameMode: "practice",
      });

      // Award XP
      if (xpEarned > 0) {
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (user) {
          const newXp = user.xp + xpEarned;
          const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
          await db
            .update(users)
            .set({ xp: newXp, level: newLevel, updatedAt: new Date() })
            .where(eq(users.id, userId));
        }
      }

      // Update streak
      const today = new Date().toISOString().split("T")[0];
      const [streak] = await db.select().from(userStreaks).where(eq(userStreaks.userId, userId)).limit(1);

      if (streak) {
        const lastDate = streak.lastActiveDate?.toISOString().split("T")[0];
        if (lastDate !== today) {
          const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
          const newStreak = lastDate === yesterday ? streak.currentStreak + 1 : 1;
          const longestStreak = Math.max(streak.longestStreak, newStreak);
          await db
            .update(userStreaks)
            .set({ currentStreak: newStreak, longestStreak, lastActiveDate: new Date(today) })
            .where(eq(userStreaks.userId, userId));
        }
      } else {
        await db.insert(userStreaks).values({
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: new Date(today),
        });
      }

      // Increment play count
      await db
        .update(puzzles)
        .set({ playCount: (puzzle.playCount ?? 0) + 1 })
        .where(eq(puzzles.id, id));
    }

    // Build response — include explanation & range for richer client feedback
    const response: Record<string, unknown> = {
      correct,
      xpEarned,
    };

    if (!correct) {
      response.solution = solution;
    }

    // Always send explanation if available (useful for learning even on correct)
    if (solutionInfo.explanation) {
      response.explanation = solutionInfo.explanation;
    }

    // For Fermi puzzles, include the acceptable range so the UI can show it
    if (solutionInfo.acceptableRange) {
      response.acceptableRange = solutionInfo.acceptableRange;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Validate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
