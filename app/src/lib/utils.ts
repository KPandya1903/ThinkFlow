import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(num >= 10000 ? 0 : 1)}K`;
  }
  return num.toLocaleString();
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function getDifficultyColor(level: number): string {
  switch (level) {
    case 1:
      return 'text-success';
    case 2:
      return 'text-accent';
    case 3:
      return 'text-gold';
    case 4:
      return 'text-error';
    case 5:
      return 'text-primary-light';
    default:
      return 'text-txt-secondary';
  }
}

export function getDifficultyLabel(level: number): string {
  switch (level) {
    case 1:
      return 'Easy';
    case 2:
      return 'Medium';
    case 3:
      return 'Hard';
    case 4:
      return 'Expert';
    case 5:
      return 'Master';
    default:
      return 'Unknown';
  }
}
