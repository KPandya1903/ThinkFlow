'use client';

import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Zap,
  Clock,
  Star,
  ArrowRight,
  Lightbulb,
  Send,
  Pause,
  Play,
  RotateCcw,
  Calculator,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import { cn, formatTime, getDifficultyColor, getDifficultyLabel } from '@/lib/utils';
import ScratchPad from './ScratchPad';

// ─── Log slider helpers ──────────────────────────────────────────────────────

const LOG_MIN = 0;   // 10^0  = 1
const LOG_MAX = 12;  // 10^12 = 1 trillion

function logToValue(log: number): number {
  return Math.pow(10, log);
}

function valueToLog(value: number): number {
  if (value <= 0) return LOG_MIN;
  return Math.log10(value);
}

function formatEstimate(value: number): string {
  if (value < 1000) return Math.round(value).toLocaleString();
  if (value < 1_000_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  if (value < 1_000_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value < 1_000_000_000_000) return `${(value / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')}B`;
  return `${(value / 1_000_000_000_000).toFixed(2).replace(/\.?0+$/, '')}T`;
}

function formatFull(value: number): string {
  return Math.round(value).toLocaleString();
}

const MAGNITUDE_LABELS = [
  { log: 0, label: '1' },
  { log: 3, label: '1K' },
  { log: 6, label: '1M' },
  { log: 9, label: '1B' },
  { log: 12, label: '1T' },
];

// ─── Text rendering ──────────────────────────────────────────────────────────

function renderInlineFormatting(text: string): ReactNode {
  const parts = text.split(/(".*?"|'.*?'|\*\*.*?\*\*)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-semibold text-txt">{part.slice(2, -2)}</strong>;
    if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith('\u201c') && part.endsWith('\u201d')))
      return <em key={i} className="italic text-primary-light/90">{part}</em>;
    return part;
  });
}

function renderFormattedText(text: string): ReactNode[] {
  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    if (trimmed === '') { elements.push(<div key={`br-${lineIdx}`} className="h-3" />); return; }

    // Part N: section headers
    const partMatch = trimmed.match(/^(Part\s+\d+|Setup|Question|Note|Constraint|Consider|Key insight):\s*(.*)/i);
    if (partMatch) {
      elements.push(
        <div key={lineIdx} className="flex items-start gap-3 py-1.5 mt-2">
          <div className="w-0.5 h-full bg-gold/40 self-stretch shrink-0 rounded-full" />
          <div>
            <span className="text-gold text-xs font-bold uppercase tracking-widest">{partMatch[1]}:</span>
            {partMatch[2] && <span className="text-txt ml-2">{renderInlineFormatting(partMatch[2])}</span>}
          </div>
        </div>
      );
      return;
    }

    const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);
    if (numberedMatch) {
      elements.push(
        <div key={lineIdx} className="flex gap-3 pl-1 py-0.5">
          <span className="text-accent font-mono font-semibold text-sm min-w-[1.5rem] text-right shrink-0">{numberedMatch[1]}.</span>
          <span className="text-txt">{renderInlineFormatting(numberedMatch[2])}</span>
        </div>
      );
      return;
    }

    const bulletMatch = trimmed.match(/^[-*\u2022]\s+(.*)/);
    if (bulletMatch) {
      elements.push(
        <div key={lineIdx} className="flex gap-3 pl-1 py-0.5">
          <span className="text-accent mt-1.5 shrink-0"><span className="block w-1.5 h-1.5 rounded-full bg-accent/60" /></span>
          <span className="text-txt">{renderInlineFormatting(bulletMatch[1])}</span>
        </div>
      );
      return;
    }

    elements.push(<p key={lineIdx} className="text-txt py-0.5">{renderInlineFormatting(trimmed)}</p>);
  });
  return elements;
}

// ─── Difficulty ──────────────────────────────────────────────────────────────

const DIFFICULTY_BG: Record<number, string> = {
  1: 'bg-success/15 border-success/30 text-success',
  2: 'bg-accent/15 border-accent/30 text-accent',
  3: 'bg-gold/15 border-gold/30 text-gold',
  4: 'bg-error/15 border-error/30 text-error',
  5: 'bg-primary-light/15 border-primary-light/30 text-primary-light',
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface FermiSliderGameProps {
  puzzleId: string;
  puzzleText: string;
  title: string;
  difficulty: number;
  estimatedTimeSeconds?: number;
  hints?: string[] | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FermiSliderGame({
  puzzleId,
  puzzleText,
  title,
  difficulty,
  estimatedTimeSeconds,
  hints,
}: FermiSliderGameProps) {
  // ─── Slider state ──────────────────────────────────────────────────────
  const [sliderLog, setSliderLog] = useState(5); // default 100,000
  const currentValue = logToValue(sliderLog);

  // ─── Game state ────────────────────────────────────────────────────────
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timer, setTimer] = useState(0);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [acceptableRange, setAcceptableRange] = useState<[number, number] | null>(null);
  const [solutionText, setSolutionText] = useState<string | null>(null);
  const [userSubmittedValue, setUserSubmittedValue] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const availableHints = hints ?? [];

  // ─── Timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isSubmitted || isPaused) return;
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isSubmitted, isPaused]);

  // ─── XP ───────────────────────────────────────────────────────────────
  const xpReward = difficulty <= 1 ? 25 : difficulty === 2 ? 35 : difficulty === 3 ? 50 : 75;
  const timeBonus = Math.max(0, Math.floor((600 - timer) / 60) * 5);
  const hintPenalty = hintsRevealed * 10;
  const totalXP = Math.max(xpReward, xpReward + timeBonus - hintPenalty);

  const formattedPuzzleText = useMemo(() => renderFormattedText(puzzleText), [puzzleText]);

  // ─── Acceptable range on slider ────────────────────────────────────────
  const rangeOnSlider = useMemo(() => {
    if (!acceptableRange) return null;
    const [low, high] = acceptableRange;
    const logLow = Math.max(LOG_MIN, valueToLog(low));
    const logHigh = Math.min(LOG_MAX, valueToLog(high));
    const leftPct = ((logLow - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100;
    const rightPct = ((logHigh - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100;
    return { leftPct, rightPct };
  }, [acceptableRange]);

  // ─── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (isSubmitted) return;
    const submitValue = Math.round(currentValue);
    setUserSubmittedValue(submitValue);

    try {
      const res = await fetch(`/api/puzzles/${puzzleId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer: String(submitValue),
          timeMs: timer * 1000,
          hintsUsed: hintsRevealed,
        }),
      });
      const data = await res.json();
      setIsSubmitted(true);
      setIsCorrect(data.correct);
      if (data.explanation) setExplanation(data.explanation);
      if (data.acceptableRange) setAcceptableRange(data.acceptableRange);
      if (data.solution) setSolutionText(data.solution);
    } catch {
      setIsSubmitted(true);
      setIsCorrect(false);
    }
  }, [isSubmitted, currentValue, puzzleId, timer, hintsRevealed]);

  const handleRevealHint = useCallback(() => {
    if (hintsRevealed < availableHints.length) setHintsRevealed((h) => h + 1);
  }, [hintsRevealed, availableHints.length]);

  const handleRestart = useCallback(() => {
    setSliderLog(5);
    setIsSubmitted(false);
    setIsCorrect(false);
    setIsPaused(false);
    setTimer(0);
    setHintsRevealed(0);
    setExplanation(null);
    setAcceptableRange(null);
    setSolutionText(null);
    setUserSubmittedValue(null);
  }, []);

  // ─── Derived ───────────────────────────────────────────────────────────
  const timeStr = formatTime(timer);
  const isTimerWarning = timer > 600;
  const isTimerDanger = timer > 900;
  const difficultyLabel = getDifficultyLabel(difficulty);
  const difficultyColor = getDifficultyColor(difficulty);
  const difficultyBg = DIFFICULTY_BG[difficulty] ?? DIFFICULTY_BG[1];

  // Slider thumb percent for CSS
  const thumbPct = ((sliderLog - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100;

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
            <TrendingUp className="w-3.5 h-3.5" />
            Fermi Estimation
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
          {timeStr.split(':')[0]}
          <span className="animate-[colonBlink_1s_step-end_infinite]">:</span>
          {timeStr.split(':')[1]}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRevealHint}
            disabled={hintsRevealed >= availableHints.length || isSubmitted}
            className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all',
              hintsRevealed < availableHints.length && !isSubmitted
                ? 'bg-gold/10 border-gold/30 text-gold hover:bg-gold/20'
                : 'bg-surface border-border-custom text-txt-secondary/40 cursor-not-allowed'
            )}
          >
            <Lightbulb className="w-4 h-4" />
            <span className="font-mono text-xs">{availableHints.length - hintsRevealed}</span>
          </button>
          <button
            onClick={() => setIsPaused((p) => !p)}
            disabled={isSubmitted}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border-custom text-txt text-sm font-medium transition-all hover:bg-surface-elevated hover:border-primary/30"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border-custom text-txt text-sm font-medium transition-all hover:bg-error/10 hover:border-error/30 hover:text-error"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Puzzle text */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 mb-6">
        <div className="text-base sm:text-lg leading-relaxed space-y-0.5">
          {formattedPuzzleText}
        </div>
        <ScratchPad className="mt-6" />
      </div>

      {/* Hints */}
      <AnimatePresence>
        {hintsRevealed > 0 && (
          <motion.div className="space-y-3 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {availableHints.slice(0, hintsRevealed).map((hint, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 px-4 py-3 rounded-xl bg-gold/5 border border-gold/20"
              >
                <Lightbulb className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                <p className="text-sm text-gold/90">{hint}</p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slider input */}
      {!isSubmitted && (
        <motion.div
          className="mb-6 glass-card rounded-2xl p-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Current estimate display */}
          <div className="text-center mb-6">
            <p className="text-xs text-txt-secondary uppercase tracking-widest font-semibold mb-2">Your Estimate</p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-4xl sm:text-5xl font-bold font-mono text-primary-light">
                {formatEstimate(currentValue)}
              </span>
              <span className="text-sm text-txt-secondary font-mono">
                ({formatFull(currentValue)})
              </span>
            </div>
          </div>

          {/* Slider track + thumb */}
          <div className="relative mb-3">
            {/* Track background */}
            <div className="relative h-3 rounded-full bg-surface-elevated border border-border-custom/40 overflow-hidden">
              {/* Fill up to thumb */}
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary/40 to-primary-light/70 rounded-full transition-all duration-75"
                style={{ width: `${thumbPct}%` }}
              />
            </div>

            {/* HTML range input (invisible, full-width, on top) */}
            <input
              type="range"
              min={LOG_MIN}
              max={LOG_MAX}
              step={0.01}
              value={sliderLog}
              disabled={isPaused}
              onChange={(e) => setSliderLog(parseFloat(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-3"
              style={{ WebkitAppearance: 'none' }}
            />

            {/* Custom thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-primary-light border-2 border-white/20 shadow-lg shadow-primary/30 pointer-events-none transition-[left] duration-75"
              style={{ left: `${thumbPct}%` }}
            />
          </div>

          {/* Magnitude labels */}
          <div className="flex justify-between mt-1 px-0.5">
            {MAGNITUDE_LABELS.map(({ log, label }) => {
              const pct = ((log - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100;
              const isActive = Math.abs(sliderLog - log) < 0.5;
              return (
                <div
                  key={log}
                  className={cn(
                    'text-xs font-mono transition-colors',
                    isActive ? 'text-primary-light font-bold' : 'text-txt-secondary/50',
                  )}
                  style={{ position: 'relative', left: log === 0 ? 0 : log === LOG_MAX ? 'auto' : undefined }}
                >
                  {label}
                </div>
              );
            })}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isPaused}
            className={cn(
              'mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all',
              !isPaused ? 'btn-gradient text-white' : 'bg-surface border border-border-custom text-txt-secondary/40 cursor-not-allowed',
            )}
          >
            <Calculator className="w-4 h-4" />
            Submit Estimate: {formatEstimate(currentValue)}
          </button>
        </motion.div>
      )}

      {/* Feedback — incorrect */}
      <AnimatePresence>
        {isSubmitted && !isCorrect && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="rounded-2xl border border-error/30 bg-error/5 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-error/20 bg-error/10">
                <XCircle className="w-5 h-5 text-error shrink-0" />
                <span className="font-semibold text-error text-sm">Not quite — outside the acceptable range</span>
              </div>
              <div className="px-5 py-4 space-y-4">
                {/* Visual range indicator */}
                {acceptableRange && rangeOnSlider && (
                  <div>
                    <p className="text-xs text-txt-secondary mb-2">Where you are vs acceptable range:</p>
                    <div className="relative h-4 rounded-full bg-surface-elevated border border-border-custom/40 overflow-hidden">
                      {/* Acceptable range highlight */}
                      <div
                        className="absolute top-0 h-full bg-success/25 border-l border-r border-success/40"
                        style={{ left: `${rangeOnSlider.leftPct}%`, width: `${rangeOnSlider.rightPct - rangeOnSlider.leftPct}%` }}
                      />
                      {/* User's position */}
                      {userSubmittedValue && (
                        <div
                          className="absolute top-0 h-full w-0.5 bg-error"
                          style={{ left: `${((valueToLog(userSubmittedValue) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100}%` }}
                        />
                      )}
                    </div>
                    <div className="flex justify-between text-xs mt-1 text-txt-secondary/60 font-mono">
                      <span>1</span>
                      <span className="text-success">
                        {formatEstimate(acceptableRange[0])} – {formatEstimate(acceptableRange[1])}
                      </span>
                      <span>1T</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-txt-secondary">Your estimate: </span>
                    <span className="font-mono font-semibold text-error">{userSubmittedValue !== null ? formatEstimate(userSubmittedValue) : '—'}</span>
                  </div>
                  {acceptableRange && (
                    <div>
                      <span className="text-txt-secondary">Acceptable: </span>
                      <span className="font-mono font-semibold text-success">
                        {formatEstimate(acceptableRange[0])} – {formatEstimate(acceptableRange[1])}
                      </span>
                    </div>
                  )}
                  {solutionText && (
                    <div>
                      <span className="text-txt-secondary">Target: </span>
                      <span className="font-mono font-semibold text-accent">{solutionText}</span>
                    </div>
                  )}
                </div>

                {explanation && (
                  <div className="pt-3 border-t border-error/15">
                    <p className="text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-1.5">Dimensional Analysis</p>
                    <div className="text-sm text-txt leading-relaxed">{renderFormattedText(explanation)}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                onClick={handleRestart}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-surface border border-border-custom text-txt text-sm font-semibold transition-all hover:bg-surface-elevated hover:border-primary/30"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
              <Link href="/puzzles" className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl btn-gradient text-white text-sm font-semibold">
                Next Puzzle
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback — correct (inline) */}
      {isSubmitted && isCorrect && explanation && (
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="rounded-2xl border border-success/30 bg-success/5 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-success/20 bg-success/10">
              <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
              <span className="font-semibold text-success text-sm">Nailed it — within the acceptable range!</span>
            </div>
            <div className="px-5 py-4">
              {acceptableRange && (
                <div className="flex flex-wrap gap-4 text-sm mb-4">
                  <div>
                    <span className="text-txt-secondary">Your estimate: </span>
                    <span className="font-mono font-semibold text-success">{userSubmittedValue !== null ? formatEstimate(userSubmittedValue) : '—'}</span>
                  </div>
                  <div>
                    <span className="text-txt-secondary">Range: </span>
                    <span className="font-mono font-semibold text-accent">
                      {formatEstimate(acceptableRange[0])} – {formatEstimate(acceptableRange[1])}
                    </span>
                  </div>
                </div>
              )}
              <p className="text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-1.5">Dimensional Analysis</p>
              <div className="text-sm text-txt leading-relaxed">{renderFormattedText(explanation)}</div>
            </div>
          </div>
        </motion.div>
      )}

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
          <motion.div
            className="fixed inset-0 z-[200] bg-background/85 backdrop-blur-lg flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="glass-card rounded-3xl p-8 sm:p-10 max-w-md w-full mx-4 text-center hover:transform-none"
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
            >
              <div className="w-16 h-16 rounded-2xl bg-gold/20 flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-8 h-8 text-gold" />
              </div>
              <h2 className="text-2xl font-bold text-txt mb-2">Puzzle Complete!</h2>
              <p className="text-txt-secondary mb-6">Excellent estimation reasoning.</p>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-background/50 rounded-xl p-3">
                  <Clock className="w-5 h-5 text-accent mx-auto mb-1" />
                  <div className="font-mono text-lg font-bold text-txt">{formatTime(timer)}</div>
                  <div className="text-xs text-txt-secondary">Time</div>
                </div>
                <div className="bg-background/50 rounded-xl p-3">
                  <Star className="w-5 h-5 text-gold mx-auto mb-1" />
                  <div className="font-mono text-lg font-bold text-txt">{hintsRevealed}</div>
                  <div className="text-xs text-txt-secondary">Hints Used</div>
                </div>
                <div className="bg-background/50 rounded-xl p-3">
                  <Zap className="w-5 h-5 text-primary-light mx-auto mb-1" />
                  <div className="font-mono text-lg font-bold text-accent">+{totalXP}</div>
                  <div className="text-xs text-txt-secondary">XP Earned</div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Link href="/puzzles" className="btn-gradient flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold">
                  Next Puzzle
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/dashboard" className="text-sm text-txt-secondary hover:text-primary-light transition-colors">
                  Back to Dashboard
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
