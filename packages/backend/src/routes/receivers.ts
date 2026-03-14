import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/index.js';
import { RECEIVER_STATUS_THRESHOLDS } from '@ogn-dashboard/shared';
import type { ReceiverWithStatus, ReceiverStatus } from '@ogn-dashboard/shared';

export async function receiversRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/receivers', async () => {
    const db = getDb();
    const receivers = db.prepare('SELECT id, name, latitude, longitude, altitude, created_at, updated_at FROM receivers').all() as Array<{
      id: string;
      name: string;
      latitude: number;
      longitude: number;
      altitude: number | null;
      created_at: string;
      updated_at: string;
    }>;

    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    const result: ReceiverWithStatus[] = [];

    for (const r of receivers) {
      const latestHealth = db
        .prepare(
          'SELECT timestamp, warnings FROM health_metrics WHERE receiver_id = ? ORDER BY timestamp DESC LIMIT 1',
        )
        .get(r.id) as { timestamp: string; warnings: string | null } | undefined;

      const aircraftCount = (
        db
          .prepare(
            'SELECT COUNT(DISTINCT aircraft_id) as cnt FROM aircraft_positions WHERE receiver_id = ? AND timestamp >= ?',
          )
          .get(r.id, fiveMinAgo) as { cnt: number }
      ).cnt;

      const rangeRow = db
        .prepare(
          "SELECT MAX(distance_km) as max_km FROM aircraft_positions WHERE receiver_id = ? AND timestamp >= date('now')",
        )
        .get(r.id) as { max_km: number | null };

      const snrRow = db
        .prepare(
          'SELECT ROUND(AVG(snr_db), 1) as avg_snr FROM aircraft_positions WHERE receiver_id = ? AND timestamp >= ? AND snr_db IS NOT NULL',
        )
        .get(r.id, fiveMinAgo) as { avg_snr: number | null };

      // Check for recent APRS activity (receiver_status or aircraft_positions)
      const latestAprs = db
        .prepare(
          'SELECT timestamp FROM receiver_status WHERE receiver_id = ? ORDER BY timestamp DESC LIMIT 1',
        )
        .get(r.id) as { timestamp: string } | undefined;

      let status: ReceiverStatus = 'offline';
      const warnings: string[] = [];

      // Determine status from health metrics (Pi push) if available
      if (latestHealth) {
        const age = Date.now() - new Date(latestHealth.timestamp).getTime();
        if (age < RECEIVER_STATUS_THRESHOLDS.ONLINE_MAX_AGE_MS) {
          if (latestHealth.warnings) {
            const w = latestHealth.warnings.split(',').map((s) => s.trim());
            warnings.push(...w);
            status = 'degraded';
          } else {
            status = 'online';
          }
        }
      }

      // Also consider online if we see recent aircraft positions (APRS data flowing)
      if (status === 'offline' && aircraftCount > 0) {
        status = 'online';
      }

      // Or if we got a recent APRS receiver status beacon
      if (status === 'offline' && latestAprs) {
        const aprsAge = Date.now() - new Date(latestAprs.timestamp).getTime();
        if (aprsAge < RECEIVER_STATUS_THRESHOLDS.ONLINE_MAX_AGE_MS) {
          status = 'online';
        }
      }

      result.push({
        ...r,
        status,
        warnings,
        last_health_at: latestHealth?.timestamp ?? null,
        aircraft_count: aircraftCount,
        max_range_km: Math.round((rangeRow.max_km ?? 0) * 10) / 10,
        avg_snr_db: snrRow.avg_snr,
      });
    }

    return result;
  });

  app.get<{ Params: { id: string } }>('/api/receivers/:id', async (req, reply) => {
    const db = getDb();
    const receiver = db
      .prepare('SELECT * FROM receivers WHERE id = ?')
      .get(req.params.id);

    if (!receiver) {
      return reply.status(404).send({ error: 'Receiver not found' });
    }

    return receiver;
  });
}
