/**
 * Seed script: Insert puzzles from ALL categories into the database.
 *
 * Categories seeded:
 *   1. Futoshiki      – 200 (reasoning-gym JSON)
 *   2. Takuzu/Binary  – 200 (reasoning-gym JSON)
 *   3. Kakurasu       – 200 (reasoning-gym JSON)
 *   4. Knights&Knaves – 300 (JSONL, mixed people2–8)
 *   5. Zebra/Einstein – 200 (reasoning-gym JSON)
 *   6. Number Seqs    – 300 (reasoning-gym JSON)
 *   7. ARC-AGI        – 200 (individual JSON task files)
 *   8. BrainTeasers   – 200 (JSONL)
 *
 * Usage: npx tsx scripts/seed-all.ts
 */

import { readFileSync, readdirSync, createReadStream } from 'fs';
import { createInterface } from 'readline';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { puzzles } from '../src/lib/db/schema';
import * as dotenv from 'dotenv';
import path from 'path';

// ── Env ──────────────────────────────────────────────────────────────────────

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set. Add it to .env.local');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

// ── Paths ────────────────────────────────────────────────────────────────────

const DATA_ROOT = path.resolve(__dirname, '../../data');
const BATCH_SIZE = 100;

// ── Shared helpers ───────────────────────────────────────────────────────────

type PuzzleInsert = typeof puzzles.$inferInsert;

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

/** Evenly distribute items across difficulty 1-5. */
function spreadDifficulty(index: number, total: number): number {
  const bucket = Math.floor((index / total) * 5);
  return Math.min(bucket + 1, 5);
}

/** Read and parse a JSON file (array). */
function readJsonArray<T = unknown>(relPath: string): T[] {
  const fullPath = path.join(DATA_ROOT, relPath);
  const raw = readFileSync(fullPath, 'utf-8');
  return JSON.parse(raw) as T[];
}

/** Read lines from a JSONL file. */
async function readJsonl<T = unknown>(relPath: string): Promise<T[]> {
  const fullPath = path.join(DATA_ROOT, relPath);
  const results: T[] = [];
  const rl = createInterface({
    input: createReadStream(fullPath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed) results.push(JSON.parse(trimmed) as T);
  }
  return results;
}

/** Batch-insert puzzle rows in chunks. */
async function batchInsert(rows: PuzzleInsert[], label: string): Promise<number> {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db.insert(puzzles).values(batch);
    inserted += batch.length;
    console.log(`  [${label}] Inserted ${inserted}/${rows.length}`);
  }
  return inserted;
}

// ── CSV parser (handles quoted fields with commas) ───────────────────────────

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. FUTOSHIKI
// ═══════════════════════════════════════════════════════════════════════════════

interface FutoshikiRG {
  id: number;
  question: string;
  answer: string;
  metadata: {
    source_dataset: string;
    source_index: number;
    puzzle: number[][];
    constraints: (number | string)[][];
    solution: number[][];
  };
}

function seedFutoshiki(): PuzzleInsert[] {
  console.log('\n── Futoshiki ──');
  const data = readJsonArray<FutoshikiRG>('structured-grid/futoshiki/futoshiki_rg_500.json');
  const selected = data.slice(0, 200);
  console.log(`  Loaded ${data.length}, selecting ${selected.length}`);

  return selected.map((item, idx) => {
    // Difficulty based on number of constraints (fewer = harder)
    const numConstraints = item.metadata.constraints?.length ?? 0;
    const numBlanks = item.metadata.puzzle.flat().filter(v => v === 0).length;
    let difficulty: number;
    if (numBlanks <= 30) difficulty = 1;
    else if (numBlanks <= 45) difficulty = 2;
    else if (numBlanks <= 55) difficulty = 3;
    else if (numBlanks <= 65) difficulty = 4;
    else difficulty = 5;

    return {
      type: 'futoshiki' as const,
      category: 'structured_grid' as const,
      difficulty,
      title: `Futoshiki #${idx + 1}`,
      description: `A ${difficultyLabel(difficulty)} 9x9 Futoshiki puzzle with ${numConstraints} inequality constraints and ${numBlanks} blanks.`,
      config: {
        gridSize: 9,
        numConstraints,
        numBlanks,
      },
      initialState: {
        puzzle: item.metadata.puzzle,
        constraints: item.metadata.constraints,
        questionText: item.question,
      },
      solution: {
        grid: item.metadata.solution,
        answerText: item.answer,
      },
      hints: [
        'Start by filling in rows or columns with the fewest blanks.',
        'Use the inequality constraints to narrow down possible values.',
        'Each row and column must contain 1-9 exactly once, just like Sudoku.',
      ],
      estimatedTimeSeconds: [300, 480, 720, 1200, 1500][difficulty - 1],
      skillTags: ['logical_reasoning', 'constraint_satisfaction'],
      source: 'reasoning-gym-futoshiki',
      isActive: true,
      playCount: 0,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. TAKUZU / BINARY ALTERNATION
// ═══════════════════════════════════════════════════════════════════════════════

interface TakuzuRG {
  id: number;
  question: string;
  answer: string;
  metadata: {
    source_dataset: string;
    source_index: number;
    string: string;
    solution: number;
    solvable: boolean;
    n: number;
    difficulty: { n: number[] };
  };
}

function seedTakuzu(): PuzzleInsert[] {
  console.log('\n── Takuzu / Binary Alternation ──');
  const data = readJsonArray<TakuzuRG>('structured-grid/takuzu/takuzu_500.json');
  const selected = data.slice(0, 200);
  console.log(`  Loaded ${data.length}, selecting ${selected.length}`);

  return selected.map((item, idx) => {
    // Difficulty based on string length
    const n = item.metadata.n;
    let difficulty: number;
    if (n <= 12) difficulty = 1;
    else if (n <= 16) difficulty = 2;
    else if (n <= 22) difficulty = 3;
    else if (n <= 28) difficulty = 4;
    else difficulty = 5;

    return {
      type: 'takuzu' as const,
      category: 'structured_grid' as const,
      difficulty,
      title: `Binary Puzzle #${idx + 1}`,
      description: `Find the minimum swaps to make a ${n}-character binary string alternating.`,
      config: {
        stringLength: n,
        solvable: item.metadata.solvable,
      },
      initialState: {
        binaryString: item.metadata.string,
        questionText: item.question,
      },
      solution: {
        minSwaps: item.metadata.solution,
        answerText: item.answer,
      },
      hints: [
        'Count the number of 0s and 1s. An alternating string of even length needs equal counts.',
        'Try building the two possible alternating patterns and compare with the original.',
        'The answer is the minimum mismatches divided by 2.',
      ],
      estimatedTimeSeconds: [120, 180, 300, 420, 600][difficulty - 1],
      skillTags: ['pattern_recognition', 'mathematical_reasoning'],
      source: 'reasoning-gym-binary-alternation',
      isActive: true,
      playCount: 0,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. KAKURASU
// ═══════════════════════════════════════════════════════════════════════════════

interface KakurasuRG {
  id: number;
  question: string;
  answer: string;
  metadata: {
    source_dataset: string;
    source_idx: number;
    n_rows: number;
    n_cols: number;
    p_ones: number;
    puzzle: number[][];
    row_sums: number[];
    col_sums: number[];
    solution: number[][];
  };
}

function seedKakurasu(): PuzzleInsert[] {
  console.log('\n── Kakurasu ──');
  const data = readJsonArray<KakurasuRG>('structured-grid/kakuro/kakurasu_500.json');
  const selected = data.slice(0, 200);
  console.log(`  Loaded ${data.length}, selecting ${selected.length}`);

  return selected.map((item, idx) => {
    const gridSize = item.metadata.n_rows;
    let difficulty: number;
    if (gridSize <= 4) difficulty = 1;
    else if (gridSize <= 5) difficulty = 2;
    else if (gridSize <= 6) difficulty = 3;
    else if (gridSize <= 7) difficulty = 4;
    else difficulty = 5;

    // Use spread if all same size
    if (idx > 0) {
      difficulty = spreadDifficulty(idx, selected.length);
    }

    return {
      type: 'kakurasu' as const,
      category: 'structured_grid' as const,
      difficulty,
      title: `Kakurasu #${idx + 1}`,
      description: `A ${difficultyLabel(difficulty)} ${gridSize}x${item.metadata.n_cols} Kakurasu puzzle. Place 1s so weighted sums match constraints.`,
      config: {
        nRows: item.metadata.n_rows,
        nCols: item.metadata.n_cols,
        pOnes: item.metadata.p_ones,
      },
      initialState: {
        grid: item.metadata.puzzle,
        rowSums: item.metadata.row_sums,
        colSums: item.metadata.col_sums,
        questionText: item.question,
      },
      solution: {
        grid: item.metadata.solution,
        answerText: item.answer,
      },
      hints: [
        'Each cell is either 0 or 1. A 1 in column j contributes j points to that row.',
        'Start with rows or columns whose target sum can only be formed one way.',
        'If a row sum equals the total of all column positions, every cell must be 1.',
      ],
      estimatedTimeSeconds: [180, 300, 480, 600, 900][difficulty - 1],
      skillTags: ['logical_reasoning', 'constraint_satisfaction', 'arithmetic'],
      source: 'reasoning-gym-kakurasu',
      isActive: true,
      playCount: 0,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. KNIGHTS & KNAVES
// ═══════════════════════════════════════════════════════════════════════════════

interface KnightsKnavesRow {
  quiz: string;
  names: string[];
  knight_knave: Record<string, string>;
  solution: boolean[];
  solution_text: string;
  solution_text_format: string;
  cot_head: string;
  cot_repeat_steps: string[];
  cot_foot: string;
  statements: string;
  index: number;
}

async function seedKnightsKnaves(): Promise<PuzzleInsert[]> {
  console.log('\n── Knights & Knaves ──');

  // Files map: people count -> file path
  const files: { people: number; file: string }[] = [
    { people: 2, file: 'logical-deduction/knights-and-knaves/hf-raw/train/people2_num200.jsonl' },
    { people: 3, file: 'logical-deduction/knights-and-knaves/hf-raw/train/people3_num1000.jsonl' },
    { people: 4, file: 'logical-deduction/knights-and-knaves/hf-raw/train/people4_num1000.jsonl' },
    { people: 5, file: 'logical-deduction/knights-and-knaves/hf-raw/train/people5_num1000.jsonl' },
    { people: 6, file: 'logical-deduction/knights-and-knaves/hf-raw/train/people6_num1000.jsonl' },
    { people: 7, file: 'logical-deduction/knights-and-knaves/hf-raw/train/people7_num1000.jsonl' },
    { people: 8, file: 'logical-deduction/knights-and-knaves/hf-raw/train/people8_num1000.jsonl' },
  ];

  // Sample from each difficulty level to get ~300 total
  // people2: 30, people3: 40, people4: 40, people5: 40, people6: 50, people7: 50, people8: 50
  const sampleCounts: Record<number, number> = {
    2: 30,
    3: 40,
    4: 40,
    5: 40,
    6: 50,
    7: 50,
    8: 50,
  };

  const difficultyMap: Record<number, number> = {
    2: 1, // Easy
    3: 2, // Medium
    4: 2, // Medium
    5: 3, // Hard
    6: 3, // Hard
    7: 4, // Expert
    8: 5, // Master
  };

  const allRows: PuzzleInsert[] = [];
  let globalIdx = 0;

  for (const { people, file } of files) {
    const data = await readJsonl<KnightsKnavesRow>(file);
    const count = Math.min(sampleCounts[people] ?? 30, data.length);
    const selected = data.slice(0, count);
    console.log(`  people${people}: loaded ${data.length}, selecting ${count}`);

    for (const item of selected) {
      globalIdx++;
      const difficulty = difficultyMap[people] ?? 3;

      const solutionMap: Record<string, string> = {};
      item.names.forEach((name, i) => {
        solutionMap[name] = item.solution[i] ? 'knight' : 'knave';
      });

      allRows.push({
        type: 'knights_knaves' as const,
        category: 'logical_deduction' as const,
        difficulty,
        title: `Knights & Knaves #${globalIdx}`,
        description: `A ${difficultyLabel(difficulty)} logic puzzle with ${people} inhabitants. Determine who is a knight (truth-teller) and who is a knave (liar).`,
        config: {
          numPeople: people,
          names: item.names,
        },
        initialState: {
          puzzleText: item.quiz,
          names: item.names,
        },
        solution: {
          assignments: solutionMap,
          solutionText: item.solution_text,
          solutionFormatted: item.solution_text_format,
          reasoning: [item.cot_head, ...item.cot_repeat_steps, item.cot_foot],
        },
        hints: [
          'Start by assuming one person is a knight, then check if their statement is consistent.',
          'If assuming someone is a knight leads to a contradiction, they must be a knave.',
          `There are ${people} people — try to find a statement that directly reveals someone's identity.`,
        ],
        estimatedTimeSeconds: [120, 240, 420, 600, 900][difficulty - 1],
        skillTags: ['logical_reasoning', 'deductive_reasoning', 'boolean_logic'],
        source: 'knights-knaves-hf',
        isActive: true,
        playCount: 0,
      });
    }
  }

  return allRows;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. ZEBRA / EINSTEIN
// ═══════════════════════════════════════════════════════════════════════════════

interface ZebraRG {
  id: number;
  question: string;
  answer: string;
  metadata: {
    source_dataset: string;
    source_index: number;
    difficulty: {
      num_people: number;
      num_characteristics: number;
    };
  };
}

function seedZebra(): PuzzleInsert[] {
  console.log('\n── Zebra / Einstein ──');
  const data = readJsonArray<ZebraRG>('logical-deduction/zebra/zebra_rg_500.json');
  const selected = data.slice(0, 200);
  console.log(`  Loaded ${data.length}, selecting ${selected.length}`);

  return selected.map((item, idx) => {
    const numPeople = item.metadata.difficulty?.num_people ?? 4;
    const numChars = item.metadata.difficulty?.num_characteristics ?? 4;
    let difficulty: number;
    if (numPeople <= 3) difficulty = 1;
    else if (numPeople <= 4 && numChars <= 4) difficulty = 2;
    else if (numPeople <= 4) difficulty = 3;
    else if (numPeople <= 5) difficulty = 4;
    else difficulty = 5;

    return {
      type: 'zebra' as const,
      category: 'logical_deduction' as const,
      difficulty,
      title: `Zebra Puzzle #${idx + 1}`,
      description: `A ${difficultyLabel(difficulty)} logic puzzle with ${numPeople} houses and ${numChars} characteristics each.`,
      config: {
        numPeople,
        numCharacteristics: numChars,
      },
      initialState: {
        puzzleText: item.question,
      },
      solution: {
        answerText: item.answer,
      },
      hints: [
        'Create a grid with houses as columns and categories as rows.',
        'Start with clues that directly place something in a specific house.',
        'Use elimination: once you place an item, remove it from all other houses.',
        'Pay attention to "directly left of" — it means adjacent, not just anywhere to the left.',
      ],
      estimatedTimeSeconds: [300, 480, 720, 1200, 1800][difficulty - 1],
      skillTags: ['logical_reasoning', 'deductive_reasoning', 'constraint_satisfaction'],
      source: 'reasoning-gym-zebra',
      isActive: true,
      playCount: 0,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. NUMBER SEQUENCES
// ═══════════════════════════════════════════════════════════════════════════════

interface SequenceRG {
  id: number;
  question: string;
  answer: string;
  metadata: {
    source_dataset: string;
    source_index: number;
    rule: string;
    complexity: number;
    sequence: number[];
    difficulty: {
      max_complexity: number;
      terms: number[];
    };
  };
}

function seedNumberSequences(): PuzzleInsert[] {
  console.log('\n── Number Sequences ──');
  const data = readJsonArray<SequenceRG>('pattern-recognition/number-sequences/sequences_rg_500.json');
  const selected = data.slice(0, 300);
  console.log(`  Loaded ${data.length}, selecting ${selected.length}`);

  return selected.map((item, idx) => {
    const complexity = item.metadata.complexity ?? 1;
    let difficulty: number;
    if (complexity <= 1) difficulty = 1;
    else if (complexity <= 2) difficulty = 2;
    else if (complexity <= 3) difficulty = 3;
    else if (complexity <= 4) difficulty = 4;
    else difficulty = 5;

    return {
      type: 'number_sequences' as const,
      category: 'pattern_recognition' as const,
      difficulty,
      title: `Sequence #${idx + 1}`,
      description: `Find the next number in the sequence. Rule complexity: ${complexity}.`,
      config: {
        rule: item.metadata.rule,
        complexity,
        sequenceLength: item.metadata.sequence.length,
      },
      initialState: {
        sequenceText: item.question,
        visibleTerms: item.metadata.sequence.slice(0, -1),
      },
      solution: {
        nextTerm: Number(item.answer),
        fullSequence: item.metadata.sequence,
        rule: item.metadata.rule,
      },
      hints: [
        'Look at the differences between consecutive terms.',
        'Check if the sequence involves multiplication or division.',
        `The rule involves: ${item.metadata.rule.split(' ')[0]}...`,
      ],
      estimatedTimeSeconds: [60, 120, 240, 360, 480][difficulty - 1],
      skillTags: ['pattern_recognition', 'mathematical_reasoning', 'arithmetic'],
      source: 'reasoning-gym-sequences',
      isActive: true,
      playCount: 0,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. ARC-AGI
// ═══════════════════════════════════════════════════════════════════════════════

interface ArcTask {
  train: { input: number[][]; output: number[][] }[];
  test: { input: number[][]; output: number[][] }[];
}

function seedArcAgi(): PuzzleInsert[] {
  console.log('\n── ARC-AGI ──');
  const dir = path.join(DATA_ROOT, 'pattern-recognition/arc-agi/data/training');
  const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  const selected = files.slice(0, 200);
  console.log(`  Found ${files.length} task files, selecting ${selected.length}`);

  return selected.map((file, idx) => {
    const taskId = file.replace('.json', '');
    const raw = readFileSync(path.join(dir, file), 'utf-8');
    const task: ArcTask = JSON.parse(raw);

    // Difficulty based on grid complexity
    const testInput = task.test[0]?.input ?? [];
    const trainExamples = task.train.length;
    const gridSize = testInput.length * (testInput[0]?.length ?? 0);

    let difficulty: number;
    if (gridSize <= 25 && trainExamples >= 4) difficulty = 1;
    else if (gridSize <= 50) difficulty = 2;
    else if (gridSize <= 100) difficulty = 3;
    else if (gridSize <= 200) difficulty = 4;
    else difficulty = 5;

    return {
      type: 'arc_agi' as const,
      category: 'pattern_recognition' as const,
      difficulty,
      title: `ARC Task #${idx + 1}`,
      description: `An ARC-AGI visual pattern task (${taskId}) with ${trainExamples} training examples. Discover the transformation rule and apply it.`,
      config: {
        taskId,
        numTrainExamples: trainExamples,
        numTestCases: task.test.length,
        testInputSize: { rows: testInput.length, cols: testInput[0]?.length ?? 0 },
      },
      initialState: {
        trainPairs: task.train,
        testInput: task.test.map(t => t.input),
      },
      solution: {
        testOutput: task.test.map(t => t.output),
      },
      hints: [
        'Study all training examples carefully — the same rule applies to each.',
        'Look for patterns in color changes, shape movements, or symmetry.',
        'Try to describe the transformation in words before applying it.',
        'Compare input and output sizes — does the grid grow, shrink, or stay the same?',
      ],
      estimatedTimeSeconds: [300, 480, 720, 1200, 1800][difficulty - 1],
      skillTags: ['pattern_recognition', 'spatial_reasoning', 'abstract_reasoning'],
      source: 'arc-agi-training',
      isActive: true,
      playCount: 0,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. BRAINTEASERS
// ═══════════════════════════════════════════════════════════════════════════════

interface BrainTeaserRow {
  id: string;
  question: {
    stem: string;
    choices: { label: string; text: string }[];
  };
  answerKey: string;
}

async function seedBrainteasers(): Promise<PuzzleInsert[]> {
  console.log('\n── BrainTeasers ──');
  const data = await readJsonl<BrainTeaserRow>('riddles/brainteasers/data/rs_train.jsonl');
  const selected = data.slice(0, 200);
  console.log(`  Loaded ${data.length}, selecting ${selected.length}`);

  return selected.map((item, idx) => {
    const difficulty = spreadDifficulty(idx, selected.length);
    const correctChoice = item.question.choices.find(c => c.label === item.answerKey);
    const correctAnswer = correctChoice?.text ?? item.answerKey;

    return {
      type: 'brainteaser' as const,
      category: 'riddles_verbal' as const,
      difficulty,
      title: `BrainTeaser #${idx + 1}`,
      description: `A ${difficultyLabel(difficulty)} multiple-choice brain teaser.`,
      config: {
        format: 'multiple_choice',
        numChoices: item.question.choices.length,
      },
      initialState: {
        questionText: item.question.stem,
        choices: item.question.choices,
      },
      solution: {
        answerKey: item.answerKey,
        answerText: correctAnswer,
      },
      hints: [
        'Read the question carefully — brain teasers often play with words.',
        'Consider non-obvious or metaphorical interpretations.',
      ],
      estimatedTimeSeconds: [60, 90, 120, 180, 240][difficulty - 1],
      skillTags: ['lateral_thinking', 'verbal_reasoning', 'wordplay'],
      source: 'brainteasers-rs-train',
      isActive: true,
      playCount: 0,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('=== ITHINK Puzzle Seeder – All Categories ===');
  console.log(`Data root: ${DATA_ROOT}`);

  let totalInserted = 0;

  // 1. Futoshiki (sync)
  const futoshikiRows = seedFutoshiki();
  totalInserted += await batchInsert(futoshikiRows, 'Futoshiki');

  // 2. Takuzu (sync)
  const takuzuRows = seedTakuzu();
  totalInserted += await batchInsert(takuzuRows, 'Takuzu');

  // 3. Kakurasu (sync)
  const kakurasuRows = seedKakurasu();
  totalInserted += await batchInsert(kakurasuRows, 'Kakurasu');

  // 4. Knights & Knaves (async — JSONL)
  const kkRows = await seedKnightsKnaves();
  totalInserted += await batchInsert(kkRows, 'Knights & Knaves');

  // 5. Zebra (sync)
  const zebraRows = seedZebra();
  totalInserted += await batchInsert(zebraRows, 'Zebra');

  // 6. Number Sequences (sync)
  const seqRows = seedNumberSequences();
  totalInserted += await batchInsert(seqRows, 'Number Sequences');

  // 7. ARC-AGI (sync)
  const arcRows = seedArcAgi();
  totalInserted += await batchInsert(arcRows, 'ARC-AGI');

  // 8. BrainTeasers (async — JSONL)
  const btRows = await seedBrainteasers();
  totalInserted += await batchInsert(btRows, 'BrainTeasers');

  console.log(`\n=== SEED COMPLETE ===`);
  console.log(`Total puzzles inserted: ${totalInserted}`);
  console.log(`  Futoshiki:        ${futoshikiRows.length}`);
  console.log(`  Takuzu:           ${takuzuRows.length}`);
  console.log(`  Kakurasu:         ${kakurasuRows.length}`);
  console.log(`  Knights & Knaves: ${kkRows.length}`);
  console.log(`  Zebra:            ${zebraRows.length}`);
  console.log(`  Number Sequences: ${seqRows.length}`);
  console.log(`  ARC-AGI:          ${arcRows.length}`);
  console.log(`  BrainTeasers:     ${btRows.length}`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
