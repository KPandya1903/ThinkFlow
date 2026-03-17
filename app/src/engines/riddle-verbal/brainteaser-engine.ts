// ─── BrainTeaser Engine ─────────────────────────────────────────────────────
// PuzzleEngine implementation for multiple-choice brain teasers.
// initialState contains: { stem: string, choices: {label: string, text: string}[] }
// User selects an answer key (e.g. "A", "B", "C", "D", "E").
// Validated by exact match on the answer key against stored solution.

import type {
  ActionMetadata,
  CompletionResult,
  DifficultyLevel,
  HintResult,
  PuzzleDefinition,
  PuzzleEngine,
  ValidationResult,
} from '../types';

// ─── BrainTeaser-Specific Types ─────────────────────────────────────────────

export interface BrainTeaserChoice {
  readonly label: string;
  readonly text: string;
}

export interface BrainTeaserConfig {
  readonly stem: string;
  readonly choices: readonly BrainTeaserChoice[];
}

export type BrainTeaserAction =
  | { readonly type: 'select'; readonly answerKey: string }
  | { readonly type: 'submit' }
  | { readonly type: 'request_hint' };

export interface BrainTeaserState {
  readonly stem: string;
  readonly choices: readonly BrainTeaserChoice[];
  readonly solution: string;
  readonly hints: readonly string[];
  readonly selectedKey: string | null;
  readonly isSubmitted: boolean;
  readonly isCorrect: boolean;
  readonly hintsUsed: number;
  readonly history: readonly BrainTeaserAction[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseBrainTeaserInitialState(
  initialState: unknown,
): BrainTeaserConfig {
  if (typeof initialState === 'string') {
    try {
      const parsed = JSON.parse(initialState);
      return parsed as BrainTeaserConfig;
    } catch {
      return { stem: initialState, choices: [] };
    }
  }
  return initialState as BrainTeaserConfig;
}

// ─── Engine Implementation ──────────────────────────────────────────────────

export class BrainTeaserEngine
  implements PuzzleEngine<BrainTeaserState, BrainTeaserAction>
{
  readonly engineId = 'brainteaser';
  readonly category = 'riddles_verbal' as const;
  readonly supportedTypes = ['brainteaser'] as const;

  getInitialState(definition: PuzzleDefinition): BrainTeaserState {
    const config = parseBrainTeaserInitialState(definition.initialState);

    return {
      stem: config.stem,
      choices: config.choices,
      solution: typeof definition.solution === 'string'
        ? definition.solution.trim().toUpperCase()
        : String(definition.solution).trim().toUpperCase(),
      hints: definition.metadata.hints,
      selectedKey: null,
      isSubmitted: false,
      isCorrect: false,
      hintsUsed: 0,
      history: [],
    };
  }

  applyAction(
    state: BrainTeaserState,
    action: BrainTeaserAction,
  ): BrainTeaserState {
    switch (action.type) {
      case 'select': {
        if (state.isSubmitted) return state;

        return {
          ...state,
          selectedKey: action.answerKey.toUpperCase(),
          history: [...state.history, action],
        };
      }

      case 'submit': {
        if (state.isSubmitted) return state;
        if (!state.selectedKey) return state;

        const isCorrect =
          state.selectedKey.toUpperCase() === state.solution.toUpperCase();

        return {
          ...state,
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

  undoAction(state: BrainTeaserState): BrainTeaserState {
    if (state.history.length === 0) return state;

    const history = [...state.history];
    const lastAction = history.pop()!;

    if (lastAction.type === 'submit') {
      return {
        ...state,
        isSubmitted: false,
        isCorrect: false,
        history,
      };
    }

    if (lastAction.type === 'select') {
      // Find previous selection if any
      let prevKey: string | null = null;
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i]!.type === 'select') {
          prevKey = (history[i] as { type: 'select'; answerKey: string }).answerKey;
          break;
        }
      }

      return {
        ...state,
        selectedKey: prevKey,
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
    state: BrainTeaserState,
    action: BrainTeaserAction,
  ): ValidationResult {
    const errors: { field: string; message: string }[] = [];

    if (action.type === 'select') {
      const validLabels = state.choices.map((c) => c.label.toUpperCase());
      if (!validLabels.includes(action.answerKey.toUpperCase())) {
        errors.push({
          field: 'answerKey',
          message: `Invalid choice. Valid options: ${validLabels.join(', ')}`,
        });
      }
      if (state.isSubmitted) {
        errors.push({ field: 'state', message: 'Answer already submitted' });
      }
    }

    if (action.type === 'submit') {
      if (!state.selectedKey) {
        errors.push({ field: 'selection', message: 'Must select an answer first' });
      }
      if (state.isSubmitted) {
        errors.push({ field: 'state', message: 'Answer already submitted' });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  validateComplete(state: BrainTeaserState): CompletionResult {
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

  getHint(state: BrainTeaserState, hintLevel: 1 | 2 | 3): HintResult | null {
    const { hints, choices, solution } = state;

    switch (hintLevel) {
      case 1: {
        if (hints.length === 0) {
          return {
            hint: 'Read each answer choice carefully. Try to eliminate obviously wrong ones first.',
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
        // Eliminate one wrong answer
        const wrongChoices = choices.filter(
          (c) => c.label.toUpperCase() !== solution.toUpperCase(),
        );
        if (wrongChoices.length > 0) {
          const eliminate = wrongChoices[0]!;
          return {
            hint: `You can eliminate option ${eliminate.label} — it is incorrect.`,
            cell: null,
            type: 'reveal_candidate',
          };
        }
        const idx = Math.min(1, hints.length - 1);
        return {
          hint: idx >= 0 ? hints[idx]! : 'Consider each option carefully.',
          cell: null,
          type: 'reveal_candidate',
        };
      }

      case 3: {
        return {
          hint: `The correct answer is: ${solution}`,
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
    state: BrainTeaserState,
    action: BrainTeaserAction,
  ): ActionMetadata {
    if (action.type === 'submit') {
      return {
        actionType: 'submit',
        isCorrect: state.selectedKey?.toUpperCase() === state.solution.toUpperCase(),
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
