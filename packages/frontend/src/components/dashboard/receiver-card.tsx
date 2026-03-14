import { GlassCard } from '../shared/glass-card';
import { StatusBadge } from './status-badge';
import type { ReceiverWithStatus } from '@ogn-dashboard/shared';

interface ReceiverCardProps {
  receiver: ReceiverWithStatus;
}

export function ReceiverCard({ receiver }: ReceiverCardProps) {
  return (
    <GlassCard
      className={`transition-[border-color] duration-200 hover:border-white/[0.12] ${
        receiver.status === 'offline' ? 'opacity-50' : ''
      }`}
    >
      <div className="flex justify-between items-center mb-3.5">
        <div>
          <div className="text-[15px] font-semibold">{receiver.id}</div>
          <div className="text-[11px] text-white/30">
            {receiver.name} · {receiver.latitude.toFixed(4)}°N, {receiver.longitude.toFixed(4)}°E
          </div>
        </div>
        <StatusBadge status={receiver.status} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-wider">Aircraft</div>
          <div className="text-[16px] font-medium mt-0.5">
            {receiver.status === 'offline' ? '—' : receiver.aircraft_count}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-wider">Max range</div>
          <div className="text-[16px] font-medium mt-0.5">
            {receiver.max_range_km > 0 ? `${Math.round(receiver.max_range_km)} km` : '—'}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-white/30 uppercase tracking-wider">Avg SNR</div>
          <div className="text-[16px] font-medium mt-0.5">
            {receiver.avg_snr_db !== null ? `${receiver.avg_snr_db} dB` : '—'}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
