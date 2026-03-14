import { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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
import { formatAircraftType } from '../lib/format';
import type { TrafficStats } from '@ogn-dashboard/shared';

const tooltipStyle = {
  backgroundColor: 'rgba(10,10,26,0.9)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '6px',
  fontSize: '11px',
};

export default function TrafficStatsPage() {
  const { receivers } = useReceivers();
  const { range, setRange } = useTimeRange('7d');
  const [stats, setStats] = useState<TrafficStats | null>(null);

  const receiver = receivers[0];

  useEffect(() => {
    if (!receiver) return;
    api.getTraffic(receiver.id, range).then((data) => setStats(data as TrafficStats));
  }, [receiver, range]);

  const formatHour = (val: string) => {
    if (!val) return '';
    const d = new Date(val);
    return `${d.getHours().toString().padStart(2, '0')}:00`;
  };

  const formatDate = (val: string) => {
    if (!val) return '';
    return val.slice(5);
  };

  return (
    <div className="page-enter">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight">Traffic statistics</h2>
        <p className="text-[13px] text-white/50 mt-1">
          {receiver ? `${receiver.id} — aircraft activity` : 'Loading...'}
        </p>
      </div>

      <TimeRangePicker
        options={['24h', '7d', '30d', '90d']}
        value={range}
        onChange={setRange}
      />

      {stats && (
        <>
          {/* Aircraft per hour */}
          <ChartContainer
            title="Aircraft per hour"
            subtitle={`Gliders vs powered — last ${range}`}
            height={220}
            className="mb-3.5"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.hourly}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="hour" tickFormatter={formatHour} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  wrapperStyle={{ fontSize: '10px' }}
                  iconSize={10}
                />
                <Bar dataKey="gliders" name="Gliders" fill="rgba(96,165,250,0.6)" stackId="a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="powered" name="Powered" fill="rgba(251,191,36,0.4)" stackId="a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          <div className="grid grid-cols-2 gap-3.5">
            {/* Max range trend */}
            <ChartContainer title="Max range trend" subtitle="Daily maximum detection distance">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.max_range}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                  <YAxis domain={[0, 'auto']} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="max_km" stroke={chartColors.blue} fill={chartColors.blue} fillOpacity={0.06} strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* SNR distribution */}
            <ChartContainer title="SNR distribution" subtitle="Signal quality histogram">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.snr_distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="bin" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="rgba(167,139,250,0.5)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* Heatmap */}
          <GlassCard className="mt-3.5">
            <div className="text-[13px] font-medium mb-1">Activity heatmap</div>
            <div className="text-[11px] text-white/30 mb-3">Day x hour — position count</div>
            <DayHourHeatmap data={stats.heatmap} />
          </GlassCard>

          {/* Top aircraft */}
          <GlassCard className="mt-3.5">
            <div className="text-[13px] font-medium mb-1">Top aircraft</div>
            <div className="text-[11px] text-white/30 mb-2.5">Most frequently seen — last {range}</div>
            <table className="w-full mt-2.5">
              <thead>
                <tr>
                  {['Aircraft ID', 'Type', 'Positions', 'Max range', 'Avg SNR'].map((h) => (
                    <th
                      key={h}
                      className="text-[10px] text-white/30 uppercase tracking-wider text-left px-2 py-1.5 border-b border-white/[0.08]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.top_aircraft.map((a) => (
                  <tr key={a.aircraft_id}>
                    <td className="text-[12px] px-2 py-1.5 border-b border-white/[0.03] font-mono text-blue-400">
                      {a.aircraft_id}
                    </td>
                    <td className="text-[12px] px-2 py-1.5 border-b border-white/[0.03]">
                      {formatAircraftType(a.aircraft_type)}
                    </td>
                    <td className="text-[12px] px-2 py-1.5 border-b border-white/[0.03]">
                      {a.position_count.toLocaleString()}
                    </td>
                    <td className="text-[12px] px-2 py-1.5 border-b border-white/[0.03]">
                      {a.max_range_km} km
                    </td>
                    <td className="text-[12px] px-2 py-1.5 border-b border-white/[0.03]">
                      {a.avg_snr_db} dB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </>
      )}
    </div>
  );
}

function DayHourHeatmap({ data }: { data: { day: number; hour: number; count: number }[] }) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const grid = useMemo(() => {
    const maxCount = Math.max(1, ...data.map((d) => d.count));
    const cells = new Map<string, number>();
    data.forEach((d) => cells.set(`${d.day}-${d.hour}`, d.count / maxCount));
    return { cells, maxCount };
  }, [data]);

  return (
    <div
      className="grid gap-[2px] mt-2.5"
      style={{ gridTemplateColumns: '30px repeat(24, 1fr)' }}
    >
      <div />
      {Array.from({ length: 24 }, (_, h) => (
        <div key={h} className="text-[8px] text-white/30 text-center">
          {h}
        </div>
      ))}
      {Array.from({ length: 7 }, (_, d) => (
        <>
          <div
            key={`label-${d}`}
            className="text-[9px] text-white/30 flex items-center justify-end pr-1"
          >
            {dayNames[d]}
          </div>
          {Array.from({ length: 24 }, (_, h) => {
            const v = grid.cells.get(`${d}-${h}`) ?? 0;
            const hue = 220 + (1 - v) * 20;
            const sat = 70 + v * 30;
            const light = 15 + v * 35;
            return (
              <div
                key={`${d}-${h}`}
                className="aspect-square rounded-[2px] min-w-0 min-h-0"
                style={{ background: `hsl(${hue}, ${sat}%, ${light}%)` }}
                title={`${dayNames[d]} ${h}:00 — ${Math.round(v * grid.maxCount)} positions`}
              />
            );
          })}
        </>
      ))}
    </div>
  );
}
