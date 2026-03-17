'use client';

import { useState } from 'react';
import { Pencil, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScratchPadProps {
  className?: string;
}

export default function ScratchPad({ className }: ScratchPadProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  return (
    <div className={cn('mt-4', className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs text-txt-secondary hover:text-txt transition-colors px-3 py-2 rounded-lg hover:bg-surface-elevated border border-border-custom/30 hover:border-border-custom/60 w-full"
      >
        <Pencil className="w-3.5 h-3.5" />
        <span className="font-medium">Scratch Pad</span>
        <span className="text-txt-secondary/50 ml-1">— work through your reasoning here</span>
        <span className="ml-auto">
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-border-custom/40 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-surface-elevated border-b border-border-custom/30">
            <span className="text-xs text-txt-secondary/60 font-mono">notes</span>
            {text && (
              <button
                onClick={() => setText('')}
                className="flex items-center gap-1 text-xs text-txt-secondary/40 hover:text-error/70 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g.  Piano tuners = households × piano rate × tunings/year ÷ tuner capacity&#10;        = 1.08M × 5% × 1 ÷ 1000 ≈ 54"
            className="w-full min-h-[140px] bg-surface/50 text-txt text-sm font-mono resize-y p-3 focus:outline-none placeholder:text-txt-secondary/30 leading-relaxed"
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
}
