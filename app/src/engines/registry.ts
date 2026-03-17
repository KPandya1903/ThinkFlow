// ─── Puzzle Engine Registry ─────────────────────────────────────────────────
// Singleton registry that maps puzzle type strings to engine instances.
// The UI layer calls `getEngine(puzzleType)` and gets back the correct
// PuzzleEngine without knowing concrete implementations.

import type { PuzzleEngine } from './types';
import { FutoshikiEngine } from './structured-grid/futoshiki-engine';
import { TakuzuEngine } from './structured-grid/takuzu-engine';
import { KakurasuEngine } from './structured-grid/kakurasu-engine';
import { KnightsKnavesEngine } from './logical-deduction/knights-knaves-engine';
import { ZebraEngine } from './logical-deduction/zebra-engine';
import { SequenceEngine } from './pattern-recognition/sequence-engine';
import { ArcEngine } from './pattern-recognition/arc-engine';
import { BrainTeaserEngine } from './riddle-verbal/brainteaser-engine';

// We store engines typed as PuzzleEngine<unknown, unknown> so the registry
// itself is type-agnostic.  Callers who know the concrete engine can narrow.
type AnyPuzzleEngine = PuzzleEngine<unknown, unknown>;

class PuzzleEngineRegistry {
  private readonly engines = new Map<string, AnyPuzzleEngine>();

  /**
   * Register an engine for one or more puzzle type strings.
   * Throws if a type is already registered (prevents silent overwrites).
   */
  register(engine: AnyPuzzleEngine): void {
    for (const type of engine.supportedTypes) {
      if (this.engines.has(type)) {
        throw new Error(
          `PuzzleEngineRegistry: type "${type}" is already registered by engine "${this.engines.get(type)!.engineId}". ` +
            `Cannot register engine "${engine.engineId}" for the same type.`,
        );
      }
      this.engines.set(type, engine);
    }
  }

  /**
   * Retrieve the engine for a given puzzle type.
   * Returns `undefined` if no engine is registered.
   */
  getEngine(type: string): AnyPuzzleEngine | undefined {
    return this.engines.get(type);
  }

  /**
   * Type-safe retrieval when the caller knows the concrete engine type.
   * Throws if the type is not registered.
   */
  getEngineOrThrow<TState, TAction>(type: string): PuzzleEngine<TState, TAction> {
    const engine = this.engines.get(type);
    if (!engine) {
      throw new Error(`PuzzleEngineRegistry: no engine registered for type "${type}".`);
    }
    return engine as PuzzleEngine<TState, TAction>;
  }

  /** Check whether a type has a registered engine */
  has(type: string): boolean {
    return this.engines.has(type);
  }

  /** Return all registered type strings */
  getRegisteredTypes(): readonly string[] {
    return [...this.engines.keys()];
  }

  /** Remove all registrations (useful in tests) */
  clear(): void {
    this.engines.clear();
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let instance: PuzzleEngineRegistry | null = null;

export function getPuzzleEngineRegistry(): PuzzleEngineRegistry {
  if (!instance) {
    instance = new PuzzleEngineRegistry();

    // ── Auto-register all built-in engines ──────────────────────────────
    instance.register(new FutoshikiEngine());
    instance.register(new TakuzuEngine());
    instance.register(new KakurasuEngine());
    instance.register(new KnightsKnavesEngine());
    instance.register(new ZebraEngine());
    instance.register(new SequenceEngine());
    instance.register(new ArcEngine());
    instance.register(new BrainTeaserEngine());
  }
  return instance;
}

/** Reset the singleton (test helper) */
export function resetPuzzleEngineRegistry(): void {
  instance?.clear();
  instance = null;
}

export { PuzzleEngineRegistry };
