'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface HeroAnimationsProps {
  children: ReactNode;
}

export default function HeroAnimations({ children }: HeroAnimationsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Stagger children animation on mount
    const elements = container.children;
    Array.from(elements).forEach((el, i) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.opacity = '0';
      htmlEl.style.transform = 'translateY(20px)';
      htmlEl.style.transition = `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.12}s, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.12}s`;
      requestAnimationFrame(() => {
        htmlEl.style.opacity = '1';
        htmlEl.style.transform = 'translateY(0)';
      });
    });
  }, []);

  return <div ref={containerRef}>{children}</div>;
}
