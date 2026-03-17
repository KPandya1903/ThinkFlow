import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { puzzles } from '@/lib/db/schema';
import Navbar from '@/components/ui/Navbar';
import TextPuzzleGame from '@/components/puzzle/TextPuzzleGame';
import MultiChoiceGame from '@/components/puzzle/MultiChoiceGame';
import FermiSliderGame from '@/components/puzzle/FermiSliderGame';
import NimGame from '@/components/puzzle/NimGame';
import MontyHallGame from '@/components/puzzle/MontyHallGame';

interface PlayPageProps {
  params: Promise<{ id: string }>;
}

// ─── Extract readable text from initialState (handles JSON objects + strings) ─

function extractPuzzleText(initialState: unknown): string {
  if (typeof initialState === 'string') return initialState;

  if (initialState && typeof initialState === 'object') {
    const state = initialState as Record<string, unknown>;

    // Knights & Knaves format: { names: [...], puzzleText: "..." }
    if (state.puzzleText) return String(state.puzzleText);

    // Reasoning-gym format: { question: "..." }
    if (state.question) return String(state.question);

    // Generic: { text: "..." }
    if (state.text) return String(state.text);

    // Zebra format: { clues: [...], question: "..." }
    if (state.clues && Array.isArray(state.clues)) {
      const clues = (state.clues as string[]).map((c, i) => `${i + 1}. ${c}`).join('\n');
      const question = state.question ? `\n\n${state.question}` : '';
      return clues + question;
    }

    // Last resort: try to find any long string value
    for (const value of Object.values(state)) {
      if (typeof value === 'string' && value.length > 20) return value;
    }
  }

  return String(initialState);
}

// ─── Puzzle type labels for the header ──────────────────────────────────────

const PUZZLE_TYPE_LABELS: Record<string, string> = {
  knights_knaves: 'Knights & Knaves',
  zebra: 'Zebra / Einstein',
  number_sequence: 'Number Sequence',
  number_sequences: 'Number Sequence',
  brainteaser: 'Brain Teaser',
  futoshiki: 'Futoshiki',
  takuzu: 'Takuzu / Binary',
  kakurasu: 'Kakurasu',
  arc_agi: 'ARC Challenge',
  fermi: 'Fermi Estimation',
  optimization: 'Optimization Puzzle',
  probability: 'Probability Puzzle',
  game_theory: 'Game Theory',
  strategy: 'Logic & Strategy',
  lsat_logic: 'LSAT Logic Game',
  logicbench: 'Logic Reasoning',
};

// ─── Text-based puzzle types (rendered with TextPuzzleGame) ─────────────────

const TEXT_PUZZLE_TYPES = new Set([
  'knights_knaves',
  'zebra',
  'number_sequence',
  'number_sequences',
  'futoshiki',
  'takuzu',
  'kakurasu',
  'fermi',
  'optimization',
  'probability',
  'game_theory',
  'strategy',
]);

export default async function PlayPage({ params }: PlayPageProps) {
  const { id } = await params;

  // Fetch puzzle from DB — explicitly select every column EXCEPT solution
  const rows = await db
    .select({
      id: puzzles.id,
      type: puzzles.type,
      category: puzzles.category,
      difficulty: puzzles.difficulty,
      title: puzzles.title,
      initialState: puzzles.initialState,
      hints: puzzles.hints,
      estimatedTimeSeconds: puzzles.estimatedTimeSeconds,
      config: puzzles.config,
    })
    .from(puzzles)
    .where(eq(puzzles.id, id))
    .limit(1);

  const puzzle = rows[0];

  if (!puzzle) {
    notFound();
  }

  // ─── Render the correct game component based on puzzle type ─────────────

  const renderGame = () => {
    // Brain Teaser (multiple choice)
    if (puzzle.type === 'brainteaser') {
      const initialState = puzzle.initialState as {
        stem: string;
        choices: { label: string; text: string }[];
      };

      return (
        <MultiChoiceGame
          puzzleId={puzzle.id}
          stem={initialState.stem}
          choices={initialState.choices}
          title={puzzle.title}
          difficulty={puzzle.difficulty}
          estimatedTimeSeconds={puzzle.estimatedTimeSeconds ?? undefined}
          hints={puzzle.hints as string[] | null}
        />
      );
    }

    // LSAT Logic (context passage + question + answer choices)
    if (puzzle.type === 'lsat_logic') {
      const initialState = puzzle.initialState as {
        context: string;
        question: string;
        answers: string[];
      };

      const LABELS = ['A', 'B', 'C', 'D', 'E'];
      const choices = initialState.answers.map((text, i) => ({
        label: LABELS[i] ?? String(i),
        text,
      }));

      return (
        <MultiChoiceGame
          puzzleId={puzzle.id}
          context={initialState.context}
          stem={initialState.question}
          choices={choices}
          title={puzzle.title}
          difficulty={puzzle.difficulty}
          estimatedTimeSeconds={puzzle.estimatedTimeSeconds ?? undefined}
          hints={puzzle.hints as string[] | null}
        />
      );
    }

    // LogicBench (context + question + labeled choices)
    if (puzzle.type === 'logicbench') {
      const initialState = puzzle.initialState as {
        context: string;
        question: string;
        choices: { label: string; text: string }[];
      };

      return (
        <MultiChoiceGame
          puzzleId={puzzle.id}
          context={initialState.context}
          stem={initialState.question}
          choices={initialState.choices}
          title={puzzle.title}
          difficulty={puzzle.difficulty}
          estimatedTimeSeconds={puzzle.estimatedTimeSeconds ?? undefined}
          hints={puzzle.hints as string[] | null}
        />
      );
    }

    // Fermi estimation puzzles → logarithmic slider game
    if (puzzle.type === 'fermi') {
      const puzzleText = extractPuzzleText(puzzle.initialState);
      return (
        <FermiSliderGame
          puzzleId={puzzle.id}
          puzzleText={puzzleText}
          title={puzzle.title}
          difficulty={puzzle.difficulty}
          estimatedTimeSeconds={puzzle.estimatedTimeSeconds ?? undefined}
          hints={puzzle.hints as string[] | null}
        />
      );
    }

    // Nim game → interactive stone piles board
    if (puzzle.type === 'game_theory' && puzzle.title.toLowerCase().includes('nim')) {
      const puzzleText = extractPuzzleText(puzzle.initialState);
      return (
        <NimGame
          puzzleId={puzzle.id}
          puzzleText={puzzleText}
          title={puzzle.title}
          difficulty={puzzle.difficulty}
          estimatedTimeSeconds={puzzle.estimatedTimeSeconds ?? undefined}
          hints={puzzle.hints as string[] | null}
        />
      );
    }

    // Monty Hall → animated door simulation
    if (puzzle.title.toLowerCase().includes('monty hall')) {
      const puzzleText = extractPuzzleText(puzzle.initialState);
      return (
        <MontyHallGame
          puzzleId={puzzle.id}
          puzzleText={puzzleText}
          title={puzzle.title}
          difficulty={puzzle.difficulty}
          estimatedTimeSeconds={puzzle.estimatedTimeSeconds ?? undefined}
          hints={puzzle.hints as string[] | null}
        />
      );
    }

    // Text-based puzzles: Knights & Knaves, Zebra, Number Sequence, etc.
    const puzzleText = extractPuzzleText(puzzle.initialState);
    const typeLabel = PUZZLE_TYPE_LABELS[puzzle.type] ?? puzzle.type;

    return (
      <TextPuzzleGame
        puzzleId={puzzle.id}
        puzzleText={puzzleText}
        title={puzzle.title}
        difficulty={puzzle.difficulty}
        estimatedTimeSeconds={puzzle.estimatedTimeSeconds ?? undefined}
        hints={puzzle.hints as string[] | null}
        puzzleTypeLabel={typeLabel}
        puzzleType={puzzle.type}
      />
    );
  };

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-xs text-txt-secondary" aria-label="Breadcrumb">
          <a href="/puzzles" className="text-primary-light hover:text-primary transition-colors">
            Puzzles
          </a>
          <span className="mx-2 text-border-custom">/</span>
          <span className="text-txt">{puzzle.title}</span>
        </nav>

        {renderGame()}
      </main>
    </>
  );
}
