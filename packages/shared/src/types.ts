// ── Receiver ──

export interface Receiver {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  created_at: string;
  updated_at: string;
}

export type ReceiverStatus = 'online' | 'degraded' | 'offline';

export interface ReceiverWithStatus extends Receiver {
  status: ReceiverStatus;
  warnings: string[];
  last_health_at: string | null;
  aircraft_count: number;
  max_range_km: number;
  avg_snr_db: number | null;
}

// ── Aircraft Position ──

export interface AircraftPosition {
  id?: number;
  receiver_id: string;
  timestamp: string;
  aircraft_id: string;
  aircraft_type: number;
  address_type: number;
  latitude: number;
  longitude: number;
  altitude_m: number | null;
  course: number | null;
  speed_kmh: number | null;
  climb_fpm: number | null;
  turn_rate: number | null;
  snr_db: number | null;
  error_count: number | null;
  freq_offset_khz: number | null;
  gps_accuracy: string | null;
  distance_km: number | null;
  bearing: number | null;
  stealth: number;
  no_tracking: number;
}

// ── Receiver Status (APRS) ──

export interface ReceiverStatusBeacon {
  id?: number;
  receiver_id: string;
  timestamp: string;
  version: string | null;
  cpu_load: number | null;
  ram_free_mb: number | null;
  ram_total_mb: number | null;
  ntp_offset_ms: number | null;
  ntp_ppm: number | null;
  temperature_c: number | null;
  rf_correction_ppm: number | null;
  rf_noise_db: number | null;
  raw_message: string | null;
}

// ── Health Metrics (Pi push) ──

export interface HealthMetrics {
  id?: number;
  receiver_id: string;
  timestamp: string;
  uptime_s: number | null;
  cpu_temp_c: number | null;
  core_voltage: number | null;
  throttle_raw: string | null;
  throttle_flags: string | null;
  cpu_load: number | null;
  mem_avail_mb: number | null;
  wifi_ssid: string | null;
  wifi_signal: number | null;
  usb_rtl_count: number | null;
  ogn_rf_status: string | null;
  ogn_decode_status: string | null;
  aprs_lines: number | null;
  warnings: string | null;
}

// ── Coverage ──

export interface CoverageSector {
  id?: number;
  receiver_id: string;
  bearing_start: number;
  bearing_end: number;
  max_distance_km: number;
  avg_snr_db: number | null;
  position_count: number;
  sample_lat: number | null;
  sample_lon: number | null;
  period_start: string;
  period_end: string;
}

// ── APRS Parsed Types ──

export interface ParsedAPRS {
  type: 'aircraft' | 'receiver_status' | 'unknown';
  raw: string;
}

export interface ParsedAircraftBeacon extends ParsedAPRS {
  type: 'aircraft';
  sender: string;
  receiver: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  altitude_m: number;
  course: number;
  speed_kmh: number;
  aircraft_id: string;
  aircraft_type: number;
  address_type: number;
  climb_fpm: number | null;
  turn_rate: number | null;
  snr_db: number | null;
  error_count: number | null;
  freq_offset_khz: number | null;
  gps_accuracy: string | null;
  stealth: boolean;
  no_tracking: boolean;
}

export interface ParsedReceiverBeacon extends ParsedAPRS {
  type: 'receiver_status';
  receiver: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  altitude_m: number;
  version: string | null;
  cpu_load: number | null;
  ram_free_mb: number | null;
  ram_total_mb: number | null;
  ntp_offset_ms: number | null;
  ntp_ppm: number | null;
  temperature_c: number | null;
  rf_correction_ppm: number | null;
  rf_noise_db: number | null;
}

// ── WebSocket Messages ──

export type WSMessage =
  | { type: 'aircraft_position'; data: AircraftPosition }
  | { type: 'receiver_status'; data: ReceiverStatusBeacon }
  | { type: 'health_update'; data: HealthMetrics };

// ── API Responses ──

export interface TrafficStats {
  hourly: { hour: string; gliders: number; powered: number; total: number }[];
  daily_unique: { date: string; count: number }[];
  max_range: { date: string; max_km: number }[];
  snr_distribution: { bin: string; count: number }[];
  heatmap: { day: number; hour: number; count: number }[];
  top_aircraft: {
    aircraft_id: string;
    aircraft_type: number;
    position_count: number;
    max_range_km: number;
    avg_snr_db: number;
  }[];
}
