import { WifiOff, Wifi, RefreshCw, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSyncQueue } from '@/hooks/useSyncQueue';

// ─── Banner de estado offline + cola de sync ──────────────────
export function OfflineBanner() {
  const { isOffline, isSlow } = useNetworkStatus();
  const { stats, isSyncing, hasPending, hasErrors, syncNow, retryFailed } = useSyncQueue();

  // No mostrar nada si está todo bien
  if (!isOffline && !isSlow && !hasPending && !hasErrors) return null;

  return (
    <div className={`w-full px-4 py-2 text-sm flex items-center gap-3 flex-wrap ${
      isOffline
        ? 'bg-red-500 text-white'
        : hasErrors
          ? 'bg-orange-500 text-white'
          : isSlow
            ? 'bg-yellow-500 text-white'
            : 'bg-blue-500 text-white'
    }`}>
      {/* Icono de estado */}
      {isOffline ? (
        <WifiOff className="h-4 w-4 shrink-0" />
      ) : isSyncing ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      ) : hasErrors ? (
        <AlertCircle className="h-4 w-4 shrink-0" />
      ) : hasPending ? (
        <Clock className="h-4 w-4 shrink-0" />
      ) : (
        <Wifi className="h-4 w-4 shrink-0" />
      )}

      {/* Mensaje principal */}
      <span className="font-medium">
        {isOffline && 'Sin conexión — trabajando en modo offline'}
        {!isOffline && isSlow && 'Conexión lenta detectada'}
        {!isOffline && !isSlow && isSyncing && 'Sincronizando datos...'}
        {!isOffline && !isSlow && !isSyncing && hasErrors && 'Error al sincronizar algunos registros'}
        {!isOffline && !isSlow && !isSyncing && !hasErrors && hasPending && 'Sincronización pendiente'}
      </span>

      {/* Badges de estado de la cola */}
      {stats.pending > 0 && (
        <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
          {stats.pending} pendiente{stats.pending !== 1 ? 's' : ''}
        </Badge>
      )}
      {stats.error > 0 && (
        <Badge variant="secondary" className="bg-red-700 text-white border-red-600">
          {stats.error} con error
        </Badge>
      )}

      {/* Acciones */}
      <div className="ml-auto flex gap-2">
        {hasErrors && !isSyncing && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-white hover:bg-white/20"
            onClick={retryFailed}
          >
            Reintentar
          </Button>
        )}
        {hasPending && !isOffline && !isSyncing && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-white hover:bg-white/20"
            onClick={syncNow}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Sincronizar
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Indicador compacto para el header ───────────────────────
export function SyncStatusIndicator() {
  const { isOffline, isSlow } = useNetworkStatus();
  const { stats, isSyncing, hasPending } = useSyncQueue();

  if (!isOffline && !isSlow && !hasPending && !isSyncing) {
    return null; // Todo bien: no mostrar nada
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {isOffline ? (
        <span className="flex items-center gap-1 text-red-500">
          <WifiOff className="h-3 w-3" />
          Offline
        </span>
      ) : isSyncing ? (
        <span className="flex items-center gap-1 text-blue-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Sync...
        </span>
      ) : stats.pending > 0 ? (
        <span className="flex items-center gap-1 text-orange-500">
          <Clock className="h-3 w-3" />
          {stats.pending}
        </span>
      ) : null}
    </div>
  );
}
