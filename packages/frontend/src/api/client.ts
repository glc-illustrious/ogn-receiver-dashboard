const BASE = '/api';

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export const api = {
  getReceivers: () => fetchJSON<unknown[]>('/receivers'),
  getReceiver: (id: string) => fetchJSON<unknown>(`/receivers/${id}`),
  getHealth: (id: string, range = '24h') =>
    fetchJSON<{ series: unknown[]; latest: unknown }>(`/receivers/${id}/health?range=${range}`),
  getRange: (id: string, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams({ range: '1h', ...params }).toString();
    return fetchJSON<unknown[]>(`/receivers/${id}/range?${qs}`);
  },
  getCoverage: (id: string, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams({ range: '7d', ...params }).toString();
    return fetchJSON<unknown[]>(`/receivers/${id}/coverage?${qs}`);
  },
  getTraffic: (id: string, range = '7d') =>
    fetchJSON<unknown>(`/receivers/${id}/traffic?range=${range}`),
};
