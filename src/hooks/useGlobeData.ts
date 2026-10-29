import { useState, useEffect, useCallback, useMemo } from 'react';
import type { DataFile } from '../types';

interface UseGlobeDataResult {
  data: DataFile | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  maxListeners: number;
  totalBlobs: number;
}

export function useGlobeData(): UseGlobeDataResult {
  const [data, setData] = useState<DataFile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/data/latest.json');
      if (!response.ok) {
        throw new Error(`Failed to load globe data: ${response.status} ${response.statusText}`);
      }
      const json: DataFile = await response.json();
      setData(json);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error loading data';
      setError(msg);
      console.error('Error fetching globe data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute global max listeners and total blob count
  const { maxListeners, totalBlobs } = useMemo(() => {
    if (!data || !data.countries) {
      return { maxListeners: 1, totalBlobs: 0 };
    }

    let max = 1;
    let count = 0;

    for (const c of data.countries) {
      for (const a of c.artists) {
        count++;
        if (a.listeners > max) {
          max = a.listeners;
        }
      }
    }

    return { maxListeners: max, totalBlobs: count };
  }, [data]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    maxListeners,
    totalBlobs,
  };
}
