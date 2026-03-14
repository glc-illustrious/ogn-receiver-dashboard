import { create } from 'zustand';
import type { AircraftPosition } from '@ogn-dashboard/shared';
import { WS_STALE_POSITION_MS } from '@ogn-dashboard/shared';

interface AircraftStore {
  positions: Map<string, AircraftPosition>;
  updatePosition: (pos: AircraftPosition) => void;
  flushStale: () => void;
  clear: () => void;
}

export const useAircraftStore = create<AircraftStore>((set, get) => ({
  positions: new Map(),

  updatePosition: (pos) => {
    const positions = new Map(get().positions);
    positions.set(pos.aircraft_id, pos);
    set({ positions });
  },

  flushStale: () => {
    const cutoff = new Date(Date.now() - WS_STALE_POSITION_MS).toISOString();
    const positions = new Map(get().positions);
    for (const [key, pos] of positions) {
      if (pos.timestamp < cutoff) {
        positions.delete(key);
      }
    }
    set({ positions });
  },

  clear: () => set({ positions: new Map() }),
}));
