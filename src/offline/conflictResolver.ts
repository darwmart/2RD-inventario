import type { LocalProduct, LocalSale } from './db';

// ─── Estrategias de resolución de conflictos ──────────────────
//
// Reglas de negocio para POS:
//  • Precios/costos/stock  → SERVIDOR GANA siempre (fuente de verdad)
//  • Ventas offline nuevas → CLIENTE GANA (registros nuevos, no conflictan)
//  • Clientes / categorías → ÚLTIMO TIMESTAMP GANA
//  • Sesión de caja        → SERVIDOR GANA (concurrencia crítica)
//  • Configuración         → SERVIDOR GANA
//
// "Last-write-wins" puro está prohibido porque puede silenciar
// cambios de precio o stock hechos por admin mientras el POS estaba offline.

export type ConflictStrategy =
  | 'server_wins'
  | 'client_wins'
  | 'merge_timestamps'
  | 'manual_required';

export interface ConflictResult<T> {
  strategy: ConflictStrategy;
  resolved: T;
  requiresReview: boolean;
  reason: string;
}

// ─── Conflicto de producto ────────────────────────────────────
export function resolveProductConflict(
  local: LocalProduct,
  server: LocalProduct,
): ConflictResult<LocalProduct> {
  const serverUpdated = new Date(server.updated_at).getTime();
  const localUpdated  = new Date(local.updated_at).getTime();

  // Precios y stock: servidor siempre gana
  // Un admin puede haber cambiado precios mientras el POS estaba offline.
  // Aceptar precios locales podría permitir fraude de precio.
  if (
    local.current_price !== server.current_price ||
    local.cost          !== server.cost          ||
    local.stock         !== server.stock
  ) {
    return {
      strategy: 'server_wins',
      resolved: {
        ...server,
        synced_at: new Date().toISOString(),
      },
      requiresReview: false,
      reason: 'Precios y stock siempre desde el servidor',
    };
  }

  // Para otros campos (nombre, imagen, etc.) usamos timestamp
  if (serverUpdated >= localUpdated) {
    return {
      strategy: 'server_wins',
      resolved: { ...server, synced_at: new Date().toISOString() },
      requiresReview: false,
      reason: 'Servidor más reciente',
    };
  }

  return {
    strategy: 'client_wins',
    resolved: { ...local, synced_at: new Date().toISOString() },
    requiresReview: true,
    reason: 'Cambio local más reciente — revisar antes de confirmar',
  };
}

// ─── Conflicto de venta ───────────────────────────────────────
// Las ventas offline nuevas nunca conflictan porque tienen IDs únicos.
// Solo puede haber conflicto si se intenta actualizar una venta que ya
// fue modificada en el servidor (ej: cancelación concurrente).
export function resolveSaleConflict(
  local: LocalSale,
  server: LocalSale,
): ConflictResult<LocalSale> {
  // Si el servidor ya canceló/devolvió la venta → servidor gana siempre
  if (['cancelled', 'returned'].includes(server.status)) {
    return {
      strategy: 'server_wins',
      resolved: server,
      requiresReview: true,
      reason: `Venta ya marcada como "${server.status}" en el servidor`,
    };
  }

  // Si la venta offline es nueva (no existe en servidor) → cliente gana
  if (!server.id || local.sync_status === 'pending') {
    return {
      strategy: 'client_wins',
      resolved: local,
      requiresReview: false,
      reason: 'Venta nueva offline — sincronizar al servidor',
    };
  }

  // Conflicto real en estado: requiere revisión manual
  return {
    strategy: 'manual_required',
    resolved: server,
    requiresReview: true,
    reason: `Conflicto de estado: local="${local.status}" servidor="${server.status}"`,
  };
}

// ─── Conflicto genérico con timestamp ────────────────────────
export function resolveByTimestamp<T extends { updated_at?: string }>(
  local: T,
  server: T,
  serverAlwaysWinsFields: (keyof T)[] = [],
): ConflictResult<T> {
  // Campos donde servidor siempre gana (precios, stock, etc.)
  for (const field of serverAlwaysWinsFields) {
    if (local[field] !== server[field]) {
      return {
        strategy: 'server_wins',
        resolved: server,
        requiresReview: false,
        reason: `Campo crítico "${String(field)}" difiere — servidor gana`,
      };
    }
  }

  const serverTs = new Date(server.updated_at ?? 0).getTime();
  const localTs  = new Date(local.updated_at ?? 0).getTime();

  if (serverTs >= localTs) {
    return {
      strategy: 'server_wins',
      resolved: server,
      requiresReview: false,
      reason: 'Timestamp del servidor más reciente',
    };
  }

  return {
    strategy: 'client_wins',
    resolved: local,
    requiresReview: false,
    reason: 'Timestamp local más reciente',
  };
}

// ─── Log de conflictos ────────────────────────────────────────
export function logConflict(
  table: string,
  id: string,
  result: ConflictResult<unknown>,
): void {
  if (result.strategy !== 'manual_required' && !result.requiresReview) return;
  console.warn(`[Conflict] ${table}#${id}`, {
    strategy: result.strategy,
    reason: result.reason,
    requiresReview: result.requiresReview,
    at: new Date().toISOString(),
  });
}
