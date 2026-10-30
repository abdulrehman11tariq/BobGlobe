import { useState, useEffect, useCallback, useMemo } from 'react';
import type { DataFile, GlobalTopArtist } from '../types';
import { assetUrl } from '../utils/assetUrl';

interface UseGlobeDataResult {
  data: DataFile | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  maxListeners: number; // For backward compatibility
  totalBlobs: number;
  trendAvailable: boolean;
  updatedAt: string | null;
  globalTop: GlobalTopArtist[];
}

export function useGlobeData(): UseGlobeDataResult {
  const [data, setData] = useState<DataFile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Cache-busting rounded to the current hour
      const hourStamp = Math.floor(Date.now() / (1000 * 60 * 60));
      const url = `${assetUrl('data/latest.json')}?v=${hourStamp}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
      }
      const json: DataFile = await response.json();
      if (!json || !Array.isArray(json.countries)) {
        throw new Error('Invalid data format in latest.json');
      }
      setData(json);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error loading data';
      console.warn(`[useGlobeData] Fetch error: ${msg}`);
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute stats and totals
  const { maxListeners, totalBlobs } = useMemo(() => {
    if (!data || !data.countries) {
      return { maxListeners: 1, totalBlobs: 0 };
    }

    let max = 1;
    let count = 0;

    for (const c of data.countries) {
      for (const a of c.artists || []) {
        count++;
        const score = a.chartScore ?? a.listeners ?? 0;
        if (score > max) {
          max = score;
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
    trendAvailable: Boolean(data?.trendAvailable),
    updatedAt: data?.updatedAt || null,
    globalTop: data?.globalTop || [],
  };
}
