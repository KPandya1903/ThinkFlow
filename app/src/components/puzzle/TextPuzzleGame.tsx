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
  GitBranch,
  Dice5,
  Swords,
  Shield,
  Search,
  Brain,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn, formatTime, getDifficultyColor, getDifficultyLabel } from '@/lib/utils';
import ScratchPad from './ScratchPad';

// ─── Category icon mapping ──────────────────────────────────────────────────

const PUZZLE_TYPE_ICONS: Record<string, ReactNode> = {
  fermi: <Calculator className="w-4 h-4" />,
  optimization: <GitBranch className="w-4 h-4" />,
  probability: <Dice5 className="w-4 h-4" />,
  game_theory: <Swords className="w-4 h-4" />,
  strategy: <Lightbulb className="w-4 h-4" />,
  knights_knaves: <Shield className="w-4 h-4" />,
  zebra: <Search className="w-4 h-4" />,
  lsat_logic: <Brain className="w-4 h-4" />,
};

// ─── Difficulty badge colors ────────────────────────────────────────────────

const DIFFICULTY_BG: Record<number, string> = {
  1: 'bg-success/15 border-success/30 text-success',
  2: 'bg-accent/15 border-accent/30 text-accent',
  3: 'bg-gold/15 border-gold/30 text-gold',
  4: 'bg-error/15 border-error/30 text-error',
  5: 'bg-primary-light/15 border-primary-light/30 text-primary-light',
};

// ─── Text formatting helper ─────────────────────────────────────────────────

// Section header labels that get gold border-left callout styling
const SECTION_HEADERS = /^(Part\s+\d+|Setup|Question|Constraint|Note|Consider|Background|Scenario|Problem|Objective|Rules?|Hint)s?:/i;

function renderFormattedText(text: string): ReactNode[] {
  const lines = text.split('\n');
  const elements: ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    // Blank line -> spacer
    if (trimmed === '') {
      elements.push(<div key={`br-${lineIdx}`} className="h-3" />);
      return;
    }

    // Section header: "Part 1:", "Setup:", "Note:", "Consider:", etc.
    const headerMatch = trimmed.match(SECTION_HEADERS);
    if (headerMatch) {
      const colonIdx = trimmed.indexOf(':');
      const label = trimmed.slice(0, colonIdx);
      const rest = trimmed.slice(colonIdx + 1).trim();
      elements.push(
        <div key={lineIdx} className="flex flex-col gap-1 pl-3 border-l-2 border-gold/50 mt-4 mb-1">
          <span className="text-xs font-bold uppercase tracking-widest text-gold/80">{label}</span>
          {rest && <span className="text-txt text-sm leading-relaxed">{renderInlineFormatting(rest)}</span>}
        </div>,
      );
      return;
    }

    // Numbered list item: "1. ...", "2) ..."
    const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);
    if (numberedMatch) {
      elements.push(
        <div key={lineIdx} className="flex gap-3 pl-1 py-0.5">
          <span className="text-accent font-mono font-semibold text-sm min-w-[1.5rem] text-right shrink-0">
            {numberedMatch[1]}.
          </span>
          <span className="text-txt">{renderInlineFormatting(numberedMatch[2])}</span>
        </div>,
      );
      return;
    }

    // Bullet point: "- ...", "* ...", "• ..."
    const bulletMatch = trimmed.match(/^[-*\u2022]\s+(.*)/);
    if (bulletMatch) {
      elements.push(
        <div key={lineIdx} className="flex gap-3 pl-1 py-0.5">
          <span className="text-accent mt-1.5 shrink-0">
            <span className="block w-1.5 h-1.5 rounded-full bg-accent/60" />
          </span>
          <span className="text-txt">{renderInlineFormatting(bulletMatch[1])}</span>
        </div>,
      );
      return;
    }

    // Regular line
    elements.push(
      <p key={lineIdx} className="text-txt py-0.5">
        {renderInlineFormatting(trimmed)}
      </p>,
    );
  });

  return elements;
}

/** Render inline formatting: **bold**, quoted speech, and highlight numbers/percentages */
function renderInlineFormatting(text: string): ReactNode {
  // Split on **bold**, quoted speech, and standalone numbers/percentages
  const parts = text.split(/(".*?"|'.*?'|\*\*.*?\*\*|\b\d[\d,]*\.?\d*%?(?:\s*(?:million|billion|thousand|M|B|K))?\b)/g);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    // Bold **text**
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-txt">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Quoted speech
    if (
      (part.startsWith('"') && part.endsWith('"')) ||
      (part.startsWith('\u201c') && part.endsWith('\u201d'))
    ) {
      return (
        <em key={i} className="italic text-primary-light/90">
          {part}
        </em>
      );
    }
    // Standalone numbers and percentages
    if (/^\d[\d,]*\.?\d*%?(?:\s*(?:million|billion|thousand|M|B|K))?$/.test(part.trim()) && part.trim().length > 0) {
      return (
        <code key={i} className="font-mono text-accent/90 bg-accent/8 px-0.5 rounded text-[0.9em]">
          {part}
        </code>
      );
    }
    return part;
  });
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface TextPuzzleGameProps {
  puzzleId: string;
  puzzleText: string;
  title: string;
  difficulty: number;
  estimatedTimeSeconds?: number;
  hints?: string[] | null;
  /** Puzzle type label shown in the header */
  puzzleTypeLabel?: string;
  /** Raw puzzle type key (e.g. 'fermi', 'knights_knaves') */
  puzzleType?: string;
}

export default function TextPuzzleGame({
  puzzleId,
  puzzleText,
  title,
  difficulty,
  estimatedTimeSeconds,
  hints,
  puzzleTypeLabel,
  puzzleType,
}: TextPuzzleGameProps) {
  // ─── State ──────────────────────────────────────────────────────────────
  const [answer, setAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timer, setTimer] = useState(0);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [explanation, setExplanation] = useState<string | null>(null);
  const [acceptableRange, setAcceptableRange] = useState<[number, number] | null>(null);
  const [solutionText, setSolutionText] = useState<string | null>(null);
  const [userSubmittedAnswer, setUserSubmittedAnswer] = useState<string>('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const availableHints = hints ?? [];
  const isFermi = puzzleType === 'fermi';

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

  // ─── Formatted puzzle text ──────────────────────────────────────────────
  const formattedPuzzleText = useMemo(() => renderFormattedText(puzzleText), [puzzleText]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (isSubmitted || answer.trim().length === 0) return;

    setUserSubmittedAnswer(answer.trim());

    try {
      const res = await fetch(`/api/puzzles/${puzzleId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer: answer.trim(),
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

      if (data.correct) {
        setFeedbackMessage(`Correct! +${data.xpEarned || 0} XP`);
      } else {
        setFeedbackMessage(
          data.solution ? `The correct answer was: ${data.solution}` : 'Incorrect.',
        );
      }
    } catch {
      setIsSubmitted(true);
      setIsCorrect(false);
      setFeedbackMessage('Network error. Please try again.');
    }
  }, [answer, isSubmitted, puzzleId, timer, hintsRevealed]);

  const handleRevealHint = useCallback(() => {
    if (hintsRevealed < availableHints.length) {
      setHintsRevealed((h) => h + 1);
    }
  }, [hintsRevealed, availableHints.length]);

  const handleRestart = useCallback(() => {
    setAnswer('');
    setIsSubmitted(false);
    setIsCorrect(false);
    setIsPaused(false);
    setTimer(0);
    setHintsRevealed(0);
    setFeedbackMessage('');
    setExplanation(null);
    setAcceptableRange(null);
    setSolutionText(null);
    setUserSubmittedAnswer('');
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  // ─── Derived ────────────────────────────────────────────────────────────
  const timeStr = formatTime(timer);
  const isTimerWarning = timer > 600;
  const isTimerDanger = timer > 900;
  const difficultyLabel = getDifficultyLabel(difficulty);
  const difficultyColor = getDifficultyColor(difficulty);
  const difficultyBg = DIFFICULTY_BG[difficulty] ?? DIFFICULTY_BG[1];
  const categoryIcon = puzzleType ? PUZZLE_TYPE_ICONS[puzzleType] : null;

  return (
    <div className="relative max-w-2xl mx-auto">
      {/* Puzzle info header */}
      <div className="mb-6 text-center">
        <h1 className="text-xl sm:text-2xl font-bold text-txt mb-3">{title}</h1>

        {/* Badges row */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {/* Difficulty badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wide',
              difficultyBg,
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', difficultyColor.replace('text-', 'bg-'))} />
            {difficultyLabel}
          </span>

          {/* Puzzle type badge with icon */}
          {puzzleTypeLabel && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-semibold">
              {categoryIcon}
              {puzzleTypeLabel}
            </span>
          )}

          {/* XP badge */}
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-gold/30 bg-gold/10 text-gold text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            {xpReward} XP
          </span>

          {/* Estimated time */}
          {estimatedTimeSeconds && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-border-custom bg-surface text-txt-secondary text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(estimatedTimeSeconds)}
            </span>
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

      {/* Puzzle text card */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 mb-6">
        <div className="text-base sm:text-lg leading-relaxed space-y-0.5">
          {formattedPuzzleText}
        </div>
        <ScratchPad className="mt-5" />
      </div>

      {/* Hints section */}
      <AnimatePresence>
        {hintsRevealed > 0 && (
          <motion.div
            key="hints"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 mb-6"
          >
            {availableHints.slice(0, hintsRevealed).map((hint, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-3 px-4 py-3 rounded-xl bg-gold/5 border border-gold/20"
              >
                <Lightbulb className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                <p className="text-sm text-gold/90">{hint}</p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Answer input */}
      {!isSubmitted && (
        <div className="mb-6">
          {isFermi && (
            <label
              htmlFor="fermi-input"
              className="block text-sm font-medium text-txt-secondary mb-2"
            >
              <Calculator className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              Enter your estimate:
            </label>
          )}
          <div className="flex gap-3">
            <input
              id={isFermi ? 'fermi-input' : undefined}
              ref={inputRef}
              type={isFermi ? 'number' : 'text'}
              inputMode={isFermi ? 'numeric' : undefined}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isPaused}
              placeholder={isFermi ? 'e.g. 1000000' : 'Type your answer...'}
              className={cn(
                'flex-1 px-4 py-3 rounded-xl bg-surface border text-txt placeholder:text-txt-secondary/50 text-base font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/40',
                'border-border-custom hover:border-primary/30',
              )}
            />
            <button
              onClick={handleSubmit}
              disabled={answer.trim().length === 0 || isPaused}
              className={cn(
                'flex items-center gap-2 px-5 sm:px-6 py-3 rounded-xl text-sm font-semibold transition-all',
                answer.trim().length > 0 && !isPaused
                  ? 'btn-gradient text-white'
                  : 'bg-surface border border-border-custom text-txt-secondary/40 cursor-not-allowed',
              )}
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Submit</span>
            </button>
          </div>
        </div>
      )}

      {/* Feedback card — shown after submission when incorrect */}
      <AnimatePresence>
      {isSubmitted && !isCorrect && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="mb-6"
        >
          <div className="rounded-2xl border border-error/30 bg-error/5 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-error/20 bg-error/10">
              <XCircle className="w-5 h-5 text-error shrink-0" />
              <span className="font-semibold text-error text-sm">Incorrect</span>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">
              {/* User's answer vs correct */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                <span className="text-txt-secondary">Your answer:</span>
                <span className="font-mono font-semibold text-txt bg-surface px-2 py-0.5 rounded">
                  {userSubmittedAnswer}
                </span>
              </div>

              {solutionText && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                  <span className="text-txt-secondary">Correct answer:</span>
                  <span className="font-mono font-semibold text-success bg-success/10 px-2 py-0.5 rounded">
                    {solutionText}
                  </span>
                </div>
              )}

              {/* Fermi: acceptable range */}
              {isFermi && acceptableRange && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                  <span className="text-txt-secondary">Acceptable range:</span>
                  <span className="font-mono font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded">
                    {acceptableRange[0].toLocaleString()} &ndash; {acceptableRange[1].toLocaleString()}
                  </span>
                </div>
              )}

              {/* Explanation */}
              {explanation && (
                <div className="pt-2 border-t border-error/15">
                  <p className="text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-1.5">
                    Explanation
                  </p>
                  <div className="text-sm text-txt leading-relaxed">
                    {renderFormattedText(explanation)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons after wrong answer */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
              onClick={handleRestart}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-surface border border-border-custom text-txt text-sm font-semibold transition-all hover:bg-surface-elevated hover:border-primary/30"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
            <Link
              href="/puzzles"
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl btn-gradient text-white text-sm font-semibold"
            >
              Next Puzzle
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Feedback card — shown after submission when correct (inline, before modal) */}
      <AnimatePresence>
      {isSubmitted && isCorrect && explanation && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="mb-6"
        >
          <div className="rounded-2xl border border-success/30 bg-success/5 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-success/20 bg-success/10">
              <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
              <span className="font-semibold text-success text-sm">Correct!</span>
            </div>
            <div className="px-5 py-4">
              {isFermi && acceptableRange && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm mb-3">
                  <span className="text-txt-secondary">Your estimate:</span>
                  <span className="font-mono font-semibold text-success bg-success/10 px-2 py-0.5 rounded">
                    {userSubmittedAnswer}
                  </span>
                  <span className="text-txt-secondary">| Range:</span>
                  <span className="font-mono font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded">
                    {acceptableRange[0].toLocaleString()} &ndash; {acceptableRange[1].toLocaleString()}
                  </span>
                </div>
              )}
              <p className="text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-1.5">
                Explanation
              </p>
              <div className="text-sm text-txt leading-relaxed">
                {renderFormattedText(explanation)}
              </div>
            </div>
          </div>
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
