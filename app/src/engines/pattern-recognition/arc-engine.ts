// ─── ARC-AGI Engine ─────────────────────────────────────────────────────────
// PuzzleEngine implementation for ARC-AGI (Abstraction and Reasoning Corpus)
// puzzles.  The user studies training input→output grid pairs, then predicts
// the output for a test input grid by painting cells with colors 0–9.

import type {
  ActionMetadata,
  CompletionResult,
  DifficultyLevel,
  HintResult,
  PuzzleDefinition,
  PuzzleEngine,
  ValidationResult,
} from '../types';

// ─── ARC-Specific Types ────────────────────────────────────────────────────

export interface ArcTrainingPair {
  readonly input: readonly (readonly number[])[];
  readonly output: readonly (readonly number[])[];
}

export interface ArcPuzzleConfig {
  readonly train: readonly ArcTrainingPair[];
  readonly test: {
    readonly input: readonly (readonly number[])[];
  };
}

export type ArcAction =
  | {
      readonly type: 'paint_cell';
      readonly row: number;
      readonly col: number;
      readonly color: number;
    }
  | { readonly type: 'resize'; readonly rows: number; readonly cols: number }
  | { readonly type: 'clear' }
  | { readonly type: 'submit' };

export interface ArcState {
  /** Training examples for pattern discovery */
  readonly trainPairs: readonly ArcTrainingPair[];
  /** The test input grid the user must analyze */
  readonly testInput: readonly (readonly number[])[];
  /** The expected test output grid (the solution) */
  readonly solutionGrid: readonly (readonly number[])[];
  /** The user's current output grid */
  readonly userGrid: number[][];
  /** Whether the user has submitted their answer */
  readonly submitted: boolean;
  /** Action history for undo support */
  readonly history: readonly ArcAction[];
  /** Number of incorrect submissions */
  readonly mistakes: number;
  /** Number of hints used */
  readonly hintsUsed: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Create a grid of given dimensions filled with 0 (black) */
function createEmptyGrid(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
}

/** Deep clone a 2D number grid */
function cloneGrid(grid: readonly (readonly number[])[]): number[][] {
  return grid.map((row) => [...row]);
}

/** Compare two 2D grids for equality */
function gridsEqual(
  a: readonly (readonly number[])[],
  b: readonly (readonly number[])[],
): boolean {
  if (a.length !== b.length) return false;
  for (let r = 0; r < a.length; r++) {
    if (a[r]!.length !== b[r]!.length) return false;
    for (let c = 0; c < a[r]!.length; c++) {
      if (a[r]![c] !== b[r]![c]) return false;
    }
  }
  return true;
}

/** Count the number of cells that differ between two same-sized grids */
function countDifferences(
  a: readonly (readonly number[])[],
  b: readonly (readonly number[])[],
): number {
  let diffs = 0;
  const rows = Math.min(a.length, b.length);
  for (let r = 0; r < rows; r++) {
    const cols = Math.min(a[r]!.length, b[r]!.length);
    for (let c = 0; c < cols; c++) {
      if (a[r]![c] !== b[r]![c]) diffs++;
    }
  }
  // Also count dimension mismatches as differences
  if (a.length !== b.length || (a[0]?.length ?? 0) !== (b[0]?.length ?? 0)) {
    const totalA = a.length * (a[0]?.length ?? 0);
    const totalB = b.length * (b[0]?.length ?? 0);
    diffs += Math.abs(totalA - totalB);
  }
  return diffs;
}

/** Parse the ARC puzzle config from the initialState JSON */
function parseArcConfig(initialState: string): ArcPuzzleConfig {
  return JSON.parse(initialState) as ArcPuzzleConfig;
}

/** Parse the solution grid from the solution JSON */
function parseSolutionGrid(solution: string): number[][] {
  return JSON.parse(solution) as number[][];
}

// ─── Engine Implementation ──────────────────────────────────────────────────

export class ArcEngine implements PuzzleEngine<ArcState, ArcAction> {
  readonly engineId = 'arc_agi';
  readonly category = 'pattern_recognition' as const;
  readonly supportedTypes = ['arc_agi'] as const;

  getInitialState(definition: PuzzleDefinition): ArcState {
    const config = parseArcConfig(definition.initialState);
    const solutionGrid = parseSolutionGrid(definition.solution);

    // Initialize user grid to same dimensions as solution (or a reasonable default)
    const rows = solutionGrid.length;
    const cols = solutionGrid[0]?.length ?? 1;

    return {
      trainPairs: config.train,
      testInput: config.test.input,
      solutionGrid,
      userGrid: createEmptyGrid(rows, cols),
      submitted: false,
      history: [],
      mistakes: 0,
      hintsUsed: 0,
    };
  }

  applyAction(state: ArcState, action: ArcAction): ArcState {
    switch (action.type) {
      case 'paint_cell': {
        if (state.submitted) return state;

        const { row, col, color } = action;
        if (row < 0 || row >= state.userGrid.length) return state;
        if (col < 0 || col >= (state.userGrid[0]?.length ?? 0)) return state;

        const newGrid = cloneGrid(state.userGrid);
        newGrid[row]![col] = color;

        return {
          ...state,
          userGrid: newGrid,
          history: [...state.history, action],
        };
      }

      case 'resize': {
        if (state.submitted) return state;

        const { rows, cols } = action;
        if (rows < 1 || rows > 30 || cols < 1 || cols > 30) return state;

        // Create new grid, preserving existing data where dimensions overlap
        const newGrid = createEmptyGrid(rows, cols);
        const copyRows = Math.min(rows, state.userGrid.length);
        const copyCols = Math.min(cols, state.userGrid[0]?.length ?? 0);
        for (let r = 0; r < copyRows; r++) {
          for (let c = 0; c < copyCols; c++) {
            newGrid[r]![c] = state.userGrid[r]![c]!;
          }
        }

        return {
          ...state,
          userGrid: newGrid,
          history: [...state.history, action],
        };
      }

      case 'clear': {
        if (state.submitted) return state;

        const rows = state.userGrid.length;
        const cols = state.userGrid[0]?.length ?? 1;

        return {
          ...state,
          userGrid: createEmptyGrid(rows, cols),
          history: [...state.history, action],
        };
      }

      case 'submit': {
        if (state.submitted) return state;

        const isCorrect = gridsEqual(state.userGrid, state.solutionGrid);
        return {
          ...state,
          submitted: true,
          mistakes: isCorrect ? state.mistakes : state.mistakes + 1,
          history: [...state.history, action],
        };
      }

      default: {
        const _exhaustive: never = action;
        throw new Error(`Unhandled action type: ${JSON.stringify(_exhaustive)}`);
      }
    }
  }

  undoAction(state: ArcState): ArcState {
    if (state.history.length === 0) return state;

    const history = [...state.history];
    const lastAction = history.pop()!;

    // If undoing submit, just unset the submitted flag
    if (lastAction.type === 'submit') {
      return { ...state, submitted: false, history };
    }

    // Replay all remaining actions from a clean state to rebuild the grid
    const rows = state.solutionGrid.length;
    const cols = state.solutionGrid[0]?.length ?? 1;
    let userGrid = createEmptyGrid(rows, cols);

    for (const action of history) {
      switch (action.type) {
        case 'paint_cell': {
          if (action.row >= 0 && action.row < userGrid.length &&
              action.col >= 0 && action.col < (userGrid[0]?.length ?? 0)) {
            userGrid[action.row]![action.col] = action.color;
          }
          break;
        }
        case 'resize': {
          const newGrid = createEmptyGrid(action.rows, action.cols);
          const copyRows = Math.min(action.rows, userGrid.length);
          const copyCols = Math.min(action.cols, userGrid[0]?.length ?? 0);
          for (let r = 0; r < copyRows; r++) {
            for (let c = 0; c < copyCols; c++) {
              newGrid[r]![c] = userGrid[r]![c]!;
            }
          }
          userGrid = newGrid;
          break;
        }
        case 'clear': {
          const r = userGrid.length;
          const c = userGrid[0]?.length ?? 1;
          userGrid = createEmptyGrid(r, c);
          break;
        }
        case 'submit':
          break;
      }
    }

    return {
      ...state,
      userGrid,
      history,
    };
  }

  validateAction(state: ArcState, action: ArcAction): ValidationResult {
    const errors: { field: string; message: string }[] = [];

    switch (action.type) {
      case 'paint_cell': {
        if (state.submitted) {
          errors.push({ field: 'state', message: 'Cannot paint after submission' });
        }
        if (action.color < 0 || action.color > 9) {
          errors.push({ field: 'color', message: 'Color must be 0–9' });
        }
        if (action.row < 0 || action.row >= state.userGrid.length) {
          errors.push({ field: 'row', message: 'Row out of bounds' });
        }
        if (action.col < 0 || action.col >= (state.userGrid[0]?.length ?? 0)) {
          errors.push({ field: 'col', message: 'Column out of bounds' });
        }
        break;
      }
      case 'resize': {
        if (state.submitted) {
          errors.push({ field: 'state', message: 'Cannot resize after submission' });
        }
        if (action.rows < 1 || action.rows > 30) {
          errors.push({ field: 'rows', message: 'Rows must be 1–30' });
        }
        if (action.cols < 1 || action.cols > 30) {
          errors.push({ field: 'cols', message: 'Columns must be 1–30' });
        }
        break;
      }
      case 'clear': {
        if (state.submitted) {
          errors.push({ field: 'state', message: 'Cannot clear after submission' });
        }
        break;
      }
      case 'submit': {
        if (state.submitted) {
          errors.push({ field: 'state', message: 'Already submitted' });
        }
        break;
      }
    }

    return { valid: errors.length === 0, errors };
  }

  validateComplete(state: ArcState): CompletionResult {
    if (!state.submitted) {
      return { complete: false, correct: false, score: 0 };
    }

    const correct = gridsEqual(state.userGrid, state.solutionGrid);

    // Score: start at 100, deduct for mistakes and hints
    const mistakePenalty = state.mistakes * 20;
    const hintPenalty = state.hintsUsed * 15;
    const score = correct ? Math.max(0, 100 - mistakePenalty - hintPenalty) : 0;

    return { complete: true, correct, score };
  }

  getHint(state: ArcState, hintLevel: 1 | 2 | 3): HintResult | null {
    switch (hintLevel) {
      case 1: {
        // General nudge — look at dimensions
        const solRows = state.solutionGrid.length;
        const solCols = state.solutionGrid[0]?.length ?? 0;
        const userRows = state.userGrid.length;
        const userCols = state.userGrid[0]?.length ?? 0;

        if (userRows !== solRows || userCols !== solCols) {
          return {
            hint: `Your output grid dimensions (${userRows}x${userCols}) may not be correct. Study the training examples to determine the expected output size.`,
            cell: null,
            type: 'nudge',
          };
        }

        return {
          hint: 'Study the transformation pattern in each training example. What operation converts the input to the output? Apply that same rule to the test input.',
          cell: null,
          type: 'nudge',
        };
      }

      case 2: {
        // Reveal how many cells differ
        const diffs = countDifferences(state.userGrid, state.solutionGrid);
        const total = state.solutionGrid.length * (state.solutionGrid[0]?.length ?? 0);

        if (diffs === 0) {
          return {
            hint: 'Your grid looks correct! Try submitting.',
            cell: null,
            type: 'reveal_candidate',
          };
        }

        return {
          hint: `${diffs} out of ${total} cells differ from the solution. The expected grid size is ${state.solutionGrid.length}x${state.solutionGrid[0]?.length ?? 0}.`,
          cell: null,
          type: 'reveal_candidate',
        };
      }

      case 3: {
        // Reveal one incorrect cell
        const solRows = state.solutionGrid.length;
        for (let r = 0; r < solRows; r++) {
          const solCols = state.solutionGrid[r]!.length;
          for (let c = 0; c < solCols; c++) {
            const userVal = state.userGrid[r]?.[c] ?? -1;
            const solVal = state.solutionGrid[r]![c]!;
            if (userVal !== solVal) {
              return {
                hint: `Cell (${r + 1}, ${c + 1}) should be color ${solVal}.`,
                cell: { row: r, col: c },
                type: 'reveal_cell',
              };
            }
          }
        }

        return {
          hint: 'All cells are correct!',
          cell: null,
          type: 'reveal_cell',
        };
      }

      default: {
        const _exhaustive: never = hintLevel;
        throw new Error(`Unhandled hint level: ${_exhaustive}`);
      }
    }
  }

  getActionMetadata(state: ArcState, action: ArcAction): ActionMetadata {
    if (action.type === 'submit') {
      const isCorrect = gridsEqual(state.userGrid, state.solutionGrid);
      return {
        actionType: 'submit',
        isCorrect,
        difficulty: 4,
      };
    }

    if (action.type === 'paint_cell') {
      const expectedColor = state.solutionGrid[action.row]?.[action.col];
      return {
        actionType: 'paint_cell',
        isCorrect: expectedColor === action.color,
        difficulty: 2,
      };
    }

    return {
      actionType: action.type,
      isCorrect: true,
      difficulty: 1,
    };
  }
}
