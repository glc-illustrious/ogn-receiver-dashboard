import { getDb } from '../db/index.js';
import { distanceKm, bearingDeg } from '../utils/geo.js';
import type { ParsedAircraftBeacon, ParsedReceiverBeacon } from '@ogn-dashboard/shared';

const insertAircraftStmt = () =>
  getDb().prepare(`
    INSERT INTO aircraft_positions (
      receiver_id, timestamp, aircraft_id, aircraft_type, address_type,
      latitude, longitude, altitude_m, course, speed_kmh,
      climb_fpm, turn_rate, snr_db, error_count, freq_offset_khz,
      gps_accuracy, distance_km, bearing, stealth, no_tracking
    ) VALUES (
      @receiver_id, @timestamp, @aircraft_id, @aircraft_type, @address_type,
      @latitude, @longitude, @altitude_m, @course, @speed_kmh,
      @climb_fpm, @turn_rate, @snr_db, @error_count, @freq_offset_khz,
      @gps_accuracy, @distance_km, @bearing, @stealth, @no_tracking
    )
  `);

const insertReceiverStatusStmt = () =>
  getDb().prepare(`
    INSERT INTO receiver_status (
      receiver_id, timestamp, version, cpu_load, ram_free_mb, ram_total_mb,
      ntp_offset_ms, ntp_ppm, temperature_c, rf_correction_ppm, rf_noise_db, raw_message
    ) VALUES (
      @receiver_id, @timestamp, @version, @cpu_load, @ram_free_mb, @ram_total_mb,
      @ntp_offset_ms, @ntp_ppm, @temperature_c, @rf_correction_ppm, @rf_noise_db, @raw_message
    )
  `);

let _insertAircraft: ReturnType<typeof insertAircraftStmt> | null = null;
let _insertReceiverStatus: ReturnType<typeof insertReceiverStatusStmt> | null = null;

function getInsertAircraft() {
  if (!_insertAircraft) _insertAircraft = insertAircraftStmt();
  return _insertAircraft;
}

function getInsertReceiverStatus() {
  if (!_insertReceiverStatus) _insertReceiverStatus = insertReceiverStatusStmt();
  return _insertReceiverStatus;
}

export function ingestAircraftBeacon(
  beacon: ParsedAircraftBeacon,
): { receiver_id: string; distance_km: number; bearing: number } | null {
  // Skip stealth aircraft entirely
  if (beacon.stealth) return null;

  // Look up receiver position
  const db = getDb();
  const receiver = db
    .prepare('SELECT latitude, longitude FROM receivers WHERE id = ?')
    .get(beacon.receiver) as { latitude: number; longitude: number } | undefined;

  if (!receiver) return null;

  const dist = Math.round(
    distanceKm(receiver.latitude, receiver.longitude, beacon.latitude, beacon.longitude) * 10,
  ) / 10;
  const bear = Math.round(
    bearingDeg(receiver.latitude, receiver.longitude, beacon.latitude, beacon.longitude) * 10,
  ) / 10;

  // Don't persist no-tracking aircraft (they're only shown live)
  if (!beacon.no_tracking) {
    getInsertAircraft().run({
      receiver_id: beacon.receiver,
      timestamp: beacon.timestamp,
      aircraft_id: beacon.aircraft_id,
      aircraft_type: beacon.aircraft_type,
      address_type: beacon.address_type,
      latitude: beacon.latitude,
      longitude: beacon.longitude,
      altitude_m: beacon.altitude_m,
      course: beacon.course,
      speed_kmh: beacon.speed_kmh,
      climb_fpm: beacon.climb_fpm,
      turn_rate: beacon.turn_rate,
      snr_db: beacon.snr_db,
      error_count: beacon.error_count,
      freq_offset_khz: beacon.freq_offset_khz,
      gps_accuracy: beacon.gps_accuracy,
      distance_km: dist,
      bearing: bear,
      stealth: 0,
      no_tracking: 0,
    });
  }

  return { receiver_id: beacon.receiver, distance_km: dist, bearing: bear };
}

export function ingestReceiverStatus(beacon: ParsedReceiverBeacon): void {
  const db = getDb();
  const receiver = db
    .prepare('SELECT id FROM receivers WHERE id = ?')
    .get(beacon.receiver);

  if (!receiver) return;

  getInsertReceiverStatus().run({
    receiver_id: beacon.receiver,
    timestamp: beacon.timestamp,
    version: beacon.version,
    cpu_load: beacon.cpu_load,
    ram_free_mb: beacon.ram_free_mb,
    ram_total_mb: beacon.ram_total_mb,
    ntp_offset_ms: beacon.ntp_offset_ms,
    ntp_ppm: beacon.ntp_ppm,
    temperature_c: beacon.temperature_c,
    rf_correction_ppm: beacon.rf_correction_ppm,
    rf_noise_db: beacon.rf_noise_db,
    raw_message: beacon.raw,
  });
}
