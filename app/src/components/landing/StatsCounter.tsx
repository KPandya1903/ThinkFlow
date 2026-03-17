'use client';

import { useEffect, useRef, useState } from 'react';
import { Puzzle, Users, Layers } from 'lucide-react';

const stats = [
  { icon: Puzzle, value: 250000, suffix: '+', label: 'Puzzles Solved', format: '250K' },
  { icon: Users, value: 10000, suffix: '+', label: 'Active Thinkers', format: '10K' },
  { icon: Layers, value: 5, suffix: '', label: 'Cognitive Categories', format: '5' },
];

function useCountUp(target: number, duration: number = 2000, startCounting: boolean = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!startCounting) return;

    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration, startCounting]);

  return count;
}

function StatItem({
  stat,
  isVisible,
}: {
  stat: (typeof stats)[number];
  isVisible: boolean;
}) {
  const Icon = stat.icon;
  const count = useCountUp(stat.value, 2000, isVisible);

  const displayValue = () => {
    if (stat.value >= 1000) {
      return `${Math.floor(count / 1000)}K`;
    }
    return count.toString();
  };

  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-2xl bg-surface-elevated border border-border-custom flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-primary-light" />
      </div>
      <div className="font-mono text-4xl sm:text-5xl font-bold text-txt mb-2">
        {displayValue()}
        {stat.suffix}
      </div>
      <div className="text-sm text-txt-secondary font-medium">{stat.label}</div>
    </div>
  );
}

export default function StatsCounter() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef} className="grid grid-cols-1 sm:grid-cols-3 gap-12">
      {stats.map((stat) => (
        <StatItem key={stat.label} stat={stat} isVisible={isVisible} />
      ))}
    </div>
  );
}
