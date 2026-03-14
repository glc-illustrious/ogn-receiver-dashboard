import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/index.js';
import { getCoverageSectors } from '../services/coverage.js';
import { parseTimeRange } from '../utils/time.js';

export async function coverageRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Params: { id: string };
    Querystring: { from?: string; to?: string; range?: string; sectors?: string };
  }>('/api/receivers/:id/coverage', async (req, reply) => {
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
    const sectors = req.query.sectors ? parseInt(req.query.sectors) : 36;

    return getCoverageSectors(receiverId, from, to, sectors);
  });
}
