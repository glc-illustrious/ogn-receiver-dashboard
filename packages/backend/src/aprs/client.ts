import { createConnection, type Socket } from 'net';
import { EventEmitter } from 'events';
import { config } from '../config.js';
import { parseAPRS } from './parser.js';
import type { ParsedAircraftBeacon, ParsedReceiverBeacon } from '@ogn-dashboard/shared';

export class APRSClient extends EventEmitter {
  private socket: Socket | null = null;
  private buffer = '';
  private reconnectDelay = 5000;
  private maxReconnectDelay = 300000;
  private shouldReconnect = true;

  connect(): void {
    const { host, port, filterLat, filterLon, filterRangeKm } = config.aprs;

    console.log(`[APRS] Connecting to ${host}:${port}...`);
    this.socket = createConnection({ host, port });

    this.socket.setEncoding('utf8');

    this.socket.on('connect', () => {
      console.log('[APRS] Connected');
      this.reconnectDelay = 5000;

      const loginLine = `user OGNDASH pass -1 vers ogn-dashboard 1.0 filter r/${filterLat}/${filterLon}/${filterRangeKm}\r\n`;
      this.socket!.write(loginLine);
    });

    this.socket.on('data', (data: string) => {
      this.buffer += data;
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Respond to keepalive
        if (trimmed.startsWith('#')) {
          if (trimmed.includes('aprsc')) {
            console.log(`[APRS] Server: ${trimmed}`);
          }
          continue;
        }

        try {
          const parsed = parseAPRS(trimmed);
          if (!parsed) continue;

          if (parsed.type === 'aircraft') {
            this.emit('aircraft', parsed as ParsedAircraftBeacon);
          } else if (parsed.type === 'receiver_status') {
            this.emit('receiver_status', parsed as ParsedReceiverBeacon);
          }
        } catch (err) {
          console.error('[APRS] Parse error:', err, 'Line:', trimmed);
        }
      }
    });

    this.socket.on('error', (err) => {
      console.error('[APRS] Socket error:', err.message);
    });

    this.socket.on('close', () => {
      console.log('[APRS] Connection closed');
      if (this.shouldReconnect) {
        console.log(`[APRS] Reconnecting in ${this.reconnectDelay / 1000}s...`);
        setTimeout(() => this.connect(), this.reconnectDelay);
        this.reconnectDelay = Math.min(
          this.reconnectDelay * 2,
          this.maxReconnectDelay,
        );
      }
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }
}
