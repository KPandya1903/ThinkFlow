// ─── Game Store (Zustand) ───────────────────────────────────────────────────
// Manages the active puzzle session: current puzzle, live state, timer,
// and action dispatch.  The store is generic enough to work with any engine.

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import type {
  CompletionResult,
  HintResult,
  PuzzleDefinition,
  PuzzleEngine,
} from '@/engines/types';
import { getPuzzleEngineRegistry } from '@/engines/registry';

// ─── Types ──────────────────────────────────────────────────────────────────

interface GameSession {
  readonly puzzleDefinition: PuzzleDefinition;
  readonly engine: PuzzleEngine<unknown, unknown>;
  readonly startedAt: number; // Date.now()
}

interface GameState {
  // ── Session ──────────────────────────────────────────────────────────
  session: GameSession | null;
  puzzleState: unknown;

  // ── Timer ────────────────────────────────────────────────────────────
  timerSeconds: number;
  isPaused: boolean;

  // ── Completion ───────────────────────────────────────────────────────
  isComplete: boolean;
  completionResult: CompletionResult | null;

  // ── Last hint ────────────────────────────────────────────────────────
  lastHint: HintResult | null;

  // ── Actions ──────────────────────────────────────────────────────────
  startPuzzle: (definition: PuzzleDefinition) => void;
  applyAction: (action: unknown) => void;
  undo: () => void;
  requestHint: (level: 1 | 2 | 3) => void;
  pause: () => void;
  resume: () => void;
  complete: () => void;
  tick: () => void;
  reset: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    // ── Initial values ───────────────────────────────────────────────────
    session: null,
    puzzleState: null,
    timerSeconds: 0,
    isPaused: false,
    isComplete: false,
    completionResult: null,
    lastHint: null,

    // ── startPuzzle ──────────────────────────────────────────────────────
    startPuzzle: (definition) => {
      const registry = getPuzzleEngineRegistry();
      const engine = registry.getEngineOrThrow(definition.type);
      const initialState = engine.getInitialState(definition);

      set({
        session: {
          puzzleDefinition: definition,
          engine,
          startedAt: Date.now(),
        },
        puzzleState: initialState,
        timerSeconds: 0,
        isPaused: false,
        isComplete: false,
        completionResult: null,
        lastHint: null,
      });
    },

    // ── applyAction ──────────────────────────────────────────────────────
    applyAction: (action) => {
      const { session, puzzleState, isComplete } = get();
      if (!session || !puzzleState || isComplete) return;

      const validation = session.engine.validateAction(puzzleState, action);
      if (!validation.valid) return;

      const nextState = session.engine.applyAction(puzzleState, action);
      set({ puzzleState: nextState });
    },

    // ── undo ─────────────────────────────────────────────────────────────
    undo: () => {
      const { session, puzzleState, isComplete } = get();
      if (!session || !puzzleState || isComplete) return;

      const prevState = session.engine.undoAction(puzzleState);
      set({ puzzleState: prevState });
    },

    // ── requestHint ──────────────────────────────────────────────────────
    requestHint: (level) => {
      const { session, puzzleState, isComplete } = get();
      if (!session || !puzzleState || isComplete) return;

      const hint = session.engine.getHint(puzzleState, level);
      set({ lastHint: hint });
    },

    // ── Timer controls ───────────────────────────────────────────────────
    pause: () => set({ isPaused: true }),
    resume: () => set({ isPaused: false }),
    tick: () => {
      const { isPaused, isComplete } = get();
      if (isPaused || isComplete) return;
      set((s) => ({ timerSeconds: s.timerSeconds + 1 }));
    },

    // ── complete ─────────────────────────────────────────────────────────
    complete: () => {
      const { session, puzzleState } = get();
      if (!session || !puzzleState) return;

      const result = session.engine.validateComplete(puzzleState);
      set({
        isComplete: true,
        isPaused: true,
        completionResult: result,
      });
    },

    // ── reset ────────────────────────────────────────────────────────────
    reset: () =>
      set({
        session: null,
        puzzleState: null,
        timerSeconds: 0,
        isPaused: false,
        isComplete: false,
        completionResult: null,
        lastHint: null,
      }),
  })),
);
