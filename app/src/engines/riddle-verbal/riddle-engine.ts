// ─── Riddle Engine ──────────────────────────────────────────────────────────
// PuzzleEngine implementation for riddles.
// User reads a riddle and types an answer. Validated using fuzzy matching:
// lowercase + trim, then check if the user answer contains the solution
// or vice versa.

import type {
  ActionMetadata,
  CompletionResult,
  DifficultyLevel,
  HintResult,
  PuzzleDefinition,
  PuzzleEngine,
  ValidationResult,
} from '../types';

// ─── Riddle-Specific Types ──────────────────────────────────────────────────

export type RiddleAction =
  | { readonly type: 'submit'; readonly answer: string }
  | { readonly type: 'request_hint' };

export interface RiddleState {
  readonly puzzleText: string;
  readonly solution: string;
  readonly hints: readonly string[];
  readonly userAnswer: string | null;
  readonly isSubmitted: boolean;
  readonly isCorrect: boolean;
  readonly hintsUsed: number;
  readonly history: readonly RiddleAction[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Fuzzy match: lowercase, trim, check containment in either direction */
function fuzzyMatch(userAnswer: string, solution: string): boolean {
  const a = userAnswer.trim().toLowerCase();
  const b = solution.trim().toLowerCase();

  if (a === b) return true;
  if (a.includes(b)) return true;
  if (b.includes(a)) return true;

  return false;
}

// ─── Engine Implementation ──────────────────────────────────────────────────

export class RiddleEngine implements PuzzleEngine<RiddleState, RiddleAction> {
  readonly engineId = 'riddle';
  readonly category = 'riddles_verbal' as const;
  readonly supportedTypes = ['riddles'] as const;

  getInitialState(definition: PuzzleDefinition): RiddleState {
    return {
      puzzleText: typeof definition.initialState === 'string'
        ? definition.initialState
        : JSON.stringify(definition.initialState),
      solution: typeof definition.solution === 'string'
        ? definition.solution
        : JSON.stringify(definition.solution),
      hints: definition.metadata.hints,
      userAnswer: null,
      isSubmitted: false,
      isCorrect: false,
      hintsUsed: 0,
      history: [],
    };
  }

  applyAction(state: RiddleState, action: RiddleAction): RiddleState {
    switch (action.type) {
      case 'submit': {
        if (state.isSubmitted) return state;

        const answer = action.answer.trim();
        const isCorrect = fuzzyMatch(answer, state.solution);

        return {
          ...state,
          userAnswer: answer,
          isSubmitted: true,
          isCorrect,
          history: [...state.history, action],
        };
      }

      case 'request_hint': {
        return {
          ...state,
          hintsUsed: Math.min(state.hintsUsed + 1, state.hints.length),
          history: [...state.history, action],
        };
      }

      default: {
        const _exhaustive: never = action;
        throw new Error(`Unhandled action type: ${JSON.stringify(_exhaustive)}`);
      }
    }
  }

  undoAction(state: RiddleState): RiddleState {
    if (state.history.length === 0) return state;

    const history = [...state.history];
    const lastAction = history.pop()!;

    if (lastAction.type === 'submit') {
      return {
        ...state,
        userAnswer: null,
        isSubmitted: false,
        isCorrect: false,
        history,
      };
    }

    if (lastAction.type === 'request_hint') {
      return {
        ...state,
        hintsUsed: Math.max(0, state.hintsUsed - 1),
        history,
      };
    }

    return state;
  }

  validateAction(state: RiddleState, action: RiddleAction): ValidationResult {
    const errors: { field: string; message: string }[] = [];

    if (action.type === 'submit') {
      if (!action.answer || action.answer.trim().length === 0) {
        errors.push({ field: 'answer', message: 'Answer cannot be empty' });
      }
      if (state.isSubmitted) {
        errors.push({ field: 'state', message: 'Answer already submitted' });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  validateComplete(state: RiddleState): CompletionResult {
    if (!state.isSubmitted) {
      return { complete: false, correct: false, score: 0 };
    }

    const hintPenalty = state.hintsUsed * 15;
    const score = state.isCorrect ? Math.max(0, 100 - hintPenalty) : 0;

    return {
      complete: true,
      correct: state.isCorrect,
      score,
    };
  }

  getHint(state: RiddleState, hintLevel: 1 | 2 | 3): HintResult | null {
    const { hints } = state;

    switch (hintLevel) {
      case 1: {
        if (hints.length === 0) {
          return {
            hint: 'Think about the riddle literally and figuratively. What has the described properties?',
            cell: null,
            type: 'nudge',
          };
        }
        return {
          hint: hints[0]!,
          cell: null,
          type: 'nudge',
        };
      }

      case 2: {
        const idx = Math.min(1, hints.length - 1);
        if (idx < 0) {
          return {
            hint: 'Focus on each line of the riddle. Each one is a separate clue.',
            cell: null,
            type: 'reveal_candidate',
          };
        }
        return {
          hint: hints[idx]!,
          cell: null,
          type: 'reveal_candidate',
        };
      }

      case 3: {
        const firstLetter = state.solution.trim()[0] ?? '';
        const length = state.solution.trim().length;
        return {
          hint: `The answer starts with "${firstLetter.toUpperCase()}" and is ${length} characters long.`,
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

  getActionMetadata(state: RiddleState, action: RiddleAction): ActionMetadata {
    if (action.type === 'submit') {
      const isCorrect = fuzzyMatch(action.answer, state.solution);
      return {
        actionType: 'submit',
        isCorrect,
        difficulty: 2 as DifficultyLevel,
      };
    }

    return {
      actionType: action.type,
      isCorrect: true,
      difficulty: 1 as DifficultyLevel,
    };
  }
}
