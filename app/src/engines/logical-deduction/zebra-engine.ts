// ─── Zebra / Einstein Engine ────────────────────────────────────────────────
// PuzzleEngine implementation for Zebra (Einstein) puzzles.
// User reads a series of clues about categories (nationality, house colour,
// pet, drink, etc.) and submits a text answer. Validated against stored solution.

import type {
  ActionMetadata,
  CompletionResult,
  DifficultyLevel,
  HintResult,
  PuzzleDefinition,
  PuzzleEngine,
  ValidationResult,
} from '../types';

// ─── Zebra-Specific Types ───────────────────────────────────────────────────

export type ZebraAction =
  | { readonly type: 'submit'; readonly answer: string }
  | { readonly type: 'request_hint' };

export interface ZebraState {
  readonly puzzleText: string;
  readonly solution: string;
  readonly hints: readonly string[];
  readonly userAnswer: string | null;
  readonly isSubmitted: boolean;
  readonly isCorrect: boolean;
  readonly hintsUsed: number;
  readonly history: readonly ZebraAction[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
}

// ─── Engine Implementation ──────────────────────────────────────────────────

export class ZebraEngine implements PuzzleEngine<ZebraState, ZebraAction> {
  readonly engineId = 'zebra';
  readonly category = 'logical_deduction' as const;
  readonly supportedTypes = ['zebra'] as const;

  getInitialState(definition: PuzzleDefinition): ZebraState {
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

  applyAction(state: ZebraState, action: ZebraAction): ZebraState {
    switch (action.type) {
      case 'submit': {
        if (state.isSubmitted) return state;

        const answer = action.answer.trim();
        const isCorrect = normalise(answer) === normalise(state.solution);

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

  undoAction(state: ZebraState): ZebraState {
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

  validateAction(state: ZebraState, action: ZebraAction): ValidationResult {
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

  validateComplete(state: ZebraState): CompletionResult {
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

  getHint(state: ZebraState, hintLevel: 1 | 2 | 3): HintResult | null {
    const { hints } = state;

    switch (hintLevel) {
      case 1: {
        if (hints.length === 0) {
          return {
            hint: 'Try creating a grid and eliminating impossible combinations using the clues.',
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
            hint: 'Focus on clues that mention specific positions (e.g. "first", "middle", "next to").',
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
        const solutionPreview = state.solution.substring(
          0,
          Math.ceil(state.solution.length / 2),
        );
        return {
          hint: `The answer starts with: "${solutionPreview}..."`,
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

  getActionMetadata(state: ZebraState, action: ZebraAction): ActionMetadata {
    if (action.type === 'submit') {
      const isCorrect = normalise(action.answer) === normalise(state.solution);
      return {
        actionType: 'submit',
        isCorrect,
        difficulty: 4 as DifficultyLevel,
      };
    }

    return {
      actionType: action.type,
      isCorrect: true,
      difficulty: 1 as DifficultyLevel,
    };
  }
}
