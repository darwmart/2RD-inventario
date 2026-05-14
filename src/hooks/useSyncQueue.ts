import { useState, useEffect, useCallback } from 'react';
import { syncEngine } from '@/offline/syncEngine';
import { getStats, retryErrors } from '@/offline/offlineQueue';
import { useNetworkStatus } from './useNetworkStatus';

interface SyncStats {
  pending: number;
  processing: number;
  error: number;
  done: number;
  total: number;
}

// ─── Hook de cola de sincronización ──────────────────────────
export function useSyncQueue() {
  const { isOnline } = useNetworkStatus();
  const [stats, setStats] = useState<SyncStats>({
    pending: 0, processing: 0, error: 0, done: 0, total: 0,
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Actualizar stats iniciales y al cambiar de estado
  useEffect(() => {
    getStats().then(setStats);
  }, []);

  // Suscribirse a cambios del sync engine
  useEffect(() => {
    return syncEngine.subscribe((newStats) => {
      setStats(newStats);
      setIsSyncing(newStats.processing > 0);
    });
  }, []);

  // Sync manual (botón en UI)
  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncEngine.fullSync();
      const fresh = await getStats();
      setStats(fresh);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing]);

  // Reintentar errores
  const retryFailed = useCallback(async () => {
    await retryErrors();
    const fresh = await getStats();
    setStats(fresh);
    await syncNow();
  }, [syncNow]);

  const hasPending = stats.pending > 0 || stats.error > 0;
  const hasErrors  = stats.error > 0;

  return {
    stats,
    isSyncing,
    hasPending,
    hasErrors,
    syncNow,
    retryFailed,
  };
}
