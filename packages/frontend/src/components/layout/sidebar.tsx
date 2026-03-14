import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MapPin, Activity, BarChart3 } from 'lucide-react';
import { useHealthStore } from '../../stores/health';
import { useLiveData } from '../../hooks/use-live-data';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/map', icon: MapPin, label: 'Range map' },
  { to: '/health', icon: Activity, label: 'System health' },
  { to: '/traffic', icon: BarChart3, label: 'Traffic stats' },
];

export function Sidebar() {
  const connectionStatus = useHealthStore((s) => s.connectionStatus);

  // Start WebSocket connection
  useLiveData();

  return (
    <aside className="w-[220px] min-w-[220px] bg-white/[0.025] backdrop-blur-[40px] border-r border-white/[0.08] flex flex-col">
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.08]">
        <h1 className="text-[15px] font-semibold tracking-tight">OGN Dashboard</h1>
        <p className="text-[11px] text-white/30 mt-0.5">Receiver monitoring</p>
      </div>

      <nav className="p-3 flex-1 flex flex-col gap-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all border border-transparent ${
                isActive
                  ? 'bg-white/[0.04] text-white/90 border-white/[0.08] font-medium'
                  : 'text-white/50 hover:bg-white/[0.07] hover:text-white/90'
              }`
            }
          >
            <Icon size={18} className="opacity-60" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-white/[0.08] flex items-center gap-2 text-[11px] text-white/30">
        <div
          className={`w-[7px] h-[7px] rounded-full ${
            connectionStatus === 'connected'
              ? 'bg-emerald-400 animate-pulse-dot'
              : connectionStatus === 'reconnecting'
                ? 'bg-amber-400'
                : 'bg-red-400'
          }`}
        />
        {connectionStatus === 'connected'
          ? 'WebSocket connected'
          : connectionStatus === 'reconnecting'
            ? 'Reconnecting...'
            : 'Disconnected'}
      </div>
    </aside>
  );
}
