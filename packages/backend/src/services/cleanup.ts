import { getDb } from '../db/index.js';
import { DATA_RETENTION } from '@ogn-dashboard/shared';

export function runCleanup(): void {
  const db = getDb();
  const now = Date.now();

  const apCutoff = new Date(
    now - DATA_RETENTION.AIRCRAFT_POSITIONS_DAYS * 86400000,
  ).toISOString();
  const hmCutoff = new Date(
    now - DATA_RETENTION.HEALTH_METRICS_RAW_DAYS * 86400000,
  ).toISOString();
  const rsCutoff = new Date(
    now - DATA_RETENTION.RECEIVER_STATUS_DAYS * 86400000,
  ).toISOString();

  const apResult = db
    .prepare('DELETE FROM aircraft_positions WHERE timestamp < ?')
    .run(apCutoff);
  const hmResult = db
    .prepare('DELETE FROM health_metrics WHERE timestamp < ?')
    .run(hmCutoff);
  const rsResult = db
    .prepare('DELETE FROM receiver_status WHERE timestamp < ?')
    .run(rsCutoff);

  console.log(
    `[Cleanup] Deleted: ${apResult.changes} positions, ${hmResult.changes} health, ${rsResult.changes} status`,
  );
}

export function scheduleCleanup(): void {
  // Run at 03:00 UTC daily
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(3, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);

  const delay = next.getTime() - now.getTime();
  setTimeout(() => {
    runCleanup();
    // Then run every 24h
    setInterval(runCleanup, 86400000);
  }, delay);

  console.log(`[Cleanup] Scheduled for ${next.toISOString()}`);
}
