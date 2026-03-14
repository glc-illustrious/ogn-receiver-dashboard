import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/index.js';
import { config } from '../config.js';
import { insertHealthMetrics, getHealthTimeSeries, getLatestHealth } from '../services/health.js';
import { parseTimeRange, timeAgo, getBucketInterval } from '../utils/time.js';
import type { HealthMetrics } from '@ogn-dashboard/shared';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  // Pi pushes health metrics
  app.post<{ Params: { id: string }; Body: Omit<HealthMetrics, 'receiver_id' | 'id'> }>(
    '/api/receivers/:id/health',
    async (req, reply) => {
      const receiverId = req.params.id;

      // Verify API key
      const authHeader = req.headers.authorization;
      const expectedKey = config.receiverApiKeys.get(receiverId);

      if (!expectedKey || !authHeader || authHeader !== `Bearer ${expectedKey}`) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // Ensure receiver exists
      const db = getDb();
      const receiver = db
        .prepare('SELECT id FROM receivers WHERE id = ?')
        .get(receiverId);

      if (!receiver) {
        return reply.status(404).send({ error: 'Receiver not found' });
      }

      const data: HealthMetrics = {
        ...req.body,
        receiver_id: receiverId,
        timestamp: req.body.timestamp || new Date().toISOString(),
      };

      insertHealthMetrics(data);

      // Broadcast via WebSocket
      app.websocketServer?.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(
            JSON.stringify({ type: 'health_update', data }),
          );
        }
      });

      return { ok: true };
    },
  );

  // Get health time series
  app.get<{
    Params: { id: string };
    Querystring: { from?: string; to?: string; range?: string };
  }>('/api/receivers/:id/health', async (req, reply) => {
    const receiverId = req.params.id;
    const db = getDb();
    const receiver = db
      .prepare('SELECT id FROM receivers WHERE id = ?')
      .get(receiverId);

    if (!receiver) {
      return reply.status(404).send({ error: 'Receiver not found' });
    }

    const range = req.query.range || '24h';
    const toMs = req.query.to ? new Date(req.query.to).getTime() : Date.now();
    const fromMs = req.query.from
      ? new Date(req.query.from).getTime()
      : toMs - parseTimeRange(range);

    const from = new Date(fromMs).toISOString();
    const to = new Date(toMs).toISOString();
    const { sql: bucketSql } = getBucketInterval(fromMs, toMs);

    const series = getHealthTimeSeries(receiverId, from, to, bucketSql);
    const latest = getLatestHealth(receiverId);

    return { series, latest };
  });
}
