'use client';

import { useEffect, useRef, useState } from 'react';

interface SkillRadarProps {
  skills: {
    label: string;
    value: number; // 0-100
  }[];
}

export default function SkillRadar({ skills }: SkillRadarProps) {
  const [animated, setAnimated] = useState(false);
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimated(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  const cx = 150;
  const cy = 150;
  const maxR = 110;
  const levels = 5;
  const n = skills.length;
  const angleStep = (2 * Math.PI) / n;

  // Calculate point on polygon
  const getPoint = (index: number, radius: number) => {
    const angle = angleStep * index - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  // Generate polygon path for grid levels
  const gridPaths = Array.from({ length: levels }, (_, i) => {
    const r = (maxR / levels) * (i + 1);
    const points = Array.from({ length: n }, (_, j) => {
      const p = getPoint(j, r);
      return `${p.x},${p.y}`;
    });
    return `M${points.join('L')}Z`;
  });

  // Generate data polygon
  const dataPoints = skills.map((skill, i) => {
    const r = (skill.value / 100) * maxR;
    return getPoint(i, r);
  });
  const dataPath = `M${dataPoints.map((p) => `${p.x},${p.y}`).join('L')}Z`;

  // Label positions
  const labelPoints = skills.map((skill, i) => {
    const p = getPoint(i, maxR + 25);
    return { ...p, label: skill.label, value: skill.value };
  });

  return (
    <svg
      ref={ref}
      viewBox="0 0 300 300"
      className="w-full max-w-[320px] mx-auto"
      role="img"
      aria-label="Skill radar chart showing your abilities across 5 dimensions"
    >
      {/* Grid levels */}
      {gridPaths.map((path, i) => (
        <path
          key={i}
          d={path}
          fill="none"
          stroke="#2a2a3e"
          strokeWidth={i === levels - 1 ? 1.5 : 0.5}
          opacity={0.6}
        />
      ))}

      {/* Axis lines */}
      {Array.from({ length: n }, (_, i) => {
        const p = getPoint(i, maxR);
        return (
          <line
            key={`axis-${i}`}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="#2a2a3e"
            strokeWidth={0.5}
            opacity={0.4}
          />
        );
      })}

      {/* Data polygon */}
      <g
        style={{
          transformOrigin: `${cx}px ${cy}px`,
          transform: animated ? 'scale(1)' : 'scale(0)',
          opacity: animated ? 1 : 0,
          transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s, opacity 0.8s ease 0.3s',
        }}
      >
        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6c5ce7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00cec9" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <path
          d={dataPath}
          fill="url(#radarGradient)"
          stroke="#6c5ce7"
          strokeWidth={2}
        />
        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle
            key={`dot-${i}`}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="#6c5ce7"
            stroke="#0a0a0f"
            strokeWidth={2}
          />
        ))}
      </g>

      {/* Labels */}
      {labelPoints.map((lp, i) => (
        <text
          key={`label-${i}`}
          x={lp.x}
          y={lp.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-txt-secondary text-[10px] font-medium"
        >
          {lp.label}
        </text>
      ))}
    </svg>
  );
}
