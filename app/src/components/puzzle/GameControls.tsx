'use client';

import { Undo2, Pause, Play, RotateCcw, Lightbulb, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSudokuStore } from '@/lib/stores/sudokuStore';
import { formatTime } from '@/lib/utils';

export default function GameControls() {
  const timer = useSudokuStore((s) => s.timer);
  const isPaused = useSudokuStore((s) => s.isPaused);
  const hintsRemaining = useSudokuStore((s) => s.hintsRemaining);
  const mistakes = useSudokuStore((s) => s.mistakes);
  const maxMistakes = useSudokuStore((s) => s.maxMistakes);
  const totalEmpty = useSudokuStore((s) => s.totalEmpty);
  const filledCount = useSudokuStore((s) => s.filledCount);
  const history = useSudokuStore((s) => s.history);
  const undo = useSudokuStore((s) => s.undo);
  const useHint = useSudokuStore((s) => s.useHint);
  const togglePause = useSudokuStore((s) => s.togglePause);
  const restart = useSudokuStore((s) => s.restart);

  const progressPercent = totalEmpty > 0 ? Math.round((filledCount / totalEmpty) * 100) : 0;
  const timeStr = formatTime(timer);
  const isTimerWarning = timer > 900; // 15 minutes
  const isTimerDanger = timer > 1200; // 20 minutes

  return (
    <div className="w-full max-w-[540px] mx-auto space-y-4">
      {/* Timer + Hearts row */}
      <div className="flex items-center justify-between">
        {/* Timer */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-mono text-2xl font-bold tracking-wider',
              isTimerDanger ? 'text-error' : isTimerWarning ? 'text-gold' : 'text-txt'
            )}
          >
            {timeStr.split(':')[0]}
            <span className="animate-[colonBlink_1s_step-end_infinite]">:</span>
            {timeStr.split(':')[1]}
          </span>
        </div>

        {/* Mistake hearts */}
        <div className="flex items-center gap-1" aria-label={`${maxMistakes - mistakes} lives remaining`}>
          {Array.from({ length: maxMistakes }, (_, i) => (
            <Heart
              key={i}
              className={cn(
                'w-5 h-5 transition-all',
                i < maxMistakes - mistakes
                  ? 'text-error fill-error'
                  : 'text-error/30 fill-error/10 scale-85'
              )}
            />
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-txt-secondary">Progress</span>
          <span className="text-xs font-mono text-txt-secondary">{progressPercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500 relative overflow-hidden"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>

      {/* Control buttons */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={undo}
          disabled={history.length === 0}
          className={cn(
            'flex items-center justify-center gap-2 py-3 rounded-xl bg-surface border border-border-custom text-sm font-medium transition-all',
            history.length > 0
              ? 'text-txt hover:bg-surface-elevated hover:border-primary/30'
              : 'text-txt-secondary/40 cursor-not-allowed'
          )}
          aria-label={`Undo (${history.length} moves)`}
        >
          <Undo2 className="w-4 h-4" />
          <span className="hidden sm:inline">Undo</span>
        </button>

        <button
          onClick={useHint}
          disabled={hintsRemaining <= 0}
          className={cn(
            'flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all',
            hintsRemaining > 0
              ? 'bg-gold/10 border-gold/30 text-gold hover:bg-gold/20'
              : 'bg-surface border-border-custom text-txt-secondary/40 cursor-not-allowed'
          )}
          aria-label={`Use hint (${hintsRemaining} remaining)`}
        >
          <Lightbulb className="w-4 h-4" />
          <span className="font-mono text-xs">{hintsRemaining}</span>
        </button>

        <button
          onClick={togglePause}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-surface border border-border-custom text-txt text-sm font-medium transition-all hover:bg-surface-elevated hover:border-primary/30"
          aria-label={isPaused ? 'Resume game' : 'Pause game'}
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
        </button>

        <button
          onClick={restart}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-surface border border-border-custom text-txt text-sm font-medium transition-all hover:bg-error/10 hover:border-error/30 hover:text-error"
          aria-label="Restart puzzle"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Restart</span>
        </button>
      </div>
    </div>
  );
}
