import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

export function useTimeRange(defaultRange = '24h') {
  const [searchParams, setSearchParams] = useSearchParams();
  const range = searchParams.get('range') || defaultRange;

  const setRange = useCallback(
    (newRange: string) => {
      setSearchParams((prev) => {
        prev.set('range', newRange);
        return prev;
      });
    },
    [setSearchParams],
  );

  return { range, setRange };
}
