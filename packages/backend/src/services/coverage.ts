import { getDb } from '../db/index.js';

export function getCoverageSectors(
  receiverId: string,
  from: string,
  to: string,
  sectorCount = 36,
) {
  const sectorSize = 360 / sectorCount;

  return getDb()
    .prepare(
      `SELECT
        CAST(FLOOR(bearing / ?) AS INTEGER) * ? as bearing_start,
        (CAST(FLOOR(bearing / ?) AS INTEGER) + 1) * ? as bearing_end,
        MAX(distance_km) as max_distance_km,
        ROUND(AVG(snr_db), 1) as avg_snr_db,
        COUNT(*) as position_count,
        latitude as sample_lat,
        longitude as sample_lon
      FROM aircraft_positions
      WHERE receiver_id = ? AND timestamp >= ? AND timestamp <= ?
        AND bearing IS NOT NULL AND distance_km IS NOT NULL
      GROUP BY CAST(FLOOR(bearing / ?) AS INTEGER)
      ORDER BY bearing_start`,
    )
    .all(
      sectorSize, sectorSize,
      sectorSize, sectorSize,
      receiverId, from, to,
      sectorSize,
    );
}

export function regenerateCoverageSectors(
  receiverId: string,
  from: string,
  to: string,
  sectorCount = 72,
): void {
  const db = getDb();
  const sectorSize = 360 / sectorCount;

  db.prepare(
    `DELETE FROM coverage_sectors WHERE receiver_id = ? AND period_start = ? AND period_end = ?`,
  ).run(receiverId, from, to);

  db.prepare(
    `INSERT INTO coverage_sectors (
      receiver_id, bearing_start, bearing_end, max_distance_km,
      avg_snr_db, position_count, sample_lat, sample_lon, period_start, period_end
    )
    SELECT
      ?,
      CAST(FLOOR(bearing / ?) AS INTEGER) * ?,
      (CAST(FLOOR(bearing / ?) AS INTEGER) + 1) * ?,
      MAX(distance_km),
      ROUND(AVG(snr_db), 1),
      COUNT(*),
      -- Pick the position at max range for this sector
      (SELECT ap2.latitude FROM aircraft_positions ap2
       WHERE ap2.receiver_id = ? AND ap2.timestamp >= ? AND ap2.timestamp <= ?
         AND CAST(FLOOR(ap2.bearing / ?) AS INTEGER) = CAST(FLOOR(ap.bearing / ?) AS INTEGER)
       ORDER BY ap2.distance_km DESC LIMIT 1),
      (SELECT ap2.longitude FROM aircraft_positions ap2
       WHERE ap2.receiver_id = ? AND ap2.timestamp >= ? AND ap2.timestamp <= ?
         AND CAST(FLOOR(ap2.bearing / ?) AS INTEGER) = CAST(FLOOR(ap.bearing / ?) AS INTEGER)
       ORDER BY ap2.distance_km DESC LIMIT 1),
      ?, ?
    FROM aircraft_positions ap
    WHERE receiver_id = ? AND timestamp >= ? AND timestamp <= ?
      AND bearing IS NOT NULL AND distance_km IS NOT NULL
    GROUP BY CAST(FLOOR(bearing / ?) AS INTEGER)`,
  ).run(
    receiverId,
    sectorSize, sectorSize,
    sectorSize, sectorSize,
    receiverId, from, to, sectorSize, sectorSize,
    receiverId, from, to, sectorSize, sectorSize,
    from, to,
    receiverId, from, to,
    sectorSize,
  );
}
