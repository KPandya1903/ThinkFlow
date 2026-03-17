// ─── Knights & Knaves Engine ────────────────────────────────────────────────
// PuzzleEngine implementation for Knights & Knaves logic puzzles.
// User reads a scenario describing knights (always truthful) and knaves
// (always lying), then submits a text answer. Validated against stored solution.

import type {
  ActionMetadata,
  CompletionResult,
  DifficultyLevel,
  HintResult,
  PuzzleDefinition,
  PuzzleEngine,
  ValidationResult,
} from '../types';

// ─── K&K-Specific Types ─────────────────────────────────────────────────────

export type KnightsKnavesAction =
  | { readonly type: 'submit'; readonly answer: string }
  | { readonly type: 'request_hint' };

export interface KnightsKnavesState {
  readonly puzzleText: string;
  readonly solution: string;
  readonly hints: readonly string[];
  readonly userAnswer: string | null;
  readonly isSubmitted: boolean;
  readonly isCorrect: boolean;
  readonly hintsUsed: number;
  readonly history: readonly KnightsKnavesAction[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
}

// ─── Engine Implementation ──────────────────────────────────────────────────

export class KnightsKnavesEngine
  implements PuzzleEngine<KnightsKnavesState, KnightsKnavesAction>
{
  readonly engineId = 'knights_knaves';
  readonly category = 'logical_deduction' as const;
  readonly supportedTypes = ['knights_knaves'] as const;

  getInitialState(definition: PuzzleDefinition): KnightsKnavesState {
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

  applyAction(
    state: KnightsKnavesState,
    action: KnightsKnavesAction,
  ): KnightsKnavesState {
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

  undoAction(state: KnightsKnavesState): KnightsKnavesState {
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
    state: KnightsKnavesState,
    action: KnightsKnavesAction,
  ): ValidationResult {
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

  validateComplete(state: KnightsKnavesState): CompletionResult {
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

  getHint(state: KnightsKnavesState, hintLevel: 1 | 2 | 3): HintResult | null {
    const { hints, hintsUsed } = state;

    switch (hintLevel) {
      case 1: {
        if (hints.length === 0) {
          return {
            hint: 'Try working out each statement assuming each person is a knight, then a knave.',
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
            hint: 'Look for contradictions when you assume one person is lying.',
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
        const solutionPreview = state.solution.substring(0, Math.ceil(state.solution.length / 2));
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

  getActionMetadata(
    state: KnightsKnavesState,
    action: KnightsKnavesAction,
  ): ActionMetadata {
    if (action.type === 'submit') {
      const isCorrect = normalise(action.answer) === normalise(state.solution);
      return {
        actionType: 'submit',
        isCorrect,
        difficulty: 3 as DifficultyLevel,
      };
    }

    return {
      actionType: action.type,
      isCorrect: true,
      difficulty: 1 as DifficultyLevel,
    };
  }
}
