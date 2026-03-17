'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Zap, Clock, Star, ArrowRight, Lightbulb,
  Send, Pause, Play, RotateCcw, Swords, CheckCircle2, XCircle, Info,
} from 'lucide-react';
import { cn, formatTime, getDifficultyColor, getDifficultyLabel } from '@/lib/utils';

// ─── Nim logic ───────────────────────────────────────────────────────────────

function nimXor(piles: number[]): number {
  return piles.reduce((acc, p) => acc ^ p, 0);
}

/** Returns the computer's optimal move: [pileIndex, newSize].
 *  If already in a losing position (xor=0), just removes 1 from the largest pile. */
function optimalMove(piles: number[]): [number, number] {
  const xorSum = nimXor(piles);
  if (xorSum === 0) {
    // Losing position — take 1 from largest pile
    const maxIdx = piles.indexOf(Math.max(...piles));
    return [maxIdx, Math.max(0, piles[maxIdx] - 1)];
  }
  // Find a pile where piles[i] XOR xorSum < piles[i]
  for (let i = 0; i < piles.length; i++) {
    const target = piles[i] ^ xorSum;
    if (target < piles[i]) return [i, target];
  }
  return [0, 0];
}

const STONE_COLORS = ['bg-primary/70', 'bg-accent/70', 'bg-gold/70'];
const PILE_LABELS = ['Pile A', 'Pile B', 'Pile C'];
const INITIAL_PILES = [3, 4, 5];

// ─── Difficulty badge colors ──────────────────────────────────────────────────

const DIFFICULTY_BG: Record<number, string> = {
  1: 'bg-success/15 border-success/30 text-success',
  2: 'bg-accent/15 border-accent/30 text-accent',
  3: 'bg-gold/15 border-gold/30 text-gold',
  4: 'bg-error/15 border-error/30 text-error',
  5: 'bg-primary-light/15 border-primary-light/30 text-primary-light',
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface NimGameProps {
  puzzleId: string;
  puzzleText: string;
  title: string;
  difficulty: number;
  estimatedTimeSeconds?: number;
  hints?: string[] | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NimGame({
  puzzleId,
  puzzleText,
  title,
  difficulty,
  estimatedTimeSeconds,
  hints,
}: NimGameProps) {
  // ─── Board state ───────────────────────────────────────────────────────
  const [piles, setPiles] = useState<number[]>(INITIAL_PILES);
  const [selectedPile, setSelectedPile] = useState<number | null>(null);
  const [removeCount, setRemoveCount] = useState(1);
  const [turnLog, setTurnLog] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [playerWon, setPlayerWon] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [removedStones, setRemovedStones] = useState<{ pile: number; from: number; to: number } | null>(null);

  // ─── Answer submission state ────────────────────────────────────────────
  const [answer, setAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [solutionText, setSolutionText] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  // ─── Timer / game state ────────────────────────────────────────────────
  const [isPaused, setIsPaused] = useState(false);
  const [timer, setTimer] = useState(0);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const availableHints = hints ?? [];
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSubmitted || isPaused) return;
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isSubmitted, isPaused]);

  // Auto-scroll turn log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [turnLog]);

  const xpReward = difficulty <= 1 ? 25 : difficulty === 2 ? 35 : difficulty === 3 ? 50 : 75;
  const timeBonus = Math.max(0, Math.floor((600 - timer) / 60) * 5);
  const hintPenalty = hintsRevealed * 10;
  const totalXP = Math.max(xpReward, xpReward + timeBonus - hintPenalty);
  const timeStr = formatTime(timer);
  const isTimerWarning = timer > 600;
  const isTimerDanger = timer > 900;
  const difficultyLabel = getDifficultyLabel(difficulty);
  const difficultyColor = getDifficultyColor(difficulty);
  const difficultyBg = DIFFICULTY_BG[difficulty] ?? DIFFICULTY_BG[1];

  // ─── Player move ────────────────────────────────────────────────────────
  const handlePlayerMove = useCallback(() => {
    if (selectedPile === null || gameOver || thinking || isPaused) return;
    const current = piles[selectedPile];
    if (removeCount < 1 || removeCount > current) return;

    const newPiles = [...piles];
    newPiles[selectedPile] = current - removeCount;
    const removed = { pile: selectedPile, from: current, to: newPiles[selectedPile] };
    setRemovedStones(removed);

    const xorStr = newPiles.map((p, i) => `${p}`).join(' ⊕ ') + ` = ${nimXor(newPiles).toString(2)} (${nimXor(newPiles)})`;
    setTurnLog((l) => [...l, `You: Remove ${removeCount} from ${PILE_LABELS[selectedPile]} → [${newPiles.join(', ')}]  XOR=${nimXor(newPiles)}`]);
    setPiles(newPiles);
    setSelectedPile(null);
    setRemoveCount(1);

    // Check if player just took the last stone
    if (newPiles.every((p) => p === 0)) {
      setGameOver(true);
      setPlayerWon(true);
      setTurnLog((l) => [...l, '🎉 You win! You took the last stone.']);
      return;
    }

    // Computer's turn
    setThinking(true);
    setTimeout(() => {
      const [cPile, cTarget] = optimalMove(newPiles);
      const removed2 = newPiles[cPile] - cTarget;
      const afterComp = [...newPiles];
      afterComp[cPile] = cTarget;

      setTurnLog((l) => [
        ...l,
        `CPU: Remove ${removed2} from ${PILE_LABELS[cPile]} → [${afterComp.join(', ')}]  XOR=${nimXor(afterComp)}`,
      ]);
      setPiles(afterComp);
      setThinking(false);

      if (afterComp.every((p) => p === 0)) {
        setGameOver(true);
        setPlayerWon(false);
        setTurnLog((l) => [...l, '🤖 CPU wins! It took the last stone.']);
      }
    }, 900);
  }, [selectedPile, piles, removeCount, gameOver, thinking, isPaused]);

  const resetBoard = () => {
    setPiles(INITIAL_PILES);
    setSelectedPile(null);
    setRemoveCount(1);
    setTurnLog([]);
    setGameOver(false);
    setPlayerWon(false);
    setThinking(false);
    setRemovedStones(null);
  };

  const handleRestart = () => {
    resetBoard();
    setAnswer('');
    setIsSubmitted(false);
    setIsCorrect(false);
    setSolutionText(null);
    setExplanation(null);
    setIsPaused(false);
    setTimer(0);
    setHintsRevealed(0);
  };

  const handleSubmit = useCallback(async () => {
    if (isSubmitted || answer.trim().length === 0) return;
    try {
      const res = await fetch(`/api/puzzles/${puzzleId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: answer.trim(), timeMs: timer * 1000, hintsUsed: hintsRevealed }),
      });
      const data = await res.json();
      setIsSubmitted(true);
      setIsCorrect(data.correct);
      if (data.solution) setSolutionText(data.solution);
      if (data.explanation) setExplanation(data.explanation);
    } catch {
      setIsSubmitted(true);
      setIsCorrect(false);
    }
  }, [isSubmitted, answer, puzzleId, timer, hintsRevealed]);

  const xorNow = nimXor(piles);
  const isPlayerTurn = !gameOver && !thinking;

  return (
    <div className="relative max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-xl sm:text-2xl font-bold text-txt mb-3">{title}</h1>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wide', difficultyBg)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', difficultyColor.replace('text-', 'bg-'))} />
            {difficultyLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-semibold">
            <Swords className="w-3.5 h-3.5" />
            Interactive Game
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-gold/30 bg-gold/10 text-gold text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            {xpReward} XP
          </span>
          {estimatedTimeSeconds && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-border-custom bg-surface text-txt-secondary text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(estimatedTimeSeconds)}
            </span>
          )}
        </div>
      </div>

      {/* Timer & controls */}
      <div className="flex items-center justify-between mb-6">
        <span className={cn('font-mono text-2xl font-bold tracking-wider', isTimerDanger ? 'text-error' : isTimerWarning ? 'text-gold' : 'text-txt')}>
          {timeStr.split(':')[0]}<span className="animate-[colonBlink_1s_step-end_infinite]">:</span>{timeStr.split(':')[1]}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => hintsRevealed < availableHints.length && !isSubmitted && setHintsRevealed((h) => h + 1)}
            disabled={hintsRevealed >= availableHints.length || isSubmitted}
            className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all',
              hintsRevealed < availableHints.length && !isSubmitted ? 'bg-gold/10 border-gold/30 text-gold hover:bg-gold/20' : 'bg-surface border-border-custom text-txt-secondary/40 cursor-not-allowed'
            )}
          >
            <Lightbulb className="w-4 h-4" />
            <span className="font-mono text-xs">{availableHints.length - hintsRevealed}</span>
          </button>
          <button onClick={() => setIsPaused((p) => !p)} disabled={isSubmitted} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border-custom text-txt text-sm font-medium transition-all hover:bg-surface-elevated hover:border-primary/30">
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button onClick={handleRestart} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border-custom text-txt text-sm font-medium transition-all hover:bg-error/10 hover:border-error/30 hover:text-error">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Puzzle description */}
      <div className="glass-card rounded-2xl p-5 mb-6">
        <p className="text-sm text-txt-secondary leading-relaxed">{puzzleText.split('\n')[0]}</p>
        <p className="text-xs text-txt-secondary/60 mt-2 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          Play against the CPU first, then describe the optimal strategy below to earn XP.
        </p>
      </div>

      {/* Nim board */}
      <div className="glass-card rounded-2xl p-5 mb-4">
        {/* XOR display */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-xs text-txt-secondary font-mono">
            Piles: [{piles.join(', ')}]
          </span>
          <span className={cn('text-xs font-mono font-semibold px-2 py-1 rounded-lg border', xorNow === 0 ? 'text-error border-error/30 bg-error/10' : 'text-success border-success/30 bg-success/10')}>
            XOR = {xorNow} {xorNow === 0 ? '← losing position' : '← winning position'}
          </span>
        </div>

        {/* Stone piles */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {piles.map((count, pileIdx) => (
            <button
              key={pileIdx}
              onClick={() => {
                if (!isPlayerTurn || isPaused) return;
                setSelectedPile(pileIdx === selectedPile ? null : pileIdx);
                setRemoveCount(1);
              }}
              className={cn(
                'relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all',
                selectedPile === pileIdx
                  ? 'border-primary/60 bg-primary/10 shadow-lg shadow-primary/20'
                  : 'border-border-custom/50 hover:border-primary/30 bg-surface/50',
                (!isPlayerTurn || isPaused) && 'cursor-not-allowed opacity-60',
              )}
            >
              <span className="text-xs font-semibold text-txt-secondary">{PILE_LABELS[pileIdx]}</span>
              {/* Stones grid */}
              <div className="flex flex-wrap gap-1.5 justify-center min-h-[60px] items-end">
                <AnimatePresence mode="popLayout">
                  {Array.from({ length: count }).map((_, stoneIdx) => (
                    <motion.div
                      key={stoneIdx}
                      layout
                      initial={{ opacity: 0, scale: 0, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0, y: 20 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25, delay: stoneIdx * 0.02 }}
                      className={cn('w-7 h-7 rounded-full border-2 border-white/10', STONE_COLORS[pileIdx])}
                    />
                  ))}
                </AnimatePresence>
                {count === 0 && <span className="text-xs text-txt-secondary/40 self-center">Empty</span>}
              </div>
              <span className="text-xl font-bold font-mono text-txt">{count}</span>
            </button>
          ))}
        </div>

        {/* Remove controls — shown when pile is selected */}
        <AnimatePresence>
          {selectedPile !== null && isPlayerTurn && !isPaused && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 mb-3">
                <span className="text-sm text-txt-secondary shrink-0">Remove from {PILE_LABELS[selectedPile]}:</span>
                <div className="flex items-center gap-2 ml-auto">
                  <button onClick={() => setRemoveCount((c) => Math.max(1, c - 1))} className="w-8 h-8 rounded-lg bg-surface border border-border-custom text-txt text-lg font-bold hover:bg-surface-elevated transition-colors">−</button>
                  <span className="w-8 text-center font-mono font-bold text-primary-light text-lg">{removeCount}</span>
                  <button onClick={() => setRemoveCount((c) => Math.min(piles[selectedPile], c + 1))} className="w-8 h-8 rounded-lg bg-surface border border-border-custom text-txt text-lg font-bold hover:bg-surface-elevated transition-colors">+</button>
                </div>
                <button
                  onClick={handlePlayerMove}
                  className="btn-gradient px-4 py-2 rounded-xl text-white text-sm font-semibold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status bar */}
        <div className={cn('text-center py-2 rounded-xl text-sm font-medium', thinking ? 'text-txt-secondary animate-pulse' : gameOver ? (playerWon ? 'text-success' : 'text-error') : 'text-txt-secondary')}>
          {thinking ? 'CPU is thinking...' : gameOver ? (playerWon ? '🎉 You won! Now describe the winning strategy below.' : '🤖 CPU won. Try again, then describe the strategy.') : isPlayerTurn ? '← Your turn. Click a pile to select it.' : ''}
        </div>
      </div>

      {/* Turn log */}
      {turnLog.length > 0 && (
        <div ref={logRef} className="glass-card rounded-xl p-3 mb-4 max-h-32 overflow-y-auto space-y-1">
          {turnLog.map((entry, i) => (
            <p key={i} className={cn('text-xs font-mono', entry.startsWith('You') ? 'text-primary-light' : entry.startsWith('CPU') ? 'text-accent' : 'text-gold font-semibold')}>
              {entry}
            </p>
          ))}
        </div>
      )}

      {/* Hints */}
      <AnimatePresence>
        {hintsRevealed > 0 && (
          <motion.div className="space-y-3 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {availableHints.slice(0, hintsRevealed).map((hint, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-gold/5 border border-gold/20">
                <Lightbulb className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                <p className="text-sm text-gold/90">{hint}</p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Answer input for XP */}
      {!isSubmitted && (
        <div className="glass-card rounded-2xl p-5 mb-6">
          <p className="text-sm font-semibold text-txt mb-1">Describe the Optimal Strategy</p>
          <p className="text-xs text-txt-secondary mb-3">What mathematical invariant determines the winning move? How does XOR apply?</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder='e.g. "XOR of all piles must be 0 after your move"'
              className="flex-1 px-4 py-3 rounded-xl bg-surface border border-border-custom text-txt placeholder:text-txt-secondary/50 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 hover:border-primary/30"
            />
            <button
              onClick={handleSubmit}
              disabled={answer.trim().length === 0}
              className={cn('flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all', answer.trim().length > 0 ? 'btn-gradient text-white' : 'bg-surface border border-border-custom text-txt-secondary/40 cursor-not-allowed')}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Feedback */}
      <AnimatePresence>
        {isSubmitted && (
          <motion.div className="mb-6" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
            <div className={cn('rounded-2xl border overflow-hidden', isCorrect ? 'border-success/30 bg-success/5' : 'border-error/30 bg-error/5')}>
              <div className={cn('flex items-center gap-3 px-5 py-3.5 border-b', isCorrect ? 'border-success/20 bg-success/10' : 'border-error/20 bg-error/10')}>
                {isCorrect ? <CheckCircle2 className="w-5 h-5 text-success shrink-0" /> : <XCircle className="w-5 h-5 text-error shrink-0" />}
                <span className={cn('font-semibold text-sm', isCorrect ? 'text-success' : 'text-error')}>
                  {isCorrect ? 'Correct strategy!' : 'Not quite right.'}
                </span>
              </div>
              {!isCorrect && solutionText && (
                <div className="px-5 py-4">
                  <p className="text-xs text-txt-secondary mb-1">Key insight:</p>
                  <p className="text-sm text-txt">{solutionText}</p>
                </div>
              )}
            </div>
            {!isCorrect && (
              <div className="flex gap-3 mt-4">
                <button onClick={handleRestart} className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-surface border border-border-custom text-txt text-sm font-semibold transition-all hover:bg-surface-elevated hover:border-primary/30">
                  <RotateCcw className="w-4 h-4" />Try Again
                </button>
                <Link href="/puzzles" className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl btn-gradient text-white text-sm font-semibold">
                  Next Puzzle<ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause overlay */}
      {isPaused && !isSubmitted && (
        <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-xl flex flex-col items-center justify-center gap-4">
          <div className="text-6xl font-bold text-primary-light font-mono">{formatTime(timer)}</div>
          <p className="text-xl text-txt-secondary">Game Paused</p>
          <button onClick={() => setIsPaused(false)} className="btn-gradient px-8 py-3 rounded-xl text-white font-semibold">Resume</button>
        </div>
      )}

      {/* Completion modal */}
      <AnimatePresence>
        {isSubmitted && isCorrect && (
          <motion.div className="fixed inset-0 z-[200] bg-background/85 backdrop-blur-lg flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="glass-card rounded-3xl p-8 sm:p-10 max-w-md w-full mx-4 text-center hover:transform-none" initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}>
              <div className="w-16 h-16 rounded-2xl bg-gold/20 flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-8 h-8 text-gold" />
              </div>
              <h2 className="text-2xl font-bold text-txt mb-2">Puzzle Complete!</h2>
              <p className="text-txt-secondary mb-6">You understand the XOR strategy.</p>
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-background/50 rounded-xl p-3"><Clock className="w-5 h-5 text-accent mx-auto mb-1" /><div className="font-mono text-lg font-bold text-txt">{formatTime(timer)}</div><div className="text-xs text-txt-secondary">Time</div></div>
                <div className="bg-background/50 rounded-xl p-3"><Star className="w-5 h-5 text-gold mx-auto mb-1" /><div className="font-mono text-lg font-bold text-txt">{hintsRevealed}</div><div className="text-xs text-txt-secondary">Hints Used</div></div>
                <div className="bg-background/50 rounded-xl p-3"><Zap className="w-5 h-5 text-primary-light mx-auto mb-1" /><div className="font-mono text-lg font-bold text-accent">+{totalXP}</div><div className="text-xs text-txt-secondary">XP Earned</div></div>
              </div>
              <div className="flex flex-col gap-3">
                <Link href="/puzzles" className="btn-gradient flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold">Next Puzzle<ArrowRight className="w-4 h-4" /></Link>
                <Link href="/dashboard" className="text-sm text-txt-secondary hover:text-primary-light transition-colors">Back to Dashboard</Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
