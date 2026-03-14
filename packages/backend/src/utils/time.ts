/** Parse a time range string like '1h', '24h', '7d', '30d' into milliseconds */
export function parseTimeRange(range: string): number {
  const match = range.match(/^(\d+)([hd])$/);
  if (!match) return 24 * 60 * 60 * 1000; // default 24h
  const [, num, unit] = match;
  const n = parseInt(num);
  return unit === 'h' ? n * 3600000 : n * 86400000;
}

/** Get ISO string for `ms` milliseconds ago */
export function timeAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

/** Determine bucket interval for downsampling */
export function getBucketInterval(
  fromMs: number,
  toMs: number,
): { sql: string; seconds: number } {
  const spanHours = (toMs - fromMs) / 3600000;
  if (spanHours <= 6) return { sql: "strftime('%Y-%m-%dT%H:%M:00', timestamp)", seconds: 60 };
  if (spanHours <= 48) return { sql: "strftime('%Y-%m-%dT%H:00:00', timestamp)", seconds: 3600 };
  return { sql: "strftime('%Y-%m-%d', timestamp)", seconds: 86400 };
}
