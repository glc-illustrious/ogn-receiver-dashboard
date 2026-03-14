import { getDb } from '../db/index.js';
import type { HealthMetrics } from '@ogn-dashboard/shared';

export function insertHealthMetrics(data: HealthMetrics): void {
  getDb()
    .prepare(
      `INSERT INTO health_metrics (
        receiver_id, timestamp, uptime_s, cpu_temp_c, core_voltage,
        throttle_raw, throttle_flags, cpu_load, mem_avail_mb,
        wifi_ssid, wifi_signal, usb_rtl_count,
        ogn_rf_status, ogn_decode_status, aprs_lines, warnings
      ) VALUES (
        @receiver_id, @timestamp, @uptime_s, @cpu_temp_c, @core_voltage,
        @throttle_raw, @throttle_flags, @cpu_load, @mem_avail_mb,
        @wifi_ssid, @wifi_signal, @usb_rtl_count,
        @ogn_rf_status, @ogn_decode_status, @aprs_lines, @warnings
      )`,
    )
    .run(data);
}

export function getHealthTimeSeries(
  receiverId: string,
  from: string,
  to: string,
  bucketSql: string,
): unknown[] {
  return getDb()
    .prepare(
      `SELECT
        ${bucketSql} as bucket,
        AVG(cpu_temp_c) as cpu_temp_c,
        AVG(core_voltage) as core_voltage,
        AVG(cpu_load) as cpu_load,
        AVG(mem_avail_mb) as mem_avail_mb,
        AVG(wifi_signal) as wifi_signal,
        MAX(throttle_flags) as throttle_flags,
        MAX(ogn_rf_status) as ogn_rf_status,
        MAX(ogn_decode_status) as ogn_decode_status,
        MAX(usb_rtl_count) as usb_rtl_count,
        MAX(warnings) as warnings
      FROM health_metrics
      WHERE receiver_id = ? AND timestamp >= ? AND timestamp <= ?
      GROUP BY bucket
      ORDER BY bucket`,
    )
    .all(receiverId, from, to);
}

export function getLatestHealth(
  receiverId: string,
): HealthMetrics | undefined {
  return getDb()
    .prepare(
      `SELECT * FROM health_metrics
       WHERE receiver_id = ?
       ORDER BY timestamp DESC LIMIT 1`,
    )
    .get(receiverId) as HealthMetrics | undefined;
}
