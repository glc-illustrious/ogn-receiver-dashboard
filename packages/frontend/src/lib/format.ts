import { AIRCRAFT_TYPES } from '@ogn-dashboard/shared';

export function formatAircraftType(type: number): string {
  return AIRCRAFT_TYPES[type] || 'Unknown';
}

export function formatDistance(km: number): string {
  return `${Math.round(km)} km`;
}

export function formatSnr(db: number | null): string {
  if (db === null) return '—';
  return `${db.toFixed(1)} dB`;
}

export function formatTemp(c: number | null): string {
  if (c === null) return '—';
  return `${Math.round(c)}°C`;
}

export function formatVoltage(v: number | null): string {
  if (v === null) return '—';
  return `${v.toFixed(2)}V`;
}
