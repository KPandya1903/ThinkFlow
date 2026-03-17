import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { puzzles } from '@/lib/db/schema';
import Navbar from '@/components/ui/Navbar';
import PuzzleBrowser from '@/components/puzzle/PuzzleBrowser';

const XP_BY_DIFFICULTY: Record<number, number> = {
  1: 10,
  2: 20,
  3: 35,
  4: 50,
  5: 75,
};

function formatEstimatedTime(seconds: number | null): string {
  if (!seconds) return '? min';
  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

export default async function PuzzlesPage() {
  const rows = await db
    .select({
      id: puzzles.id,
      type: puzzles.type,
      category: puzzles.category,
      difficulty: puzzles.difficulty,
      title: puzzles.title,
      estimatedTimeSeconds: puzzles.estimatedTimeSeconds,
      playCount: puzzles.playCount,
    })
    .from(puzzles)
    .where(eq(puzzles.isActive, true));

  const puzzleData = rows.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    type: row.type,
    difficulty: row.difficulty as 1 | 2 | 3 | 4 | 5,
    estimatedTime: formatEstimatedTime(row.estimatedTimeSeconds),
    xpReward: XP_BY_DIFFICULTY[row.difficulty] ?? 20,
  }));

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-txt mb-1">
            Browse <span className="gradient-text">Puzzles</span>
          </h1>
          <p className="text-txt-secondary text-sm">
            Find puzzles that match your skill level and interests.
          </p>
        </div>
        <PuzzleBrowser puzzles={puzzleData} />
      </main>
    </>
  );
}
