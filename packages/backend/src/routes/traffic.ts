import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/index.js';
import { parseTimeRange } from '../utils/time.js';
import * as trafficService from '../services/traffic.js';

export async function trafficRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Params: { id: string };
    Querystring: { from?: string; to?: string; range?: string };
  }>('/api/receivers/:id/traffic', async (req, reply) => {
    const receiverId = req.params.id;
    const db = getDb();
    const receiver = db
      .prepare('SELECT id FROM receivers WHERE id = ?')
      .get(receiverId);

    if (!receiver) {
      return reply.status(404).send({ error: 'Receiver not found' });
    }

    const range = req.query.range || '7d';
    const toMs = req.query.to ? new Date(req.query.to).getTime() : Date.now();
    const fromMs = req.query.from
      ? new Date(req.query.from).getTime()
      : toMs - parseTimeRange(range);

    const from = new Date(fromMs).toISOString();
    const to = new Date(toMs).toISOString();

    return {
      hourly: trafficService.getHourlyTraffic(receiverId, from, to),
      daily_unique: trafficService.getDailyUnique(receiverId, from, to),
      max_range: trafficService.getMaxRangeTrend(receiverId, from, to),
      snr_distribution: trafficService.getSnrDistribution(receiverId, from, to),
      heatmap: trafficService.getHeatmap(receiverId, from, to),
      top_aircraft: trafficService.getTopAircraft(receiverId, from, to),
    };
  });
}
