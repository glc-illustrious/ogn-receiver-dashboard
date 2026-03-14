import { useReceivers } from '../hooks/use-receivers';
import { useAircraftStore } from '../stores/aircraft';
import { GlassCard } from '../components/shared/glass-card';
import { DataFreshness } from '../components/shared/data-freshness';
import { ReceiverCard } from '../components/dashboard/receiver-card';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import type { ReceiverWithStatus } from '@ogn-dashboard/shared';

export default function DashboardPage() {
  const { receivers, loading } = useReceivers();
  const aircraftCount = useAircraftStore((s) => s.positions.size);

  if (loading) {
    return <div className="text-white/30 text-sm">Loading receivers...</div>;
  }

  const onlineCount = receivers.filter((r) => r.status === 'online').length;
  const degradedCount = receivers.filter((r) => r.status === 'degraded').length;
  const overallStatus =
    degradedCount > 0 ? 'degraded' : onlineCount === receivers.length ? 'online' : 'offline';

  const maxRange = Math.max(0, ...receivers.map((r) => r.max_range_km));
  const avgSnr = receivers
    .filter((r) => r.avg_snr_db !== null)
    .reduce((sum, r, _, arr) => sum + (r.avg_snr_db ?? 0) / arr.length, 0);

  const hasWarnings = receivers.some((r) => r.warnings.length > 0);

  return (
    <div className="page-enter">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Receivers</h2>
          <p className="text-[13px] text-white/50 mt-1">Real-time monitoring overview</p>
        </div>
        <DataFreshness />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <GlassCard>
          <div className="text-[11px] text-white/30 uppercase tracking-wider mb-1.5">Status</div>
          <div
            className={`text-[26px] font-semibold tracking-tight leading-none ${
              overallStatus === 'online'
                ? 'text-emerald-400'
                : overallStatus === 'degraded'
                  ? 'text-amber-400'
                  : 'text-red-400'
            }`}
          >
            {overallStatus === 'online'
              ? 'Online'
              : overallStatus === 'degraded'
                ? 'Degraded'
                : 'Offline'}
          </div>
          <div className="text-[11px] text-white/50 mt-1">
            {onlineCount}/{receivers.length} receivers healthy
          </div>
        </GlassCard>

        <GlassCard>
          <div className="text-[11px] text-white/30 uppercase tracking-wider mb-1.5">
            Aircraft tracked
          </div>
          <div className="text-[26px] font-semibold tracking-tight leading-none">
            {aircraftCount}
          </div>
          <div className="text-[11px] text-white/50 mt-1">Live count</div>
        </GlassCard>

        <GlassCard>
          <div className="text-[11px] text-white/30 uppercase tracking-wider mb-1.5">
            Avg SNR
          </div>
          <div className="text-[26px] font-semibold tracking-tight leading-none">
            {avgSnr > 0 ? `${avgSnr.toFixed(1)} dB` : '—'}
          </div>
          <div className="text-[11px] text-white/50 mt-1">Signal quality</div>
        </GlassCard>

        <GlassCard>
          <div className="text-[11px] text-white/30 uppercase tracking-wider mb-1.5">
            Max range
          </div>
          <div className="text-[26px] font-semibold tracking-tight leading-none">
            {maxRange > 0 ? `${Math.round(maxRange)} km` : '—'}
          </div>
          <div className="text-[11px] text-white/50 mt-1">Today peak</div>
        </GlassCard>
      </div>

      {/* Alerts */}
      <div className="mb-5">
        {hasWarnings ? (
          receivers
            .filter((r) => r.warnings.length > 0)
            .map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg mb-1.5 text-[12px] bg-amber-400/[0.08] border border-amber-400/[0.15] text-amber-400"
              >
                <AlertTriangle size={14} />
                {r.name}: {r.warnings.join(', ')}
              </div>
            ))
        ) : (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-[12px] bg-emerald-400/[0.06] border border-emerald-400/[0.1] text-emerald-400">
            <CheckCircle size={14} />
            All systems nominal — no warnings in the last 24h
          </div>
        )}
      </div>

      {/* Receiver Cards */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3.5">
        {receivers.map((receiver: ReceiverWithStatus) => (
          <ReceiverCard key={receiver.id} receiver={receiver} />
        ))}
      </div>
    </div>
  );
}
