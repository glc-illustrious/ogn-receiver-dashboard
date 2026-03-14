import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useHealthStore } from '../stores/health';
import type { ReceiverWithStatus } from '@ogn-dashboard/shared';

export function useReceivers() {
  const [loading, setLoading] = useState(true);
  const receivers = useHealthStore((s) => s.receivers);
  const setReceivers = useHealthStore((s) => s.setReceivers);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = (await api.getReceivers()) as ReceiverWithStatus[];
        if (mounted) {
          setReceivers(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load receivers:', err);
        if (mounted) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [setReceivers]);

  return { receivers, loading };
}
