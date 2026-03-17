/**
 * Seed script: Insert interview-grade puzzles into the database.
 *
 * Sources:
 *   1. Curated Interview Puzzles  (JSON)       — up to 150+
 *   2. LSAT-AR                    (Arrow→JSON) — sample 200
 *
 * Usage: npx tsx scripts/seed-interview.ts
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { puzzles } from '../src/lib/db/schema';
import * as dotenv from 'dotenv';

// ─── Environment ──────────────────────────────────────────────────────────────

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set. Add it to .env.local');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

// ─── Constants ────────────────────────────────────────────────────────────────

const DATA_ROOT = path.resolve(__dirname, '../../data/interview-grade');
const BATCH_SIZE = 100;

const DIFFICULTY_TIME_MAP: Record<number, number> = {
  1: 300,   // 5 min
  2: 480,   // 8 min
  3: 600,   // 10 min
  4: 900,   // 15 min
  5: 1200,  // 20 min
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type PuzzleInsert = typeof puzzles.$inferInsert;

function fileExists(p: string): boolean {
  try {
    fs.accessSync(p, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function difficultyLabel(d: number): string {
  switch (d) {
    case 1: return 'Easy';
    case 2: return 'Medium';
    case 3: return 'Hard';
    case 4: return 'Expert';
    case 5: return 'Master';
    default: return 'Unknown';
  }
}

/** Deterministic shuffle using Fisher-Yates with a simple seed. */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Read an Arrow file by converting it to JSON via a small Python one-liner.
 * Returns parsed array of row objects, or null on failure.
 */
function readArrowFile(arrowPath: string): Record<string, unknown>[] | null {
  if (!fileExists(arrowPath)) {
    console.warn(`  Arrow file not found: ${arrowPath}`);
    return null;
  }

  try {
    const pyScript = `
import pyarrow.ipc as ipc, json, sys
with open("${arrowPath}", "rb") as f:
    reader = ipc.open_stream(f)
    table = reader.read_all()
rows = []
for i in range(len(table)):
    row = {col: table.column(col)[i].as_py() for col in table.column_names}
    rows.append(row)
json.dump(rows, sys.stdout)
`.trim();

    const result = execSync(`python3 -c '${pyScript.replace(/'/g, "'\\''")}'`, {
      maxBuffer: 200 * 1024 * 1024, // 200 MB
      encoding: 'utf-8',
    });

    return JSON.parse(result);
  } catch (err) {
    console.warn(`  Failed to read Arrow file ${arrowPath}:`, (err as Error).message);
    return null;
  }
}

// ─── Source 1: Curated Interview Puzzles ──────────────────────────────────────

interface CuratedPuzzle {
  id: string;
  type: string;
  title: string;
  question: string;
  answer: string;
  acceptableRange?: string;
  difficulty: number;
  hints: string[];
  skills: string[];
}

function categoryFromType(puzzleType: string): string {
  switch (puzzleType) {
    case 'fermi':
    case 'optimization':
      return 'estimation_strategy';
    case 'probability':
    case 'game_theory':
      return 'probability_game_theory';
    case 'strategy':
    case 'logic':
      return 'logic_deduction';
    default:
      return 'estimation_strategy';
  }
}

function typeFromRaw(rawType: string): string {
  // Map raw JSON types to valid PuzzleType values
  return rawType === 'logic' ? 'strategy' : rawType;
}

function loadCuratedPuzzles(): PuzzleInsert[] {
  const filePath = path.join(DATA_ROOT, 'curated-puzzles', 'interview-puzzles.json');
  if (!fileExists(filePath)) {
    console.warn('  Curated puzzles file not found — skipping.');
    return [];
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as CuratedPuzzle[];
  console.log(`  Found ${raw.length} curated puzzles`);

  return raw.map((p) => ({
    type: typeFromRaw(p.type) as PuzzleInsert['type'],
    category: categoryFromType(p.type) as PuzzleInsert['category'],
    difficulty: p.difficulty,
    title: p.title,
    description: p.question.slice(0, 200),
    config: { source_id: p.id },
    initialState: { question: p.question },
    solution: { answer: p.answer, acceptableRange: p.acceptableRange ?? null },
    hints: p.hints,
    estimatedTimeSeconds: DIFFICULTY_TIME_MAP[p.difficulty] ?? 600,
    skillTags: p.skills,
    source: 'curated-interview',
    isActive: true,
    playCount: 0,
  }));
}

// ─── Source 2: LSAT-AR ───────────────────────────────────────────────────────

interface LsatProblem {
  context: string;
  id_string: string;
  answers: string[];
  label: number;
  question: string;
}

function loadLsatAr(target: number): PuzzleInsert[] {
  // Combine train + validation + test
  const allRows: LsatProblem[] = [];

  for (const split of ['train', 'validation', 'test']) {
    const arrowPath = path.join(
      DATA_ROOT,
      'lsat-ar',
      split,
      'data-00000-of-00001.arrow',
    );
    const rows = readArrowFile(arrowPath);
    if (rows) {
      allRows.push(...(rows as unknown as LsatProblem[]));
    }
  }

  if (allRows.length === 0) {
    console.warn('  LSAT-AR data not available — skipping.');
    return [];
  }

  console.log(`  Loaded ${allRows.length} LSAT-AR problems across all splits`);

  // Shuffle and sample
  const sampled = seededShuffle(allRows, 123).slice(0, target);
  console.log(`  Sampled ${sampled.length} LSAT-AR problems`);

  return sampled.map((p, i) => {
    // LSAT-AR problems are generally hard (difficulty 3-5)
    const difficulty = 3 + Math.floor(Math.random() * 3); // 3, 4, or 5
    // Use deterministic difficulty based on index to keep it reproducible
    const deterministicDifficulty = 3 + (i % 3); // cycles 3, 4, 5

    return {
      type: 'lsat_logic' as PuzzleInsert['type'],
      category: 'logic_deduction' as PuzzleInsert['category'],
      difficulty: deterministicDifficulty,
      title: `LSAT Logic #${i + 1}`,
      description: p.question.slice(0, 200),
      config: { sourceId: p.id_string, answerCount: p.answers.length },
      initialState: {
        context: p.context,
        question: p.question,
        answers: p.answers,
      },
      solution: {
        correctIndex: p.label,
        correctAnswer: p.answers[p.label],
      },
      hints: [
        'Carefully list all the constraints from the passage.',
        'Try process of elimination — rule out answers that violate any constraint.',
        'Draw a diagram or table to visualize the relationships.',
      ],
      estimatedTimeSeconds: DIFFICULTY_TIME_MAP[deterministicDifficulty] ?? 600,
      skillTags: ['logical_reasoning', 'constraint_satisfaction', 'analytical_reasoning'],
      source: 'lsat-ar',
      isActive: true,
      playCount: 0,
    };
  });
}

// ─── Source 3: LogicBench (MCQA) ─────────────────────────────────────────────

interface LogicBenchSample {
  id: number;
  context: string;
  question: string;
  choices: Record<string, string>;
  answer: string; // "choice_1", "choice_2", etc.
}

interface LogicBenchFile {
  type: string;
  axiom: string;
  samples: LogicBenchSample[];
}

const LOGIC_TYPE_DIFFICULTY: Record<string, number> = {
  propositional_logic: 2,
  first_order_logic: 4,
  nm_logic: 5,
};

function loadLogicBench(): PuzzleInsert[] {
  const mcqaRoot = path.join(DATA_ROOT, 'logicbench', 'data', 'LogicBench(Eval)', 'MCQA');
  if (!fileExists(mcqaRoot)) {
    console.warn('  LogicBench MCQA dir not found — skipping.');
    return [];
  }

  const results: PuzzleInsert[] = [];
  let idx = 0;

  for (const logicType of fs.readdirSync(mcqaRoot)) {
    const typeDir = path.join(mcqaRoot, logicType);
    if (!fs.statSync(typeDir).isDirectory()) continue;

    for (const axiom of fs.readdirSync(typeDir)) {
      const axiomFile = path.join(typeDir, axiom, 'data_instances.json');
      if (!fileExists(axiomFile)) continue;

      const data = JSON.parse(fs.readFileSync(axiomFile, 'utf-8')) as LogicBenchFile;
      const difficulty = LOGIC_TYPE_DIFFICULTY[logicType] ?? 3;

      for (const sample of data.samples) {
        const choiceLabels = ['A', 'B', 'C', 'D'];
        const choiceKeys = Object.keys(sample.choices);
        const choices = choiceKeys.map((key, i) => ({
          label: choiceLabels[i] ?? key,
          text: sample.choices[key],
        }));

        // Map "choice_4" → index 3 → label "D"
        const correctChoiceKey = sample.answer; // e.g. "choice_4"
        const correctIndex = choiceKeys.indexOf(correctChoiceKey);
        const correctLabel = choiceLabels[correctIndex] ?? 'A';

        results.push({
          type: 'logicbench' as PuzzleInsert['type'],
          category: 'logical_deduction' as PuzzleInsert['category'],
          difficulty,
          title: `LogicBench #${++idx}`,
          description: sample.context.slice(0, 200),
          config: { logicType, axiom, sampleId: sample.id },
          initialState: {
            context: sample.context,
            question: sample.question,
            choices,
          },
          solution: {
            correctLabel,
            correctIndex,
            correctText: sample.choices[correctChoiceKey],
          },
          hints: [
            'Read the context carefully and identify all stated facts.',
            `This puzzle tests the "${axiom.replace(/_/g, ' ')}" inference rule.`,
            'Consider what must logically follow from the given premises.',
          ],
          estimatedTimeSeconds: DIFFICULTY_TIME_MAP[difficulty] ?? 600,
          skillTags: ['logical_reasoning', logicType, axiom],
          source: 'logicbench-eval',
          isActive: true,
          playCount: 0,
        });
      }
    }
  }

  console.log(`  Loaded ${results.length} LogicBench MCQA samples across ${idx > 0 ? 'all' : 0} axioms`);
  return results;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Interview-Grade Puzzle Seed ===\n');

  const allValues: PuzzleInsert[] = [];

  // Source 1: Curated Interview Puzzles
  console.log('[1/3] Curated Interview Puzzles');
  const curated = loadCuratedPuzzles();
  allValues.push(...curated);
  console.log(`  → ${curated.length} puzzles\n`);

  // Source 2: LSAT-AR (target 200)
  console.log('[2/3] LSAT-AR');
  const lsat = loadLsatAr(200);
  allValues.push(...lsat);
  console.log(`  → ${lsat.length} puzzles\n`);

  // Source 3: LogicBench MCQA
  console.log('[3/3] LogicBench');
  const logicbench = loadLogicBench();
  allValues.push(...logicbench);
  console.log(`  → ${logicbench.length} puzzles\n`);

  // Summary
  console.log('─── Summary ───');
  console.log(`  Curated:        ${curated.length}`);
  console.log(`  LSAT-AR:        ${lsat.length}`);
  console.log(`  LogicBench:     ${logicbench.length}`);
  console.log(`  Total:          ${allValues.length}`);

  if (allValues.length === 0) {
    console.log('\nNo puzzles to insert. Exiting.');
    return;
  }

  // Batch insert
  console.log(`\nInserting ${allValues.length} puzzles in batches of ${BATCH_SIZE}...`);

  let inserted = 0;
  for (let i = 0; i < allValues.length; i += BATCH_SIZE) {
    const batch = allValues.slice(i, i + BATCH_SIZE);
    await db.insert(puzzles).values(batch);
    inserted += batch.length;
    console.log(`  Inserted ${inserted}/${allValues.length}`);
  }

  console.log(`\nSeed complete! ${inserted} interview-grade puzzles inserted.`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
