import type { ReceiverStatus } from '@ogn-dashboard/shared';

const statusConfig: Record<ReceiverStatus, { bg: string; text: string; label: string; dot: string }> = {
  online: {
    bg: 'bg-emerald-400/[0.15]',
    text: 'text-emerald-400',
    label: 'Online',
    dot: 'bg-emerald-400 animate-pulse-dot',
  },
  degraded: {
    bg: 'bg-amber-400/[0.15]',
    text: 'text-amber-400',
    label: 'Degraded',
    dot: 'bg-amber-400',
  },
  offline: {
    bg: 'bg-red-400/[0.15]',
    text: 'text-red-400',
    label: 'Offline',
    dot: 'bg-red-400',
  },
};

interface StatusBadgeProps {
  status: ReceiverStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={`badge ${config.bg} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
