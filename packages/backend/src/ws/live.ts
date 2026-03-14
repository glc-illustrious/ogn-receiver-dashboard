import type { FastifyInstance } from 'fastify';

export async function liveWsRoute(app: FastifyInstance): Promise<void> {
  app.get('/ws/live', { websocket: true }, (socket) => {
    socket.on('message', (msg) => {
      // Client can send subscription preferences
      try {
        const data = JSON.parse(msg.toString());
        if (data.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        // ignore malformed messages
      }
    });
  });
}

export function broadcastPosition(
  app: FastifyInstance,
  data: unknown,
): void {
  const msg = JSON.stringify({ type: 'aircraft_position', data });
  app.websocketServer?.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(msg);
    }
  });
}

export function broadcastReceiverStatus(
  app: FastifyInstance,
  data: unknown,
): void {
  const msg = JSON.stringify({ type: 'receiver_status', data });
  app.websocketServer?.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(msg);
    }
  });
}
