import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { useReceivers } from '../hooks/use-receivers';
import { useTimeRange } from '../hooks/use-time-range';
import { api } from '../api/client';
import { TimeRangePicker } from '../components/shared/time-range-picker';
import { ChartContainer } from '../components/shared/chart-container';
import { GlassCard } from '../components/shared/glass-card';
import { chartColors } from '../lib/colors';
import type { HealthMetrics } from '@ogn-dashboard/shared';

const tooltipStyle = {
  backgroundColor: 'rgba(10,10,26,0.9)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '6px',
  fontSize: '11px',
};

interface HealthData {
  bucket: string;
  cpu_temp_c: number | null;
  core_voltage: number | null;
  cpu_load: number | null;
  mem_avail_mb: number | null;
  wifi_signal: number | null;
  throttle_flags: string | null;
  ogn_rf_status: string | null;
  ogn_decode_status: string | null;
  usb_rtl_count: number | null;
}

export default function SystemHealthPage() {
  const { receivers } = useReceivers();
  const { range, setRange } = useTimeRange('24h');
  const [series, setSeries] = useState<HealthData[]>([]);
  const [latest, setLatest] = useState<HealthMetrics | null>(null);

  const receiver = receivers[0];

  useEffect(() => {
    if (!receiver) return;
    api.getHealth(receiver.id, range).then(({ series, latest }) => {
      setSeries(series as HealthData[]);
      setLatest(latest as HealthMetrics);
    });
  }, [receiver, range]);

  const formatTime = (val: string) => {
    if (!val) return '';
    const d = new Date(val);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="page-enter">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight">System health</h2>
        <p className="text-[13px] text-white/50 mt-1">
          {receiver ? `${receiver.id} — Raspberry Pi diagnostics` : 'Loading...'}
        </p>
      </div>

      <TimeRangePicker
        options={['1h', '6h', '24h', '7d', '30d']}
        value={range}
        onChange={setRange}
      />

      <div className="grid grid-cols-2 gap-3.5">
        <ChartContainer title="CPU temperature" subtitle="Danger zone above 80°C">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="bucket" tickFormatter={formatTime} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
              <YAxis domain={[30, 90]} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={80} stroke="rgba(248,113,113,0.4)" strokeDasharray="4 4" label={{ value: '80°C', position: 'right', fontSize: 10, fill: 'rgba(248,113,113,0.6)' }} />
              <Area type="monotone" dataKey="cpu_temp_c" stroke={chartColors.orange} fill={chartColors.orange} fillOpacity={0.06} strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Core voltage" subtitle="Warning below 1.2V">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="bucket" tickFormatter={formatTime} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
              <YAxis domain={[1.1, 1.3]} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={1.2} stroke="rgba(248,113,113,0.4)" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="core_voltage" stroke={chartColors.violet} fill={chartColors.violet} fillOpacity={0.06} strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Memory available" subtitle="Total 1024 MB">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="bucket" tickFormatter={formatTime} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
              <YAxis domain={[0, 1024]} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="mem_avail_mb" stroke={chartColors.cyan} fill={chartColors.cyan} fillOpacity={0.06} strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="WiFi signal" subtitle={latest?.wifi_ssid ? `SSID: ${latest.wifi_ssid}` : undefined}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="bucket" tickFormatter={formatTime} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
              <YAxis domain={[-90, -20]} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="wifi_signal" stroke={chartColors.emerald} fill={chartColors.emerald} fillOpacity={0.06} strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Throttle Timeline */}
      <GlassCard className="mt-3.5">
        <div className="text-[13px] font-medium mb-1">Throttle events</div>
        <div className="text-[11px] text-white/30 mb-3.5">Last {range}</div>
        <ThrottleTimeline data={series} />
      </GlassCard>

      {/* Process Status */}
      {latest && (
        <GlassCard className="mt-3.5">
          <div className="text-[13px] font-medium mb-1">Process status</div>
          <div className="text-[11px] text-white/30 mb-2.5">Current state</div>
          <div className="grid grid-cols-3 gap-2">
            <ProcessItem
              name="ogn-rf"
              status={latest.ogn_rf_status || 'UNKNOWN'}
            />
            <ProcessItem
              name="ogn-decode"
              status={latest.ogn_decode_status || 'UNKNOWN'}
            />
            <ProcessItem
              name="rtlsdr"
              status={
                latest.usb_rtl_count != null && latest.usb_rtl_count > 0
                  ? 'USB OK'
                  : 'USB MISSING'
              }
            />
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function ThrottleTimeline({ data }: { data: HealthData[] }) {
  const lanes = ['Undervolt', 'Freq cap', 'Throttled', 'Temp limit'];
  const flagKeys = ['UNDERVOLT', 'FREQ_CAP', 'THROTTLED', 'TEMP_LIMIT'];

  return (
    <div className="space-y-1.5 mt-3.5">
      {lanes.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="text-[10px] text-white/30 w-20 text-right shrink-0">{label}</div>
          <div className="flex-1 h-3.5 rounded bg-white/[0.03] relative overflow-hidden">
            {data.map((d, j) => {
              if (!d.throttle_flags?.includes(flagKeys[i])) return null;
              const left = (j / data.length) * 100;
              const width = Math.max(1, 100 / data.length);
              const color = i === 0 ? chartColors.amber : chartColors.red;
              return (
                <div
                  key={j}
                  className="absolute h-full rounded-sm opacity-60"
                  style={{ left: `${left}%`, width: `${width}%`, background: color }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProcessItem({ name, status }: { name: string; status: string }) {
  const isOk = status === 'RUNNING' || status === 'USB OK';
  return (
    <div className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-white/[0.02] text-[11px]">
      <div className={`w-2 h-2 rounded-full shrink-0 ${isOk ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {name}
      <span className="text-white/30 ml-auto">{status}</span>
    </div>
  );
}
