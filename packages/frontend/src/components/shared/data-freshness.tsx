import { useEffect, useState } from 'react';
import { useHealthStore } from '../../stores/health';

export function DataFreshness() {
  const lastUpdate = useHealthStore((s) => s.lastUpdate);
  const [ago, setAgo] = useState('');

  useEffect(() => {
    function update() {
      const diff = Math.round((Date.now() - lastUpdate) / 1000);
      if (diff < 60) setAgo(`${diff}s ago`);
      else if (diff < 3600) setAgo(`${Math.floor(diff / 60)}m ago`);
      else setAgo(`${Math.floor(diff / 3600)}h ago`);
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  const diff = (Date.now() - lastUpdate) / 1000;
  const color =
    diff < 30 ? 'bg-emerald-400' : diff < 120 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-white/30">
      <div className={`w-[5px] h-[5px] rounded-full ${color}`} />
      Last update: {ago}
    </div>
  );
}
