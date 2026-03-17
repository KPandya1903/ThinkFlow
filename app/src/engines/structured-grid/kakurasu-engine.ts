// ─── Kakurasu Engine ────────────────────────────────────────────────────────
// PuzzleEngine implementation for Kakurasu puzzles from reasoning-gym.
// The puzzle is presented as a text description (question) with row/column
// sums and a grid to mark.  The user reads the description and submits
// their answer as text.

import type {
  ActionMetadata,
  CompletionResult,
  DifficultyLevel,
  HintResult,
  PuzzleDefinition,
  PuzzleEngine,
  ValidationResult,
} from '../types';

// ─── Kakurasu-Specific Types ────────────────────────────────────────────────

export type KakurasuAction =
  | { readonly type: 'update_answer'; readonly answer: string }
  | { readonly type: 'submit' };

export interface KakurasuState {
  /** The original puzzle question text */
  readonly question: string;
  /** The expected solution text */
  readonly solution: string;
  /** The user's current answer text */
  readonly answer: string;
  /** Whether the user has submitted their answer */
  readonly submitted: boolean;
  /** Action history for undo support */
  readonly history: readonly KakurasuAction[];
  /** Number of incorrect submissions */
  readonly mistakes: number;
  /** Number of hints used */
  readonly hintsUsed: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Normalize whitespace and casing for flexible comparison */
function normalize(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

// ─── Engine Implementation ──────────────────────────────────────────────────

export class KakurasuEngine implements PuzzleEngine<KakurasuState, KakurasuAction> {
  readonly engineId = 'kakurasu';
  readonly category = 'structured_grid' as const;
  readonly supportedTypes = ['kakurasu'] as const;

  getInitialState(definition: PuzzleDefinition): KakurasuState {
    return {
      question: definition.initialState,
      solution: definition.solution,
      answer: '',
      submitted: false,
      history: [],
      mistakes: 0,
      hintsUsed: 0,
    };
  }

  applyAction(state: KakurasuState, action: KakurasuAction): KakurasuState {
    switch (action.type) {
      case 'update_answer': {
        if (state.submitted) return state;
        return {
          ...state,
          answer: action.answer,
          history: [...state.history, action],
        };
      }

      case 'submit': {
        if (state.submitted) return state;
        const isCorrect = normalize(state.answer) === normalize(state.solution);
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

  undoAction(state: KakurasuState): KakurasuState {
    if (state.history.length === 0) return state;

    const history = [...state.history];
    const lastAction = history.pop()!;

    // If undoing a submit, revert to un-submitted state
    if (lastAction.type === 'submit') {
      return {
        ...state,
        submitted: false,
        history,
      };
    }

    // If undoing an answer update, find the previous answer
    const previousAnswer = history
      .filter((a): a is Extract<KakurasuAction, { type: 'update_answer' }> =>
        a.type === 'update_answer',
      )
      .at(-1)?.answer ?? '';

    return {
      ...state,
      answer: previousAnswer,
      history,
    };
  }

  validateAction(state: KakurasuState, action: KakurasuAction): ValidationResult {
    const errors: { field: string; message: string }[] = [];

    switch (action.type) {
      case 'update_answer': {
        if (state.submitted) {
          errors.push({ field: 'state', message: 'Cannot update answer after submission' });
        }
        break;
      }
      case 'submit': {
        if (state.submitted) {
          errors.push({ field: 'state', message: 'Already submitted' });
        }
        if (state.answer.trim().length === 0) {
          errors.push({ field: 'answer', message: 'Answer cannot be empty' });
        }
        break;
      }
    }

    return { valid: errors.length === 0, errors };
  }

  validateComplete(state: KakurasuState): CompletionResult {
    if (!state.submitted) {
      return { complete: false, correct: false, score: 0 };
    }

    const correct = normalize(state.answer) === normalize(state.solution);

    // Score: start at 100, deduct for mistakes and hints
    const mistakePenalty = state.mistakes * 15;
    const hintPenalty = state.hintsUsed * 10;
    const score = correct ? Math.max(0, 100 - mistakePenalty - hintPenalty) : 0;

    return { complete: true, correct, score };
  }

  getHint(state: KakurasuState, hintLevel: 1 | 2 | 3): HintResult | null {
    const solution = state.solution;

    switch (hintLevel) {
      case 1:
        return {
          hint: 'Mark cells in the grid so that the sum of column-positions of marked cells in each row matches the row clue, and vice versa for columns.',
          cell: null,
          type: 'nudge',
        };

      case 2: {
        // Reveal a portion of the solution
        const lines = solution.split('\n').filter((l) => l.trim().length > 0);
        const partialHint = lines.length > 0
          ? `The first row of the solution is: ${lines[0]}`
          : `The answer starts with: ${solution.substring(0, Math.ceil(solution.length / 3))}...`;
        return {
          hint: partialHint,
          cell: null,
          type: 'reveal_candidate',
        };
      }

      case 3:
        return {
          hint: `The full solution is:\n${solution}`,
          cell: null,
          type: 'reveal_cell',
        };

      default: {
        const _exhaustive: never = hintLevel;
        throw new Error(`Unhandled hint level: ${_exhaustive}`);
      }
    }
  }

  getActionMetadata(state: KakurasuState, action: KakurasuAction): ActionMetadata {
    if (action.type === 'submit') {
      const isCorrect = normalize(state.answer) === normalize(state.solution);
      return {
        actionType: 'submit',
        isCorrect,
        difficulty: 3,
      };
    }

    return {
      actionType: action.type,
      isCorrect: true,
      difficulty: 1,
    };
  }
}
