// ─── Number Sequence Engine ─────────────────────────────────────────────────
// PuzzleEngine implementation for "what comes next" number sequence puzzles.
// User reads a sequence question (e.g. "2, 4, 8, 16, ?") and enters a number.
// Validated by exact numeric comparison against stored solution.

import type {
  ActionMetadata,
  CompletionResult,
  DifficultyLevel,
  HintResult,
  PuzzleDefinition,
  PuzzleEngine,
  ValidationResult,
} from '../types';

// ─── Sequence-Specific Types ────────────────────────────────────────────────

export type SequenceAction =
  | { readonly type: 'submit'; readonly answer: string }
  | { readonly type: 'request_hint' };

export interface SequenceState {
  readonly puzzleText: string;
  readonly solution: string;
  readonly hints: readonly string[];
  readonly userAnswer: string | null;
  readonly isSubmitted: boolean;
  readonly isCorrect: boolean;
  readonly hintsUsed: number;
  readonly history: readonly SequenceAction[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Parse a string to a number, returning null on failure */
function parseNumber(s: string): number | null {
  const trimmed = s.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

// ─── Engine Implementation ──────────────────────────────────────────────────

export class SequenceEngine
  implements PuzzleEngine<SequenceState, SequenceAction>
{
  readonly engineId = 'number_sequence';
  readonly category = 'pattern_recognition' as const;
  readonly supportedTypes = ['number_sequence', 'number_sequences'] as const;

  getInitialState(definition: PuzzleDefinition): SequenceState {
    return {
      puzzleText: typeof definition.initialState === 'string'
        ? definition.initialState
        : JSON.stringify(definition.initialState),
      solution: typeof definition.solution === 'string'
        ? definition.solution
        : String(definition.solution),
      hints: definition.metadata.hints,
      userAnswer: null,
      isSubmitted: false,
      isCorrect: false,
      hintsUsed: 0,
      history: [],
    };
  }

  applyAction(state: SequenceState, action: SequenceAction): SequenceState {
    switch (action.type) {
      case 'submit': {
        if (state.isSubmitted) return state;

        const answer = action.answer.trim();
        const userNum = parseNumber(answer);
        const solutionNum = parseNumber(state.solution);

        const isCorrect =
          userNum !== null && solutionNum !== null && userNum === solutionNum;

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

  undoAction(state: SequenceState): SequenceState {
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

  validateAction(
    state: SequenceState,
    action: SequenceAction,
  ): ValidationResult {
    const errors: { field: string; message: string }[] = [];

    if (action.type === 'submit') {
      if (!action.answer || action.answer.trim().length === 0) {
        errors.push({ field: 'answer', message: 'Answer cannot be empty' });
      } else if (parseNumber(action.answer) === null) {
        errors.push({ field: 'answer', message: 'Answer must be a valid number' });
      }
      if (state.isSubmitted) {
        errors.push({ field: 'state', message: 'Answer already submitted' });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  validateComplete(state: SequenceState): CompletionResult {
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

  getHint(state: SequenceState, hintLevel: 1 | 2 | 3): HintResult | null {
    const { hints } = state;

    switch (hintLevel) {
      case 1: {
        if (hints.length === 0) {
          return {
            hint: 'Look at the differences between consecutive numbers. Is there a pattern?',
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
            hint: 'Try looking at ratios, squares, or alternating operations.',
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
        return {
          hint: `The answer is: ${state.solution}`,
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

  getActionMetadata(
    state: SequenceState,
    action: SequenceAction,
  ): ActionMetadata {
    if (action.type === 'submit') {
      const userNum = parseNumber(action.answer);
      const solutionNum = parseNumber(state.solution);
      const isCorrect =
        userNum !== null && solutionNum !== null && userNum === solutionNum;

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
