// ─── Puzzle Engine Type System ───────────────────────────────────────────────
// Defines the complete interface contract for all puzzle engines in ITHINK.
// Every engine (Sudoku, logic grids, pattern puzzles, etc.) implements
// PuzzleEngine<TState, TAction> so the UI and scoring layers stay generic.

// ─── Category & Difficulty ──────────────────────────────────────────────────

export const PUZZLE_CATEGORIES = [
  'structured_grid',
  'logical_deduction',
  'pattern_recognition',
  'scenario_decision',
  'riddles_verbal',
] as const;

export type PuzzleCategory = (typeof PUZZLE_CATEGORIES)[number];

export const DIFFICULTY_LEVELS = [1, 2, 3, 4, 5] as const;

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

// ─── Skill Dimensions ───────────────────────────────────────────────────────

export const SKILL_DIMENSIONS = [
  'logical_reasoning',
  'pattern_recognition',
  'speed',
  'accuracy',
  'decision_making',
] as const;

export type SkillDimension = (typeof SKILL_DIMENSIONS)[number];

// ─── Puzzle Definition ──────────────────────────────────────────────────────
// The static description of a puzzle. `TConfig` is engine-specific
// (e.g. an 81-char Sudoku string, a grid template, etc.).

export interface PuzzleMetadata {
  readonly estimatedTimeSeconds: number;
  readonly skillTags: readonly SkillDimension[];
  readonly hints: readonly string[];
}

export interface PuzzleDefinition<TConfig = unknown> {
  readonly id: string;
  readonly category: PuzzleCategory;
  /** Engine-specific sub-type, e.g. "sudoku_9x9", "kakuro", "nonogram" */
  readonly type: string;
  readonly difficulty: DifficultyLevel;
  readonly config: TConfig;
  readonly initialState: string;
  readonly solution: string;
  readonly metadata: PuzzleMetadata;
}

// ─── Validation & Completion ────────────────────────────────────────────────

export interface ValidationError {
  readonly field: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
}

export interface CompletionResult {
  readonly complete: boolean;
  readonly correct: boolean;
  /** 0–100 normalized score reflecting quality of the solve */
  readonly score: number;
}

// ─── Hints ──────────────────────────────────────────────────────────────────

export const HINT_TYPES = ['nudge', 'reveal_candidate', 'reveal_cell'] as const;

export type HintType = (typeof HINT_TYPES)[number];

export interface CellReference {
  readonly row: number;
  readonly col: number;
}

export interface HintResult {
  readonly hint: string;
  readonly cell: CellReference | null;
  readonly type: HintType;
}

// ─── Action Metadata ────────────────────────────────────────────────────────

export interface ActionMetadata {
  readonly actionType: string;
  readonly isCorrect: boolean;
  readonly difficulty: DifficultyLevel;
}

// ─── PuzzleEngine Interface ─────────────────────────────────────────────────
// The generic contract every engine must satisfy.
// TState = engine-specific mutable game state
// TAction = the discriminated union of user actions

export interface PuzzleEngine<TState, TAction> {
  /** Unique identifier for this engine instance */
  readonly engineId: string;

  /** Which top-level category this engine belongs to */
  readonly category: PuzzleCategory;

  /** The `type` strings this engine can handle (e.g. ["sudoku_9x9"]) */
  readonly supportedTypes: readonly string[];

  /** Derive the initial interactive state from a puzzle definition */
  getInitialState(definition: PuzzleDefinition): TState;

  /** Apply a user action and return the new state (immutable) */
  applyAction(state: TState, action: TAction): TState;

  /** Undo the most recent undoable action */
  undoAction(state: TState): TState;

  /** Check whether an action is valid in the current state */
  validateAction(state: TState, action: TAction): ValidationResult;

  /** Check whether the puzzle is fully and correctly completed */
  validateComplete(state: TState): CompletionResult;

  /**
   * Produce a hint at the given level (1 = subtle nudge, 3 = reveal answer).
   * Returns null if no hint is available.
   */
  getHint(state: TState, hintLevel: 1 | 2 | 3): HintResult | null;

  /** Return metadata about a particular action for analytics / scoring */
  getActionMetadata(state: TState, action: TAction): ActionMetadata;
}
