'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  Check,
} from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';

interface Choice {
  label: string;
  text: string;
}

interface MultiChoiceGameProps {
  puzzleId: string;
  context?: string;
  stem: string;
  choices: Choice[];
  title: string;
  difficulty: number;
  estimatedTimeSeconds?: number;
  hints?: string[] | null;
}

export default function MultiChoiceGame({
  puzzleId,
  context,
  stem,
  choices,
  title,
  difficulty,
  estimatedTimeSeconds,
  hints,
}: MultiChoiceGameProps) {
  // ─── State ──────────────────────────────────────────────────────────────
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timer, setTimer] = useState(0);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [correctKey, setCorrectKey] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const availableHints = hints ?? [];

  // ─── Timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isSubmitted || isPaused) return;
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSubmitted, isPaused]);

  // ─── XP calculation ─────────────────────────────────────────────────────
  const xpReward = difficulty <= 1 ? 25 : difficulty === 2 ? 35 : difficulty === 3 ? 50 : 75;
  const timeBonus = Math.max(0, Math.floor((600 - timer) / 60) * 5);
  const hintPenalty = hintsRevealed * 10;
  const totalXP = Math.max(xpReward, xpReward + timeBonus - hintPenalty);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (isSubmitted || !selectedKey) return;

    try {
      const res = await fetch(`/api/puzzles/${puzzleId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: selectedKey, timeMs: timer * 1000, hintsUsed: hintsRevealed }),
      });

      const data = await res.json();
      setIsSubmitted(true);
      setIsCorrect(data.correct);
      if (data.solution) setCorrectKey(data.solution);
      if (data.correct) {
        setFeedbackMessage(`Correct! +${data.xpEarned || 0} XP`);
      } else {
        setFeedbackMessage(`Incorrect. The answer was: ${data.solution || '?'}`);
      }
    } catch {
      setIsSubmitted(true);
      setIsCorrect(false);
      setFeedbackMessage('Network error. Please try again.');
    }
  }, [selectedKey, isSubmitted, puzzleId]);

  const handleRevealHint = useCallback(() => {
    if (hintsRevealed < availableHints.length) {
      setHintsRevealed((h) => h + 1);
    }
  }, [hintsRevealed, availableHints.length]);

  const handleRestart = useCallback(() => {
    setSelectedKey(null);
    setIsSubmitted(false);
    setIsCorrect(false);
    setIsPaused(false);
    setTimer(0);
    setHintsRevealed(0);
    setFeedbackMessage('');
    setCorrectKey(null);
  }, []);

  // ─── Derived ────────────────────────────────────────────────────────────
  const timeStr = formatTime(timer);
  const isTimerWarning = timer > 600;
  const isTimerDanger = timer > 900;

  return (
    <div className="relative max-w-2xl mx-auto">
      {/* Puzzle info header */}
      <div className="mb-6 text-center">
        <h1 className="text-xl sm:text-2xl font-bold text-txt mb-1">{title}</h1>
        <div className="flex items-center justify-center gap-3 text-sm text-txt-secondary flex-wrap">
          <span className="text-accent font-medium">Brain Teaser</span>
          <span className="text-border-custom">|</span>
          <span className="flex items-center gap-1">
            <Zap className="w-4 h-4 text-gold" />
            <span className="font-mono font-semibold text-gold">{xpReward} XP</span>
          </span>
          <span className="text-border-custom">|</span>
          <span>
            Difficulty:{' '}
            <span className="font-semibold text-primary-light">
              {['', 'Easy', 'Medium', 'Hard', 'Expert', 'Master'][difficulty]}
            </span>
          </span>
          {estimatedTimeSeconds && (
            <>
              <span className="text-border-custom">|</span>
              <span>
                Est.{' '}
                <span className="font-semibold text-primary-light">
                  {formatTime(estimatedTimeSeconds)}
                </span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Timer & controls bar */}
      <div className="flex items-center justify-between mb-6">
        <span
          className={cn(
            'font-mono text-2xl font-bold tracking-wider',
            isTimerDanger ? 'text-error' : isTimerWarning ? 'text-gold' : 'text-txt',
          )}
        >
          {timeStr.split(':')[0]}
          <span className="animate-[colonBlink_1s_step-end_infinite]">:</span>
          {timeStr.split(':')[1]}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRevealHint}
            disabled={hintsRevealed >= availableHints.length || isSubmitted}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all',
              hintsRevealed < availableHints.length && !isSubmitted
                ? 'bg-gold/10 border-gold/30 text-gold hover:bg-gold/20'
                : 'bg-surface border-border-custom text-txt-secondary/40 cursor-not-allowed',
            )}
            aria-label={`Use hint (${availableHints.length - hintsRevealed} remaining)`}
          >
            <Lightbulb className="w-4 h-4" />
            <span className="font-mono text-xs">{availableHints.length - hintsRevealed}</span>
          </button>

          <button
            onClick={() => setIsPaused((p) => !p)}
            disabled={isSubmitted}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border-custom text-txt text-sm font-medium transition-all hover:bg-surface-elevated hover:border-primary/30"
            aria-label={isPaused ? 'Resume game' : 'Pause game'}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border-custom text-txt text-sm font-medium transition-all hover:bg-error/10 hover:border-error/30 hover:text-error"
            aria-label="Restart puzzle"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Context passage (LSAT-style) */}
      {context && (
        <div className="glass-card rounded-2xl p-6 sm:p-8 mb-4 border-l-4 border-primary/40">
          <p className="text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-3">Passage</p>
          <p className="text-txt text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{context}</p>
        </div>
      )}

      {/* Question stem card */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 mb-6">
        <p className="text-txt text-base sm:text-lg leading-relaxed whitespace-pre-wrap">
          {stem}
        </p>
      </div>

      {/* Hints section */}
      {hintsRevealed > 0 && (
        <div className="space-y-3 mb-6">
          {availableHints.slice(0, hintsRevealed).map((hint, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-3 rounded-xl bg-gold/5 border border-gold/20 animate-fade-in"
            >
              <Lightbulb className="w-4 h-4 text-gold mt-0.5 shrink-0" />
              <p className="text-sm text-gold/90">{hint}</p>
            </div>
          ))}
        </div>
      )}

      {/* Multiple choice options */}
      <div className="space-y-3 mb-6">
        {choices.map((choice, choiceIdx) => {
          const isSelected = selectedKey === choice.label;
          const isCorrectChoice = isSubmitted && correctKey === choice.label;
          const isWrongSelection = isSubmitted && isSelected && !isCorrect;

          return (
            <motion.button
              key={choice.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: choiceIdx * 0.05 }}
              onClick={() => {
                if (!isSubmitted && !isPaused) setSelectedKey(choice.label);
              }}
              disabled={isSubmitted || isPaused}
              className={cn(
                'w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all',
                // Base states
                !isSubmitted && !isSelected &&
                  'bg-surface border-border-custom hover:border-primary/30 hover:bg-surface-elevated',
                !isSubmitted && isSelected &&
                  'bg-primary/10 border-primary/40 ring-2 ring-primary/20',
                // Post-submit states
                isCorrectChoice &&
                  'bg-success/10 border-success/50 ring-2 ring-success/20',
                isWrongSelection &&
                  'bg-error/10 border-error/50 ring-2 ring-error/20',
                isSubmitted && !isCorrectChoice && !isWrongSelection &&
                  'bg-surface/50 border-border-custom/50 opacity-60',
                // Disabled
                (isSubmitted || isPaused) && 'cursor-not-allowed',
              )}
            >
              {/* Label badge */}
              <span
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-all',
                  !isSubmitted && !isSelected &&
                    'bg-surface-elevated text-txt-secondary',
                  !isSubmitted && isSelected &&
                    'bg-primary text-white',
                  isCorrectChoice &&
                    'bg-success text-white',
                  isWrongSelection &&
                    'bg-error text-white',
                  isSubmitted && !isCorrectChoice && !isWrongSelection &&
                    'bg-surface-elevated text-txt-secondary/50',
                )}
              >
                {isCorrectChoice ? <Check className="w-4 h-4" /> : choice.label}
              </span>

              {/* Choice text */}
              <span
                className={cn(
                  'text-sm sm:text-base font-medium',
                  !isSubmitted ? 'text-txt' : 'text-txt-secondary',
                  isCorrectChoice && 'text-success',
                  isWrongSelection && 'text-error',
                )}
              >
                {choice.text}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Submit button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={handleSubmit}
          disabled={isSubmitted || !selectedKey || isPaused}
          className={cn(
            'flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold transition-all',
            !isSubmitted && selectedKey && !isPaused
              ? 'btn-gradient text-white'
              : 'bg-surface border border-border-custom text-txt-secondary/40 cursor-not-allowed',
          )}
        >
          <Send className="w-4 h-4" />
          Submit Answer
        </button>
      </div>

      {/* Feedback for incorrect */}
      <AnimatePresence>
        {feedbackMessage && !isCorrect && isSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="text-center mb-6"
          >
            <p className="text-error font-medium">{feedbackMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause overlay */}
      {isPaused && !isSubmitted && (
        <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-xl flex flex-col items-center justify-center gap-4">
          <div className="text-6xl font-bold text-primary-light font-mono">
            {formatTime(timer)}
          </div>
          <p className="text-xl text-txt-secondary">Game Paused</p>
          <button
            onClick={() => setIsPaused(false)}
            className="btn-gradient px-8 py-3 rounded-xl text-white font-semibold"
          >
            <span>Resume</span>
          </button>
        </div>
      )}

      {/* Completion modal */}
      <AnimatePresence>
      {isSubmitted && isCorrect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[200] bg-background/85 backdrop-blur-lg flex items-center justify-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.05 }}
            className="glass-card rounded-3xl p-8 sm:p-10 max-w-md w-full mx-4 text-center hover:transform-none"
          >
            <div className="w-16 h-16 rounded-2xl bg-gold/20 flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-8 h-8 text-gold" />
            </div>
            <h2 className="text-2xl font-bold text-txt mb-2">Puzzle Complete!</h2>
            <p className="text-txt-secondary mb-6">Outstanding cognitive performance.</p>

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
              <Link
                href="/puzzles"
                className="btn-gradient flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold"
              >
                <span className="flex items-center gap-2">
                  Next Puzzle
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-txt-secondary hover:text-primary-light transition-colors"
              >
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
