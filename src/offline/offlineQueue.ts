import { v4 as uuid } from 'uuid';
import { db, type PendingOperation } from './db';

// ─── Cola de operaciones pendientes ──────────────────────────
// Cada operación offline se encola aquí. El SyncEngine las procesa
// cuando hay conectividad. Usa idempotency_key para evitar duplicados.

export type QueuedOperation = Omit<PendingOperation, 'id' | 'attempts' | 'status' | 'created_at' | 'idempotency_key'>;

export async function enqueue(op: QueuedOperation): Promise<string> {
  const operation_id = uuid();
  // La idempotency_key combina tabla + id + operación para que
  // reintentarla múltiples veces sea seguro (mismo efecto).
  const idempotency_key = `${op.table_name}:${op.record_id}:${op.operation}`;

  // Verificar si ya existe una operación idempotente igual pendiente
  const existing = await db.pending
    .where('idempotency_key')
    .equals(idempotency_key)
    .filter(r => r.status === 'pending' || r.status === 'processing')
    .first();

  if (existing) {
    // Actualizar el payload con los datos más recientes
    await db.pending.update(existing.id!, {
      payload: op.payload,
      last_attempt: undefined,
      status: 'pending',
    });
    return existing.operation_id;
  }

  await db.pending.add({
    operation_id,
    table_name: op.table_name,
    operation: op.operation,
    record_id: op.record_id,
    payload: op.payload,
    created_at: new Date().toISOString(),
    attempts: 0,
    status: 'pending',
    priority: op.priority,
    idempotency_key,
  });

  return operation_id;
}

// ─── Encolar venta offline ────────────────────────────────────
export async function enqueueSale(sale: Record<string, unknown>, items: Record<string, unknown>[]): Promise<string> {
  return enqueue({
    table_name: 'sales',
    operation: 'INSERT',
    record_id: sale.id as string,
    payload: JSON.stringify({ sale, items }),
    priority: 1, // Alta prioridad — ventas primero
  });
}

// ─── Encolar actualización de cliente ─────────────────────────
export async function enqueueCustomerUpdate(id: string, data: Record<string, unknown>): Promise<string> {
  return enqueue({
    table_name: 'customers',
    operation: 'UPDATE',
    record_id: id,
    payload: JSON.stringify(data),
    priority: 2,
  });
}

// ─── Leer operaciones pendientes para procesar ────────────────
export async function getNextBatch(batchSize = 10): Promise<PendingOperation[]> {
  return db.pending
    .where('status')
    .anyOf(['pending', 'error'])
    .filter(op => {
      // Respetar backoff: si falló recientemente, esperar
      if (op.status !== 'error' || !op.last_attempt) return true;
      const waitMs = Math.min(1000 * 2 ** op.attempts, 5 * 60 * 1000); // max 5 min
      return Date.now() - new Date(op.last_attempt).getTime() > waitMs;
    })
    .sortBy('priority')
    .then(ops => ops.slice(0, batchSize));
}

export async function markAsProcessing(id: number): Promise<void> {
  await db.pending.update(id, { status: 'processing' });
}

export async function markAsDone(id: number): Promise<void> {
  await db.pending.update(id, { status: 'done' });
}

export async function markAsError(id: number, error: string): Promise<void> {
  const op = await db.pending.get(id);
  if (!op) return;
  await db.pending.update(id, {
    status: op.attempts >= 5 ? 'error' : 'pending', // después de 5 intentos: error permanente
    last_attempt: new Date().toISOString(),
    last_error: error,
    attempts: (op.attempts ?? 0) + 1,
  });
}

export async function getStats() {
  const [pending, processing, error, done] = await Promise.all([
    db.pending.where('status').equals('pending').count(),
    db.pending.where('status').equals('processing').count(),
    db.pending.where('status').equals('error').count(),
    db.pending.where('status').equals('done').count(),
  ]);
  return { pending, processing, error, done, total: pending + processing + error + done };
}

export async function retryErrors(): Promise<void> {
  await db.pending
    .where('status')
    .equals('error')
    .modify({ status: 'pending', attempts: 0 });
}

export async function purgeOldDone(daysOld = 7): Promise<void> {
  const cutoff = new Date(Date.now() - daysOld * 86_400_000).toISOString();
  await db.pending
    .where('status')
    .equals('done')
    .filter(op => op.created_at < cutoff)
    .delete();
}
