import Link from 'next/link';
import {
  Search,
  Hash,
  Target,
  MessageCircle,
  Brain,
  Zap,
  BookOpen,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Trophy,
} from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import HeroAnimations from '@/components/landing/HeroAnimations';
import StatsCounter from '@/components/landing/StatsCounter';

const categories = [
  {
    icon: Hash,
    title: 'Logic & Deduction',
    description: 'Knights & Knaves, Einstein riddles, constraint satisfaction, and LSAT logic games.',
    color: '#fdcb6e',
    puzzleCount: '45+',
  },
  {
    icon: Search,
    title: 'Pattern Recognition',
    description: 'Spot sequences, visual patterns, and hidden structures in data with ARC challenges.',
    color: '#00cec9',
    puzzleCount: '60+',
  },
  {
    icon: Target,
    title: 'Estimation & Strategy',
    description: 'Fermi estimation, optimization problems, and strategic thinking under pressure.',
    color: '#ff6b6b',
    puzzleCount: '35+',
  },
  {
    icon: MessageCircle,
    title: 'Brain Teasers',
    description: 'Lateral thinking, probability puzzles, and game theory that challenge assumptions.',
    color: '#00b894',
    puzzleCount: '30+',
  },
];

const steps = [
  {
    step: 1,
    icon: BookOpen,
    title: 'Choose a Category',
    description: 'Pick from 4 cognitive domains: logic, patterns, estimation, or brain teasers.',
  },
  {
    step: 2,
    icon: Zap,
    title: 'Solve & Earn XP',
    description: 'Tackle puzzles at your level. Earn XP, build streaks, and watch your skills grow.',
  },
  {
    step: 3,
    icon: Trophy,
    title: 'Track & Compete',
    description: 'See your skill radar evolve. Climb leaderboards and unlock achievement badges.',
  },
];

export default function LandingPage() {
  return (
    <>
      <Navbar />

      <main id="main-content">
        {/* ── Hero Section ─────────────────────────────────────────── */}
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
          {/* Background effects */}
          <div className="gradient-mesh" aria-hidden="true" />
          <div
            className="absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-20 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/8 blur-[120px] pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center py-20">
            {/* Badge */}
            <HeroAnimations>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-elevated/80 border border-border-custom mb-8 text-sm text-txt-secondary backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-gold" />
                <span>250K+ puzzles solved by 10K+ thinkers</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
                <span className="gradient-text">Train Your Mind,</span>
                <br />
                <span className="text-txt">Level Up Your Thinking</span>
              </h1>

              {/* Subtitle */}
              <p className="max-w-2xl mx-auto text-lg sm:text-xl text-txt-secondary leading-relaxed mb-10">
                Sharpen your cognitive abilities with curated puzzles across logic, patterns,
                deduction, and more. Track your progress with a personalized skill radar.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/sign-up"
                  className="btn-gradient px-8 py-4 rounded-xl text-white font-semibold text-lg relative"
                >
                  <span className="flex items-center gap-2">
                    Start Training Free
                    <ArrowRight className="w-5 h-5" />
                  </span>
                </Link>
                <Link
                  href="/puzzles"
                  className="px-8 py-4 rounded-xl border border-border-custom text-txt font-semibold text-lg hover:bg-surface-elevated/50 hover:border-primary/30 transition-all"
                >
                  Browse Puzzles
                </Link>
              </div>
            </HeroAnimations>
          </div>
        </section>

        {/* ── Divider ──────────────────────────────────────────────── */}
        <div className="h-px bg-gradient-to-r from-transparent via-border-custom to-transparent" />

        {/* ── Category Cards Section ───────────────────────────────── */}
        <section className="py-24 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-txt">
                Four Dimensions of{' '}
                <span className="gradient-text">Cognitive Training</span>
              </h2>
              <p className="text-txt-secondary text-lg max-w-2xl mx-auto">
                Each category targets different cognitive skills. Build a well-rounded mind
                by challenging yourself across all four.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Link
                    key={cat.title}
                    href="/puzzles"
                    className="category-card glass-card rounded-2xl p-6 group cursor-pointer"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all group-hover:scale-110"
                      style={{
                        backgroundColor: `${cat.color}15`,
                        border: `1px solid ${cat.color}30`,
                      }}
                    >
                      <Icon className="w-6 h-6" style={{ color: cat.color }} />
                    </div>
                    <h3 className="text-base font-semibold text-txt mb-2">{cat.title}</h3>
                    <p className="text-sm text-txt-secondary leading-relaxed mb-4">
                      {cat.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-txt-secondary">
                        {cat.puzzleCount} puzzles
                      </span>
                      <ChevronRight
                        className="w-4 h-4 text-txt-secondary group-hover:text-primary-light group-hover:translate-x-1 transition-all"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Stats Section ─────────────────────────────────────────── */}
        <section className="py-20 px-4 sm:px-6 relative">
          <div
            className="absolute inset-0 bg-[linear-gradient(rgba(42,42,62,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(42,42,62,0.3)_1px,transparent_1px)] bg-[size:60px_60px] opacity-30"
            aria-hidden="true"
          />
          <div className="max-w-4xl mx-auto relative z-10">
            <StatsCounter />
          </div>
        </section>

        {/* ── Divider ──────────────────────────────────────────────── */}
        <div className="h-px bg-gradient-to-r from-transparent via-border-custom to-transparent" />

        {/* ── How It Works ──────────────────────────────────────────── */}
        <section className="py-24 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-txt">
                How It <span className="gradient-text">Works</span>
              </h2>
              <p className="text-txt-secondary text-lg max-w-xl mx-auto">
                Three simple steps to start building a sharper mind.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Connector lines (desktop) */}
              <div className="hidden md:block absolute top-16 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-0.5 bg-gradient-to-r from-primary to-accent" aria-hidden="true" />

              {steps.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.step} className="text-center relative">
                    <div className="w-14 h-14 rounded-2xl bg-surface-elevated border border-border-custom flex items-center justify-center mx-auto mb-6 relative z-10">
                      <Icon className="w-6 h-6 text-primary-light" />
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-xs font-bold text-white font-mono">{item.step}</span>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-txt mb-2">{item.title}</h3>
                    <p className="text-sm text-txt-secondary leading-relaxed max-w-xs mx-auto">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── CTA Section ───────────────────────────────────────────── */}
        <section className="py-24 px-4 sm:px-6 relative overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent"
            aria-hidden="true"
          />
          <div className="max-w-3xl mx-auto text-center relative z-10">
            <div className="glass-card rounded-3xl p-10 sm:p-14 border border-primary/20">
              <Brain className="w-12 h-12 text-primary-light mx-auto mb-6" />
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-txt">
                Ready to <span className="gradient-text">Think Harder?</span>
              </h2>
              <p className="text-txt-secondary text-lg mb-8 max-w-xl mx-auto">
                Join thousands of thinkers building sharper minds every day. It is free to get
                started and your brain will thank you.
              </p>
              <Link
                href="/sign-up"
                className="btn-gradient inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-semibold text-lg"
              >
                <span className="flex items-center gap-2">
                  Create Free Account
                  <ArrowRight className="w-5 h-5" />
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <footer className="border-t border-border-custom py-12 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold">
                <span className="text-txt">I</span>
                <span className="text-primary-light">THINK</span>
              </span>
            </div>
            <p className="text-sm text-txt-secondary">
              &copy; {new Date().getFullYear()} ITHINK. Train your mind, level up your thinking.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
