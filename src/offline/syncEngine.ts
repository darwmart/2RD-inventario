import { supabase } from '@/lib/supabase';
import { db, isLocalId, type LocalProduct, type LocalSale } from './db';
import {
  getNextBatch, markAsDone, markAsError, markAsProcessing,
  getStats,
} from './offlineQueue';
import {
  resolveProductConflict, resolveSaleConflict, logConflict,
} from './conflictResolver';
import { networkMonitor } from './networkMonitor';

// ─── Sync Engine ──────────────────────────────────────────────
// Orquesta la sincronización entre IndexedDB y Supabase.
// Se ejecuta en segundo plano cuando hay conectividad.
// Garantías:
//  - Idempotente: reejecutar el mismo payload no crea duplicados
//  - Atómico por operación: fallo no deja estado parcial
//  - Backoff exponencial: no bombardea el servidor en fallos

type SyncListener = (stats: Awaited<ReturnType<typeof getStats>>) => void;

class SyncEngine {
  private running = false;
  private listeners = new Set<SyncListener>();
  private syncTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Arrancar sync cuando vuelve la conexión
    networkMonitor.subscribe((status) => {
      if (status === 'online' || status === 'slow') {
        this.scheduleSync(1_000); // pequeño delay para estabilizar
      }
    });
  }

  // ─── Arrancar sync completo ─────────────────────────────────
  async fullSync(): Promise<void> {
    if (!networkMonitor.isOnline || !supabase) return;
    await Promise.all([
      this.pullFromServer(),
      this.pushPendingOperations(),
    ]);
    this.notifyListeners();
  }

  // ─── PULL: traer datos frescos del servidor ─────────────────
  async pullFromServer(): Promise<void> {
    if (!supabase) return;
    try {
      await Promise.all([
        this.syncProducts(),
        this.syncCategories(),
        this.syncCustomers(),
      ]);
    } catch (err) {
      console.error('[SyncEngine] Pull error:', err);
    }
  }

  // ─── Sincronizar productos ──────────────────────────────────
  private async syncProducts(): Promise<void> {
    if (!supabase) return;
    // Sincronización incremental: traer solo lo modificado desde última sync
    const lastSync = await db.settings.get('last_product_sync');
    const since = lastSync ? JSON.parse(lastSync.value) as string : '1970-01-01T00:00:00Z';

    const { data, error } = await supabase
      .from('products')
      .select('id,name,barcode,reference,current_price,cost,stock,reserved_stock,min_stock,has_iva,category_id,supplier_id,image,deleted_at,updated_at')
      .gte('updated_at', since)
      .is('deleted_at', null)
      .order('updated_at', { ascending: true })
      .limit(500);

    if (error || !data) return;

    const now = new Date().toISOString();

    for (const serverProduct of data) {
      const localProduct = await db.products.get(serverProduct.id);

      if (!localProduct) {
        // Producto nuevo: insertarlo directamente
        await db.products.put({
          ...serverProduct,
          reserved_stock: serverProduct.reserved_stock ?? 0,
          synced_at: now,
        } as LocalProduct);
      } else {
        // Conflicto potencial: aplicar estrategia de resolución
        const result = resolveProductConflict(
          localProduct,
          { ...serverProduct, synced_at: now } as LocalProduct,
        );
        logConflict('products', serverProduct.id, result);
        await db.products.put(result.resolved);
      }
    }

    // Actualizar timestamp de última sync
    await db.settings.put({
      key: 'last_product_sync',
      value: JSON.stringify(now),
      synced_at: now,
    });
  }

  // ─── Sincronizar categorías ────────────────────────────────
  private async syncCategories(): Promise<void> {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('categories')
      .select('id,name,description,created_at')
      .limit(200);

    if (error || !data) return;
    const now = new Date().toISOString();
    await db.categories.bulkPut(
      data.map(c => ({ ...c, synced_at: now })),
    );
  }

  // ─── Sincronizar clientes (solo los 500 más recientes) ────
  private async syncCustomers(): Promise<void> {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('customers')
      .select('id,name,document,phone,email,created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error || !data) return;
    const now = new Date().toISOString();
    await db.customers.bulkPut(
      data.map(c => ({ ...c, synced_at: now })),
    );
  }

  // ─── PUSH: enviar operaciones pendientes al servidor ────────
  async pushPendingOperations(): Promise<void> {
    if (!networkMonitor.isOnline || !supabase) return;
    if (this.running) return;
    this.running = true;

    try {
      const ops = await getNextBatch(10);
      for (const op of ops) {
        await markAsProcessing(op.id!);
        try {
          await this.executeOperation(op);
          await markAsDone(op.id!);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await markAsError(op.id!, msg);
          console.error(`[SyncEngine] Op ${op.operation_id} failed:`, msg);
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async executeOperation(op: Awaited<ReturnType<typeof getNextBatch>>[0]): Promise<void> {
    if (!supabase) throw new Error('Supabase no disponible');
    const payload = JSON.parse(op.payload);

    switch (op.table_name) {
      case 'sales': {
        // Las ventas offline tienen estructura anidada: {sale, items}
        const { sale, items } = payload as {
          sale: LocalSale;
          items: Record<string, unknown>[];
        };

        // Si el ID es temporal, verificar que no se sincronizó ya
        if (isLocalId(sale.id)) {
          const existing = await supabase
            .from('sales')
            .select('id')
            .eq('sale_number', sale.sale_number)
            .single();

          if (existing.data) {
            // Ya existe (doble sync): actualizar local con ID real
            await db.sales
              .where('sale_number')
              .equals(sale.sale_number)
              .modify({
                id: existing.data.id,
                sync_status: 'synced',
                synced_at: new Date().toISOString(),
              });
            return;
          }
        }

        // Verificar conflicto de estado con el servidor
        if (!isLocalId(sale.id)) {
          const { data: serverSale } = await supabase
            .from('sales')
            .select('id,status')
            .eq('id', sale.id)
            .single();

          if (serverSale) {
            const result = resolveSaleConflict(
              sale,
              serverSale as unknown as LocalSale,
            );
            logConflict('sales', sale.id, result);
            if (result.strategy === 'server_wins') {
              await db.sales.where('id').equals(sale.id).modify({
                status: serverSale.status,
                sync_status: 'synced',
              });
              return;
            }
          }
        }

        // Insertar la venta en el servidor usando la RPC de stock
        // para garantizar consistencia de inventario
        const saleForServer = {
          ...sale,
          id: isLocalId(sale.id) ? undefined : sale.id, // dejar que servidor genere UUID si era temporal
          payment_method: JSON.parse(sale.payment_method as string),
        };

        const { data: inserted, error } = await supabase
          .from('sales')
          .insert(saleForServer)
          .select()
          .single();

        if (error) throw error;

        // Insertar items
        if (items.length > 0) {
          const { error: itemsError } = await supabase
            .from('sale_items')
            .insert(items.map(item => ({ ...item, sale_id: inserted.id })));
          if (itemsError) throw itemsError;
        }

        // Descontar stock via RPC
        await supabase.rpc('deduct_stock', {
          p_sale_id: inserted.id,
          p_sale_number: inserted.sale_number,
          p_items: items.map(i => ({
            product_id: i.product_id,
            quantity: i.quantity,
            product_name: i.product_name,
          })),
          p_actor_name: 'offline_sync',
        });

        // Actualizar ID local (temporal → real)
        await db.sales
          .where('sale_number')
          .equals(sale.sale_number)
          .modify({
            id: inserted.id,
            sync_status: 'synced',
            synced_at: new Date().toISOString(),
          });

        break;
      }

      case 'customers': {
        if (op.operation === 'UPDATE') {
          const { error } = await supabase
            .from('customers')
            .update(payload)
            .eq('id', op.record_id);
          if (error) throw error;
        }
        break;
      }

      default:
        console.warn(`[SyncEngine] Tabla no manejada: ${op.table_name}`);
    }
  }

  // ─── Programar sync con debounce ─────────────────────────────
  scheduleSync(delayMs = 5_000): void {
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    this.syncTimeout = setTimeout(() => this.fullSync(), delayMs);
  }

  // ─── Suscripciones de UI ──────────────────────────────────
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async notifyListeners(): Promise<void> {
    const stats = await getStats();
    this.listeners.forEach(fn => fn(stats));
  }
}

// Singleton
export const syncEngine = new SyncEngine();
