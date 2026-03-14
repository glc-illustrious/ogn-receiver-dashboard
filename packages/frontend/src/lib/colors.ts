export const chartColors = {
  orange: '#f97316',
  violet: '#a78bfa',
  cyan: '#22d3ee',
  emerald: '#34d399',
  blue: '#60a5fa',
  amber: '#fbbf24',
  red: '#f87171',
  rose: '#fb7185',
};

export function altitudeColor(altM: number): string {
  if (altM < 500) return '#60a5fa'; // blue
  if (altM < 1500) return '#4ade80'; // green
  if (altM < 3000) return '#facc15'; // yellow
  return '#f87171'; // red
}

export function snrColor(db: number): string {
  if (db < 5) return '#f87171';
  if (db < 10) return '#facc15';
  return '#4ade80';
}

export function speedColor(kmh: number): string {
  if (kmh < 80) return '#60a5fa';
  if (kmh < 150) return '#22d3ee';
  if (kmh < 250) return '#facc15';
  return '#f87171';
}
