import type Database from 'better-sqlite3';

export function createTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS receivers (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      latitude      REAL NOT NULL,
      longitude     REAL NOT NULL,
      altitude      REAL,
      api_key       TEXT NOT NULL,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS aircraft_positions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      receiver_id     TEXT NOT NULL REFERENCES receivers(id),
      timestamp       TEXT NOT NULL,
      aircraft_id     TEXT NOT NULL,
      aircraft_type   INTEGER DEFAULT 0,
      address_type    INTEGER DEFAULT 0,
      latitude        REAL NOT NULL,
      longitude       REAL NOT NULL,
      altitude_m      REAL,
      course          REAL,
      speed_kmh       REAL,
      climb_fpm       REAL,
      turn_rate       REAL,
      snr_db          REAL,
      error_count     INTEGER,
      freq_offset_khz REAL,
      gps_accuracy    TEXT,
      distance_km     REAL,
      bearing         REAL,
      stealth         INTEGER DEFAULT 0,
      no_tracking     INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_ap_receiver_ts
      ON aircraft_positions(receiver_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_ap_receiver_distance
      ON aircraft_positions(receiver_id, distance_km, timestamp);

    CREATE TABLE IF NOT EXISTS receiver_status (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      receiver_id     TEXT NOT NULL REFERENCES receivers(id),
      timestamp       TEXT NOT NULL,
      version         TEXT,
      cpu_load        REAL,
      ram_free_mb     REAL,
      ram_total_mb    REAL,
      ntp_offset_ms   REAL,
      ntp_ppm         REAL,
      temperature_c   REAL,
      rf_correction_ppm REAL,
      rf_noise_db     REAL,
      raw_message     TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_rs_receiver_ts
      ON receiver_status(receiver_id, timestamp);

    CREATE TABLE IF NOT EXISTS health_metrics (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      receiver_id       TEXT NOT NULL REFERENCES receivers(id),
      timestamp         TEXT NOT NULL,
      uptime_s          INTEGER,
      cpu_temp_c        REAL,
      core_voltage      REAL,
      throttle_raw      TEXT,
      throttle_flags    TEXT,
      cpu_load          REAL,
      mem_avail_mb      INTEGER,
      wifi_ssid         TEXT,
      wifi_signal       INTEGER,
      usb_rtl_count     INTEGER,
      ogn_rf_status     TEXT,
      ogn_decode_status TEXT,
      aprs_lines        INTEGER,
      warnings          TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_hm_receiver_ts
      ON health_metrics(receiver_id, timestamp);

    CREATE TABLE IF NOT EXISTS coverage_sectors (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      receiver_id     TEXT NOT NULL REFERENCES receivers(id),
      bearing_start   REAL NOT NULL,
      bearing_end     REAL NOT NULL,
      max_distance_km REAL NOT NULL,
      avg_snr_db      REAL,
      position_count  INTEGER DEFAULT 0,
      sample_lat      REAL,
      sample_lon      REAL,
      period_start    TEXT NOT NULL,
      period_end      TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cs_receiver
      ON coverage_sectors(receiver_id, period_start);
  `);
}
