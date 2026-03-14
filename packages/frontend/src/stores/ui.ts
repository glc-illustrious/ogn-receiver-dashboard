import { create } from 'zustand';

interface UIStore {
  sidebarOpen: boolean;
  mapColorMode: 'altitude' | 'snr' | 'speed';
  mapMode: 'live' | 'historical';
  showCoverage: boolean;
  showRangeRings: boolean;
  showAircraft: boolean;
  timeRange: string;
  selectedReceiverId: string | null;
  toggleSidebar: () => void;
  setMapColorMode: (mode: 'altitude' | 'snr' | 'speed') => void;
  setMapMode: (mode: 'live' | 'historical') => void;
  setShowCoverage: (show: boolean) => void;
  setShowRangeRings: (show: boolean) => void;
  setShowAircraft: (show: boolean) => void;
  setTimeRange: (range: string) => void;
  setSelectedReceiverId: (id: string | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  mapColorMode: 'altitude',
  mapMode: 'live',
  showCoverage: true,
  showRangeRings: true,
  showAircraft: true,
  timeRange: '24h',
  selectedReceiverId: null,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setMapColorMode: (mode) => set({ mapColorMode: mode }),
  setMapMode: (mode) => set({ mapMode: mode }),
  setShowCoverage: (show) => set({ showCoverage: show }),
  setShowRangeRings: (show) => set({ showRangeRings: show }),
  setShowAircraft: (show) => set({ showAircraft: show }),
  setTimeRange: (range) => set({ timeRange: range }),
  setSelectedReceiverId: (id) => set({ selectedReceiverId: id }),
}));
