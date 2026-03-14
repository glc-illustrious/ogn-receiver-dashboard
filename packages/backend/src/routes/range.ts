import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/index.js';
import { parseTimeRange } from '../utils/time.js';

export async function rangeRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Params: { id: string };
    Querystring: { from?: string; to?: string; range?: string; min_snr?: string; limit?: string };
  }>('/api/receivers/:id/range', async (req, reply) => {
    const receiverId = req.params.id;
    const db = getDb();
    const receiver = db
      .prepare('SELECT id FROM receivers WHERE id = ?')
      .get(receiverId);

    if (!receiver) {
      return reply.status(404).send({ error: 'Receiver not found' });
    }

    const range = req.query.range || '1h';
    const toMs = req.query.to ? new Date(req.query.to).getTime() : Date.now();
    const fromMs = req.query.from
      ? new Date(req.query.from).getTime()
      : toMs - parseTimeRange(range);

    const from = new Date(fromMs).toISOString();
    const to = new Date(toMs).toISOString();
    const minSnr = req.query.min_snr ? parseFloat(req.query.min_snr) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10000;

    let query = `
      SELECT aircraft_id, aircraft_type, latitude, longitude, altitude_m,
             course, speed_kmh, climb_fpm, snr_db, distance_km, bearing, timestamp
      FROM aircraft_positions
      WHERE receiver_id = ? AND timestamp >= ? AND timestamp <= ?
    `;
    const params: (string | number)[] = [receiverId, from, to];

    if (minSnr !== null) {
      query += ' AND snr_db >= ?';
      params.push(minSnr);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    return db.prepare(query).all(...params);
  });
}
