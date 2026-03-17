import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  iconColor?: string;
  iconBg?: string;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendUp = true,
  iconColor = 'text-primary-light',
  iconBg = 'bg-primary/10',
}: StatCardProps) {
  return (
    <div className="glass-card rounded-2xl p-5 group">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
        {trend && (
          <span
            className={cn(
              'text-xs font-semibold px-2 py-1 rounded-full',
              trendUp
                ? 'text-success bg-success/10'
                : 'text-error bg-error/10'
            )}
          >
            {trendUp ? '+' : ''}{trend}
          </span>
        )}
      </div>
      <div className="font-mono text-2xl font-bold text-txt mb-1">{value}</div>
      <div className="text-sm text-txt-secondary">{label}</div>
    </div>
  );
}
