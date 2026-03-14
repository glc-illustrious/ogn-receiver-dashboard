import { useEffect } from 'react';
import { wsClient } from '../api/ws';
import { useAircraftStore } from '../stores/aircraft';
import { useHealthStore } from '../stores/health';
import { WS_BUFFER_FLUSH_MS } from '@ogn-dashboard/shared';
import type { AircraftPosition, HealthMetrics } from '@ogn-dashboard/shared';

export function useLiveData() {
  useEffect(() => {
    const buffer = new Map<string, AircraftPosition>();

    wsClient.connect();

    const unsubAircraft = wsClient.on('aircraft_position', (pos) => {
      buffer.set(pos.aircraft_id, pos);
    });

    const unsubHealth = wsClient.on('health_update', (health: HealthMetrics) => {
      useHealthStore.getState().setLatestHealth(health);
    });

    const unsubConnection = wsClient.on('connection', (status) => {
      useHealthStore.getState().setConnectionStatus(status);
    });

    // Flush buffer periodically
    const flushInterval = setInterval(() => {
      if (buffer.size > 0) {
        const store = useAircraftStore.getState();
        for (const [, pos] of buffer) {
          store.updatePosition(pos);
        }
        buffer.clear();
      }
      useAircraftStore.getState().flushStale();
    }, WS_BUFFER_FLUSH_MS);

    return () => {
      unsubAircraft();
      unsubHealth();
      unsubConnection();
      clearInterval(flushInterval);
      wsClient.disconnect();
    };
  }, []);
}
