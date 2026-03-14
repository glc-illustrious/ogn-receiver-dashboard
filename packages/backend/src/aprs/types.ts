export interface APRSPosition {
  latitude: number;
  longitude: number;
  altitude_m: number;
  course: number;
  speed_kmh: number;
}

export interface OGNExtensions {
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

export interface ReceiverExtensions {
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
