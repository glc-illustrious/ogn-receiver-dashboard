import type { ReactNode } from 'react';
import { GlassCard } from './glass-card';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  height?: number;
}

export function ChartContainer({
  title,
  subtitle,
  children,
  className = '',
  height = 200,
}: ChartContainerProps) {
  return (
    <GlassCard className={className}>
      <div className="text-[13px] font-medium mb-1">{title}</div>
      {subtitle && (
        <div className="text-[11px] text-white/30 mb-3.5">{subtitle}</div>
      )}
      <div style={{ height }}>{children}</div>
    </GlassCard>
  );
}
