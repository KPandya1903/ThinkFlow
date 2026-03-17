'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Zap, Clock, Star, ArrowRight, Lightbulb,
  Send, Pause, Play, RotateCcw, Dice5, CheckCircle2, XCircle, BarChart2, FastForward,
} from 'lucide-react';
import { cn, formatTime, getDifficultyColor, getDifficultyLabel } from '@/lib/utils';

// ─── Monty Hall simulation logic ──────────────────────────────────────────────

type Phase = 'pick' | 'reveal' | 'decide' | 'result';

function pickRandomDoor(exclude: number[] = []): number {
  const choices = [0, 1, 2].filter((d) => !exclude.includes(d));
  return choices[Math.floor(Math.random() * choices.length)];
}

// ─── Difficulty badge ─────────────────────────────────────────────────────────

const DIFFICULTY_BG: Record<number, string> = {
  1: 'bg-success/15 border-success/30 text-success',
  2: 'bg-accent/15 border-accent/30 text-accent',
  3: 'bg-gold/15 border-gold/30 text-gold',
  4: 'bg-error/15 border-error/30 text-error',
  5: 'bg-primary-light/15 border-primary-light/30 text-primary-light',
};

// ─── Door component ───────────────────────────────────────────────────────────

interface DoorProps {
  index: number;
  isSelected: boolean;
  isRevealed: boolean;
  isCarDoor: boolean;
  phase: Phase;
  onClick: () => void;
}

function Door({ index, isSelected, isRevealed, isCarDoor, phase, onClick }: DoorProps) {
  const isOpen = isRevealed || phase === 'result';
  const canClick = phase === 'pick' || (phase === 'decide' && !isRevealed);

  return (
    <motion.button
      onClick={canClick ? onClick : undefined}
      whileHover={canClick ? { scale: 1.04 } : {}}
      whileTap={canClick ? { scale: 0.97 } : {}}
      className={cn(
        'relative flex flex-col items-center justify-end rounded-2xl border-2 overflow-hidden transition-all',
        'w-full aspect-[2/3] max-w-[140px] mx-auto',
        isSelected && (phase === 'pick' || phase === 'decide')
          ? 'border-primary shadow-lg shadow-primary/30 bg-primary/10'
          : phase === 'result' && isSelected && isCarDoor
          ? 'border-success shadow-lg shadow-success/30 bg-success/10'
          : phase === 'result' && isSelected && !isCarDoor
          ? 'border-error shadow-lg shadow-error/20 bg-error/10'
          : 'border-border-custom bg-surface/60',
        canClick ? 'cursor-pointer hover:border-primary/50' : 'cursor-default',
        isRevealed && 'opacity-70',
      )}
    >
      {/* Door number */}
      <div className="absolute top-3 left-0 right-0 flex justify-center">
        <span className="text-xs font-bold text-txt-secondary bg-surface/80 px-2 py-0.5 rounded-full">
          {index + 1}
        </span>
      </div>

      {/* Door panel decoration */}
      {!isOpen && (
        <div className="absolute inset-4 top-10 rounded-xl border border-border-custom/40 bg-surface-elevated/40">
          {/* Door knob */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gold/60" />
          {/* Panel lines */}
          <div className="absolute top-3 left-3 right-3 h-px bg-border-custom/30" />
          <div className="absolute bottom-3 left-3 right-3 h-px bg-border-custom/30" />
        </div>
      )}

      {/* Content behind door */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {isCarDoor ? (
              <>
                <span className="text-5xl">🚗</span>
                <span className="text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">CAR</span>
              </>
            ) : (
              <>
                <span className="text-5xl">🐐</span>
                <span className="text-xs font-semibold text-txt-secondary bg-surface/60 px-2 py-0.5 rounded-full">Goat</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected indicator */}
      {isSelected && !isRevealed && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center">
          <span className="text-xs font-bold text-primary-light bg-primary/20 px-2 py-0.5 rounded-full">Picked</span>
        </div>
      )}
    </motion.button>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface MontyHallGameProps {
  puzzleId: string;
  puzzleText: string;
  title: string;
  difficulty: number;
  estimatedTimeSeconds?: number;
  hints?: string[] | null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MontyHallGame({
  puzzleId,
  puzzleText,
  title,
  difficulty,
  estimatedTimeSeconds,
  hints,
}: MontyHallGameProps) {
  // ─── Game state ────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('pick');
  const [carDoor, setCarDoor] = useState<number>(() => pickRandomDoor());
  const [playerDoor, setPlayerDoor] = useState<number | null>(null);
  const [revealedDoor, setRevealedDoor] = useState<number | null>(null);
  const [playerSwitched, setPlayerSwitched] = useState<boolean | null>(null);
  const [lastWon, setLastWon] = useState<boolean | null>(null);

  // ─── Stats ─────────────────────────────────────────────────────────────
  const [stats, setStats] = useState({ switchWins: 0, switchLosses: 0, stayWins: 0, stayLosses: 0 });
  const totalGames = stats.switchWins + stats.switchLosses + stats.stayWins + stats.stayLosses;
  const switchTotal = stats.switchWins + stats.switchLosses;
  const stayTotal = stats.stayWins + stats.stayLosses;
  const switchWinPct = switchTotal > 0 ? (stats.switchWins / switchTotal) * 100 : 0;
  const stayWinPct = stayTotal > 0 ? (stats.stayWins / stayTotal) * 100 : 0;

  // ─── Answer submission ─────────────────────────────────────────────────
  const [answer, setAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [solutionText, setSolutionText] = useState<string | null>(null);

  // ─── Timer ─────────────────────────────────────────────────────────────
  const [isPaused, setIsPaused] = useState(false);
  const [timer, setTimer] = useState(0);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const availableHints = hints ?? [];

  useEffect(() => {
    if (isSubmitted || isPaused) return;
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isSubmitted, isPaused]);

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

  // ─── Game actions ──────────────────────────────────────────────────────

  const startNewRound = useCallback(() => {
    const newCar = pickRandomDoor();
    setCarDoor(newCar);
    setPlayerDoor(null);
    setRevealedDoor(null);
    setPlayerSwitched(null);
    setLastWon(null);
    setPhase('pick');
  }, []);

  const handlePickDoor = useCallback((door: number) => {
    if (phase !== 'pick') return;
    setPlayerDoor(door);
    // Monty reveals a goat door that is neither the player's door nor the car door
    const revealed = pickRandomDoor([door, carDoor]);
    setRevealedDoor(revealed);
    setPhase('reveal');
    setTimeout(() => setPhase('decide'), 600);
  }, [phase, carDoor]);

  const handleDecide = useCallback((switched: boolean) => {
    if (phase !== 'decide' || playerDoor === null || revealedDoor === null) return;
    let finalDoor: number;
    if (switched) {
      finalDoor = [0, 1, 2].find((d) => d !== playerDoor && d !== revealedDoor)!;
    } else {
      finalDoor = playerDoor;
    }
    const won = finalDoor === carDoor;
    setPlayerDoor(finalDoor);
    setPlayerSwitched(switched);
    setLastWon(won);
    setPhase('result');
    setStats((s) => ({
      ...s,
      ...(switched ? (won ? { switchWins: s.switchWins + 1 } : { switchLosses: s.switchLosses + 1 }) : (won ? { stayWins: s.stayWins + 1 } : { stayLosses: s.stayLosses + 1 })),
    }));
  }, [phase, playerDoor, revealedDoor, carDoor]);

  // ─── Run N simulated trials ────────────────────────────────────────────
  const runSimulation = useCallback((n: number) => {
    let sw = 0, sl = 0, stw = 0, stl = 0;
    for (let i = 0; i < n; i++) {
      const car = Math.floor(Math.random() * 3);
      const pick = Math.floor(Math.random() * 3);
      // Monty reveals a goat
      const opts = [0, 1, 2].filter((d) => d !== pick && d !== car);
      // Player switches
      const switchDoor = [0, 1, 2].find((d) => d !== pick && d !== opts[0])!;
      if (switchDoor === car) sw++; else sl++;
      // Player stays
      if (pick === car) stw++; else stl++;
    }
    setStats((s) => ({ switchWins: s.switchWins + sw, switchLosses: s.switchLosses + sl, stayWins: s.stayWins + stw, stayLosses: s.stayLosses + stl }));
    startNewRound();
  }, [startNewRound]);

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
    } catch {
      setIsSubmitted(true);
      setIsCorrect(false);
    }
  }, [isSubmitted, answer, puzzleId, timer, hintsRevealed]);

  const handleRestart = () => {
    startNewRound();
    setAnswer('');
    setIsSubmitted(false);
    setIsCorrect(false);
    setSolutionText(null);
    setIsPaused(false);
    setTimer(0);
    setHintsRevealed(0);
    setStats({ switchWins: 0, switchLosses: 0, stayWins: 0, stayLosses: 0 });
  };

  // ─── Instruction text per phase ────────────────────────────────────────
  const phaseText: Record<Phase, string> = {
    pick: 'Step 1: Click a door to make your initial choice.',
    reveal: 'Monty is revealing a goat...',
    decide: 'Step 2: Monty revealed a goat. Switch doors or stay?',
    result: lastWon ? '🎉 You won the car!' : "🐐 You got a goat. Better luck next time!",
  };

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
            <Dice5 className="w-3.5 h-3.5" />
            Interactive Simulation
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
          <button onClick={() => hintsRevealed < availableHints.length && !isSubmitted && setHintsRevealed((h) => h + 1)} disabled={hintsRevealed >= availableHints.length || isSubmitted} className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all', hintsRevealed < availableHints.length && !isSubmitted ? 'bg-gold/10 border-gold/30 text-gold hover:bg-gold/20' : 'bg-surface border-border-custom text-txt-secondary/40 cursor-not-allowed')}>
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

      {/* Game area */}
      <div className="glass-card rounded-2xl p-6 mb-4">
        {/* Phase instruction */}
        <motion.p
          key={phase}
          className={cn('text-center text-sm font-medium mb-5', phase === 'result' ? (lastWon ? 'text-success' : 'text-error') : 'text-txt-secondary')}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {phaseText[phase]}
        </motion.p>

        {/* Doors */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[0, 1, 2].map((door) => (
            <Door
              key={door}
              index={door}
              isSelected={playerDoor === door}
              isRevealed={revealedDoor === door}
              isCarDoor={carDoor === door}
              phase={phase}
              onClick={() => phase === 'pick' ? handlePickDoor(door) : undefined}
            />
          ))}
        </div>

        {/* Switch / Stay buttons */}
        <AnimatePresence>
          {phase === 'decide' && (
            <motion.div className="flex gap-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <button
                onClick={() => handleDecide(true)}
                className="flex-1 py-3 rounded-xl bg-primary/15 border border-primary/40 text-primary-light font-semibold text-sm hover:bg-primary/25 transition-all"
              >
                🔄 Switch Door
              </button>
              <button
                onClick={() => handleDecide(false)}
                className="flex-1 py-3 rounded-xl bg-surface border border-border-custom text-txt font-semibold text-sm hover:bg-surface-elevated hover:border-primary/30 transition-all"
              >
                🔒 Stay
              </button>
            </motion.div>
          )}
          {phase === 'result' && (
            <motion.div className="flex flex-col sm:flex-row gap-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <button onClick={startNewRound} className="flex-1 py-2.5 rounded-xl bg-primary/15 border border-primary/40 text-primary-light font-semibold text-sm hover:bg-primary/25 transition-all">
                Play Again
              </button>
              <button onClick={() => runSimulation(100)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-surface border border-border-custom text-txt text-sm font-medium hover:bg-surface-elevated transition-all">
                <FastForward className="w-3.5 h-3.5" />
                Run 100 Trials
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats panel */}
      {totalGames > 0 && (
        <motion.div className="glass-card rounded-2xl p-5 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-txt">Results after {totalGames} games</span>
          </div>

          <div className="space-y-3">
            {/* Switch row */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-primary-light font-semibold">Switch strategy</span>
                <span className="font-mono text-txt-secondary">{stats.switchWins}W / {stats.switchLosses}L = <span className="text-primary-light font-bold">{switchWinPct.toFixed(0)}%</span></span>
              </div>
              <div className="h-2.5 rounded-full bg-surface-elevated overflow-hidden">
                <motion.div className="h-full bg-primary-light/70 rounded-full" animate={{ width: `${switchWinPct}%` }} transition={{ type: 'spring', stiffness: 100, damping: 20 }} />
              </div>
            </div>
            {/* Stay row */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-txt-secondary font-semibold">Stay strategy</span>
                <span className="font-mono text-txt-secondary">{stats.stayWins}W / {stats.stayLosses}L = <span className="text-txt font-bold">{stayWinPct.toFixed(0)}%</span></span>
              </div>
              <div className="h-2.5 rounded-full bg-surface-elevated overflow-hidden">
                <motion.div className="h-full bg-txt-secondary/40 rounded-full" animate={{ width: `${stayWinPct}%` }} transition={{ type: 'spring', stiffness: 100, damping: 20 }} />
              </div>
            </div>
            {/* Theory reference */}
            <p className="text-xs text-txt-secondary/60 font-mono">Theory: Switch = 66.7% | Stay = 33.3%</p>
          </div>
        </motion.div>
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

      {/* Answer input */}
      {!isSubmitted && (
        <div className="glass-card rounded-2xl p-5 mb-6">
          <p className="text-sm font-semibold text-txt mb-1">What is the probability of winning by switching?</p>
          <p className="text-xs text-txt-secondary mb-3">Express as a fraction or percentage. Explain why using Bayes' theorem.</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder='e.g. "2/3" or "66.7%"'
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
                <span className={cn('font-semibold text-sm', isCorrect ? 'text-success' : 'text-error')}>{isCorrect ? 'Correct!' : 'Not quite.'}</span>
              </div>
              {!isCorrect && solutionText && (
                <div className="px-5 py-4">
                  <p className="text-xs text-txt-secondary mb-1">The correct answer:</p>
                  <p className="text-sm text-txt">{solutionText}</p>
                </div>
              )}
            </div>
            {!isCorrect && (
              <div className="flex gap-3 mt-4">
                <button onClick={handleRestart} className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-surface border border-border-custom text-txt text-sm font-semibold transition-all hover:bg-surface-elevated">
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
              <p className="text-txt-secondary mb-6">You understand conditional probability.</p>
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
