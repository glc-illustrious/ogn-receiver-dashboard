export const AIRCRAFT_TYPES: Record<number, string> = {
  0: 'Unknown',
  1: 'Glider',
  2: 'Tow plane',
  3: 'Helicopter',
  4: 'Parachute',
  5: 'Drop plane',
  6: 'Hang glider',
  7: 'Paraglider',
  8: 'Powered aircraft',
  9: 'Jet',
  10: 'UFO',
  11: 'Balloon',
  12: 'Airship',
  13: 'UAV',
  15: 'Static object',
};

export const ADDRESS_TYPES: Record<number, string> = {
  0: 'Random',
  1: 'ICAO',
  2: 'FLARM',
  3: 'OGN',
};

export const RECEIVER_STATUS_THRESHOLDS = {
  ONLINE_MAX_AGE_MS: 3 * 60 * 1000,
  DEGRADED_WARNINGS: ['UNDERVOLT', 'DEAD', 'USB_MISSING'],
} as const;

export const DATA_RETENTION = {
  AIRCRAFT_POSITIONS_DAYS: 30,
  HEALTH_METRICS_RAW_DAYS: 90,
  RECEIVER_STATUS_DAYS: 90,
} as const;

export const WS_BUFFER_FLUSH_MS = 500;
export const WS_STALE_POSITION_MS = 5 * 60 * 1000;
