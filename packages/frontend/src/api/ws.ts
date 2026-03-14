import type { AircraftPosition, ReceiverStatusBeacon, HealthMetrics } from '@ogn-dashboard/shared';

type WSEventMap = {
  aircraft_position: AircraftPosition;
  receiver_status: ReceiverStatusBeacon;
  health_update: HealthMetrics;
  connection: 'connected' | 'reconnecting' | 'disconnected';
};

type Listener<K extends keyof WSEventMap> = (data: WSEventMap[K]) => void;

class WSClient {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<Function>>();
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private shouldReconnect = true;

  connect(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws/live`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.emit('connection', 'connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type && msg.data) {
          this.emit(msg.type, msg.data);
        }
      } catch {
        // ignore
      }
    };

    this.ws.onclose = () => {
      this.emit('connection', 'disconnected');
      if (this.shouldReconnect) {
        this.emit('connection', 'reconnecting');
        setTimeout(() => this.connect(), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.ws?.close();
  }

  on<K extends keyof WSEventMap>(event: K, listener: Listener<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }

  private emit<K extends keyof WSEventMap>(event: K, data: WSEventMap[K]): void {
    this.listeners.get(event)?.forEach((fn) => (fn as Listener<K>)(data));
  }
}

export const wsClient = new WSClient();
