import 'dotenv/config';
import { resolve } from 'path';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',

  aprs: {
    host: process.env.APRS_HOST || 'aprs.glidernet.org',
    port: parseInt(process.env.APRS_PORT || '14580', 10),
    filterLat: parseFloat(process.env.APRS_FILTER_LAT || '51.5674'),
    filterLon: parseFloat(process.env.APRS_FILTER_LON || '4.9318'),
    filterRangeKm: parseInt(process.env.APRS_FILTER_RANGE_KM || '500', 10),
  },

  db: {
    path: resolve(process.env.DB_PATH || './data/ogn-dashboard.db'),
  },

  receiverApiKeys: parseApiKeys(process.env.RECEIVER_API_KEYS || ''),
};

function parseApiKeys(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!raw) return map;
  for (const pair of raw.split(',')) {
    const [id, key] = pair.split(':');
    if (id && key) map.set(id.trim(), key.trim());
  }
  return map;
}
