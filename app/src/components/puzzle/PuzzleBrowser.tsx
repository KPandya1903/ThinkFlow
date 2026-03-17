'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Hash,
  Clock,
  Zap,
  Play,
  Layers,
  BarChart3,
  Dice5,
} from 'lucide-react';
import { cn, getDifficultyLabel } from '@/lib/utils';

interface PuzzleData {
  id: string;
  title: string;
  category: string;
  type: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedTime: string;
  xpReward: number;
}

interface PuzzleBrowserProps {
  puzzles: PuzzleData[];
}

// Category tabs — each maps to a set of puzzle types for filtering
const categories = [
  { key: 'all', label: 'All', icon: Layers, types: [] as string[] },
  {
    key: 'logic_deduction',
    label: 'Logic & Deduction',
    icon: Hash,
    types: ['knights_knaves', 'zebra', 'lsat_logic', 'logicbench', 'strategy', 'futoshiki', 'takuzu', 'kakurasu'],
  },
  {
    key: 'pattern_abstract',
    label: 'Pattern & Abstract',
    icon: Search,
    types: ['arc_agi', 'number_sequence', 'number_sequences'],
  },
  {
    key: 'estimation_strategy',
    label: 'Estimation & Strategy',
    icon: BarChart3,
    types: ['fermi', 'optimization'],
  },
  {
    key: 'probability_game_theory',
    label: 'Probability & Game Theory',
    icon: Dice5,
    types: ['probability', 'game_theory', 'brainteaser'],
  },
];

const difficulties = [
  { key: 0, label: 'All' },
  { key: 1, label: 'Easy' },
  { key: 2, label: 'Medium' },
  { key: 3, label: 'Hard' },
  { key: 4, label: 'Expert' },
  { key: 5, label: 'Master' },
];

function getDifficultyBadgeClass(level: number): string {
  switch (level) {
    case 1:
      return 'badge-easy';
    case 2:
      return 'badge-medium';
    case 3:
      return 'badge-hard';
    case 4:
      return 'badge-expert';
    case 5:
      return 'badge-master';
    default:
      return '';
  }
}

function getDifficultyButtonClass(level: number, active: boolean): string {
  if (!active) return 'border-border-custom/50 text-txt-secondary hover:border-primary/30';
  switch (level) {
    case 0:
      return 'border-primary bg-primary/20 text-primary-light';
    case 1:
      return 'border-success bg-success/20 text-success';
    case 2:
      return 'border-gold bg-gold/20 text-gold';
    case 3:
      return 'border-error bg-error/20 text-error';
    case 4:
      return 'border-primary bg-primary/20 text-primary-light';
    case 5:
      return 'border-gold bg-gold/20 text-gold';
    default:
      return '';
  }
}

// Map puzzle type → display category for color coding
function getTypeCategory(type: string): string {
  const cat = categories.find((c) => c.key !== 'all' && c.types.includes(type));
  return cat?.key ?? 'logic_deduction';
}

function getCategoryColor(category: string): string {
  switch (category) {
    // Legacy category keys (data may still use these)
    case 'structured_grid':
      return '#6c5ce7';
    case 'pattern_recognition':
      return '#00cec9';
    case 'logical_deduction':
      return '#fdcb6e';
    case 'scenario_decision':
      return '#ff6b6b';
    case 'riddles_verbal':
      return '#00b894';
    // New tab-based category keys
    case 'logic_deduction':
      return '#fdcb6e';
    case 'pattern_abstract':
      return '#00cec9';
    case 'estimation_strategy':
      return '#e17055';
    case 'probability_game_theory':
      return '#a29bfe';
    default:
      return '#6c5ce7';
  }
}

export default function PuzzleBrowser({ puzzles }: PuzzleBrowserProps) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeDifficulty, setActiveDifficulty] = useState(0);

  const filtered = useMemo(() => {
    const activeCat = categories.find((c) => c.key === activeCategory);
    return puzzles.filter((p) => {
      if (activeCategory !== 'all' && activeCat) {
        if (!activeCat.types.includes(p.type)) return false;
      }
      if (activeDifficulty !== 0 && p.difficulty !== activeDifficulty) return false;
      return true;
    });
  }, [puzzles, activeCategory, activeDifficulty]);

  return (
    <div>
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                isActive
                  ? 'border-primary bg-primary/15 text-primary-light'
                  : 'border-border-custom/50 text-txt-secondary hover:border-primary/30 hover:text-txt'
              )}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Difficulty filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        <span className="text-xs text-txt-secondary self-center mr-2">Difficulty:</span>
        {difficulties.map((diff) => (
          <button
            key={diff.key}
            onClick={() => setActiveDifficulty(diff.key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              getDifficultyButtonClass(diff.key, activeDifficulty === diff.key)
            )}
          >
            {diff.label}
          </button>
        ))}
      </div>

      {/* Puzzle grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Search className="w-12 h-12 text-txt-secondary/30 mx-auto mb-4" />
          <p className="text-txt-secondary text-lg">No puzzles match your filters.</p>
          <button
            onClick={() => {
              setActiveCategory('all');
              setActiveDifficulty(0);
            }}
            className="mt-4 text-primary-light text-sm hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((puzzle) => {
            const catColor = getCategoryColor(getTypeCategory(puzzle.type));
            return (
              <div
                key={puzzle.id}
                className="glass-card rounded-2xl p-5 group relative overflow-hidden"
              >
                {/* Shine sweep overlay */}
                <div className="absolute top-0 left-[-100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent transition-[left] duration-600 group-hover:left-[120%] pointer-events-none" />

                {/* Category indicator */}
                <div
                  className="w-2 h-2 rounded-full mb-3"
                  style={{ backgroundColor: catColor }}
                />

                {/* Title */}
                <h3 className="text-base font-semibold text-txt mb-2 group-hover:text-primary-light transition-colors">
                  {puzzle.title}
                </h3>

                {/* Difficulty badge */}
                <span
                  className={cn(
                    'inline-block px-2.5 py-1 rounded-md text-xs font-semibold mb-4',
                    getDifficultyBadgeClass(puzzle.difficulty)
                  )}
                >
                  {getDifficultyLabel(puzzle.difficulty)}
                </span>

                {/* Meta */}
                <div className="flex items-center gap-4 mb-4 text-xs text-txt-secondary">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{puzzle.estimatedTime}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-gold" />
                    <span className="font-semibold text-gold font-mono">{puzzle.xpReward} XP</span>
                  </div>
                </div>

                {/* Play button */}
                <Link
                  href={`/play/${puzzle.id}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary-light text-sm font-semibold transition-all hover:bg-primary/20 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
                >
                  <Play className="w-4 h-4" />
                  Play
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
