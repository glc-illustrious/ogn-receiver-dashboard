import { getDb } from '../db/index.js';

export function getHourlyTraffic(receiverId: string, from: string, to: string) {
  return getDb()
    .prepare(
      `SELECT
        strftime('%Y-%m-%dT%H:00:00', timestamp) as hour,
        SUM(CASE WHEN aircraft_type = 1 THEN 1 ELSE 0 END) as gliders,
        SUM(CASE WHEN aircraft_type != 1 THEN 1 ELSE 0 END) as powered,
        COUNT(DISTINCT aircraft_id) as total
      FROM aircraft_positions
      WHERE receiver_id = ? AND timestamp >= ? AND timestamp <= ?
      GROUP BY hour
      ORDER BY hour`,
    )
    .all(receiverId, from, to);
}

export function getDailyUnique(receiverId: string, from: string, to: string) {
  return getDb()
    .prepare(
      `SELECT
        strftime('%Y-%m-%d', timestamp) as date,
        COUNT(DISTINCT aircraft_id) as count
      FROM aircraft_positions
      WHERE receiver_id = ? AND timestamp >= ? AND timestamp <= ?
      GROUP BY date
      ORDER BY date`,
    )
    .all(receiverId, from, to);
}

export function getMaxRangeTrend(receiverId: string, from: string, to: string) {
  return getDb()
    .prepare(
      `SELECT
        strftime('%Y-%m-%d', timestamp) as date,
        MAX(distance_km) as max_km
      FROM aircraft_positions
      WHERE receiver_id = ? AND timestamp >= ? AND timestamp <= ?
      GROUP BY date
      ORDER BY date`,
    )
    .all(receiverId, from, to);
}

export function getSnrDistribution(receiverId: string, from: string, to: string) {
  return getDb()
    .prepare(
      `SELECT
        CASE
          WHEN snr_db < 2 THEN '0-2'
          WHEN snr_db < 4 THEN '2-4'
          WHEN snr_db < 6 THEN '4-6'
          WHEN snr_db < 8 THEN '6-8'
          WHEN snr_db < 10 THEN '8-10'
          WHEN snr_db < 12 THEN '10-12'
          WHEN snr_db < 14 THEN '12-14'
          WHEN snr_db < 16 THEN '14-16'
          WHEN snr_db < 18 THEN '16-18'
          WHEN snr_db < 20 THEN '18-20'
          ELSE '20+'
        END as bin,
        COUNT(*) as count
      FROM aircraft_positions
      WHERE receiver_id = ? AND timestamp >= ? AND timestamp <= ? AND snr_db IS NOT NULL
      GROUP BY bin
      ORDER BY MIN(snr_db)`,
    )
    .all(receiverId, from, to);
}

export function getHeatmap(receiverId: string, from: string, to: string) {
  return getDb()
    .prepare(
      `SELECT
        CAST(strftime('%w', timestamp) AS INTEGER) as day,
        CAST(strftime('%H', timestamp) AS INTEGER) as hour,
        COUNT(*) as count
      FROM aircraft_positions
      WHERE receiver_id = ? AND timestamp >= ? AND timestamp <= ?
      GROUP BY day, hour`,
    )
    .all(receiverId, from, to);
}

export function getTopAircraft(receiverId: string, from: string, to: string) {
  return getDb()
    .prepare(
      `SELECT
        aircraft_id,
        MAX(aircraft_type) as aircraft_type,
        COUNT(*) as position_count,
        ROUND(MAX(distance_km), 1) as max_range_km,
        ROUND(AVG(snr_db), 1) as avg_snr_db
      FROM aircraft_positions
      WHERE receiver_id = ? AND timestamp >= ? AND timestamp <= ?
      GROUP BY aircraft_id
      ORDER BY position_count DESC
      LIMIT 20`,
    )
    .all(receiverId, from, to);
}
