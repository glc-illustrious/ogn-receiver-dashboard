import { create } from 'zustand';
import type { HealthMetrics, ReceiverWithStatus } from '@ogn-dashboard/shared';

interface HealthStore {
  receivers: ReceiverWithStatus[];
  latestHealth: HealthMetrics | null;
  healthSeries: unknown[];
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
  lastUpdate: number;
  setReceivers: (receivers: ReceiverWithStatus[]) => void;
  setLatestHealth: (health: HealthMetrics) => void;
  setHealthSeries: (series: unknown[]) => void;
  setConnectionStatus: (status: 'connected' | 'reconnecting' | 'disconnected') => void;
  updateLastUpdate: () => void;
}

export const useHealthStore = create<HealthStore>((set) => ({
  receivers: [],
  latestHealth: null,
  healthSeries: [],
  connectionStatus: 'disconnected',
  lastUpdate: Date.now(),

  setReceivers: (receivers) => set({ receivers }),
  setLatestHealth: (health) => set({ latestHealth: health, lastUpdate: Date.now() }),
  setHealthSeries: (series) => set({ healthSeries: series }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  updateLastUpdate: () => set({ lastUpdate: Date.now() }),
}));
