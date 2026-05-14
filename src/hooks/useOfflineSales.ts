import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuid } from 'uuid';
import { db, generateLocalId, isLocalId, type LocalSale, type LocalSaleItem } from '@/offline/db';
import { enqueueSale } from '@/offline/offlineQueue';
import { syncEngine } from '@/offline/syncEngine';
import { useNetworkStatus } from './useNetworkStatus';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface OfflineSaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost: number;
  total: number;
  has_iva: boolean;
  iva_amount: number;
}

interface CreateOfflineSaleInput {
  advisor_id: string;
  advisor_name: string;
  customer_id?: string | null;
  customer_name?: string | null;
  items: OfflineSaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  iva_total: number;
  payment_method: Record<string, unknown>;
  type?: 'sale' | 'quote' | 'reserved';
}

// ─── Generar número de venta local ────────────────────────────
// Formato: OFFL-YYYYMMDD-XXXX (identificable como offline)
async function generateOfflineSaleNumber(): Promise<string> {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await db.sales
    .where('sale_number')
    .startsWith(`OFFL-${date}`)
    .count();
  const seq = String(count + 1).padStart(4, '0');
  return `OFFL-${date}-${seq}`;
}

// ─── Descontar stock localmente (optimista) ───────────────────
async function deductLocalStock(items: OfflineSaleItem[]): Promise<void> {
  for (const item of items) {
    const product = await db.products.get(item.product_id);
    if (!product) continue;
    if (product.stock < item.quantity) {
      throw new Error(
        `Stock insuficiente para ${item.product_name}: disponible ${product.stock}, solicitado ${item.quantity}`,
      );
    }
    await db.products.update(item.product_id, {
      stock: product.stock - item.quantity,
    });
    // Actualizar caché de stock
    await db.stockCache.put({
      product_id: item.product_id,
      available_stock: product.stock - item.quantity,
      last_updated: new Date().toISOString(),
    });
  }
}

// ─── Hook principal ────────────────────────────────────────────
export function useOfflineSales() {
  const { isOnline } = useNetworkStatus();
  const { user } = useAuth();
  const qc = useQueryClient();

  const createSale = useMutation({
    mutationFn: async (input: CreateOfflineSaleInput) => {
      // Verificar stock local antes de proceder
      await deductLocalStock(input.items);

      const saleId      = isOnline ? uuid() : generateLocalId();
      const saleNumber  = await generateOfflineSaleNumber();
      const now         = new Date().toISOString();

      const sale: LocalSale = {
        id:              saleId,
        local_id:        isLocalId(saleId) ? saleId : undefined,
        sale_number:     saleNumber,
        advisor_id:      input.advisor_id,
        advisor_name:    input.advisor_name,
        customer_id:     input.customer_id ?? null,
        customer_name:   input.customer_name ?? null,
        subtotal:        input.subtotal,
        discount:        input.discount,
        total:           input.total,
        iva_total:       input.iva_total,
        payment_method:  JSON.stringify(input.payment_method),
        status:          'completed',
        type:            input.type ?? 'sale',
        created_at:      now,
        sync_status:     isOnline ? 'synced' : 'pending',
        sync_attempts:   0,
      };

      const items: LocalSaleItem[] = input.items.map(item => ({
        id:           uuid(),
        sale_id:      saleId,
        product_id:   item.product_id,
        product_name: item.product_name,
        quantity:     item.quantity,
        unit_price:   item.unit_price,
        cost:         item.cost,
        total:        item.total,
        has_iva:      item.has_iva,
        iva_amount:   item.iva_amount,
      }));

      // Guardar localmente siempre (caché local + offline)
      await db.sales.put(sale);
      await db.saleItems.bulkPut(items);

      // Registrar en cola de auditoría local
      await db.audit.add({
        event_type: 'SALE_CREATED',
        table_name: 'sales',
        record_id:  saleId,
        payload:    JSON.stringify({ sale, items, user_id: user?.id }),
        created_at: now,
        synced:     false,
      });

      // Encolar para sincronización
      await enqueueSale(
        sale as unknown as Record<string, unknown>,
        items as unknown as Record<string, unknown>[],
      );

      // Si hay internet, sincronizar ahora mismo
      if (isOnline) {
        syncEngine.scheduleSync(500);
      }

      return { sale, items };
    },
    onSuccess: ({ sale }) => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Venta ${sale.sale_number} registrada${!isOnline ? ' (offline)' : ''}`, {
        description: !isOnline
          ? 'Se sincronizará automáticamente cuando haya conexión'
          : undefined,
      });
    },
    onError: (error: Error) => {
      toast.error(`Error al registrar venta: ${error.message}`);
    },
  });

  // ─── Leer ventas offline pendientes ───────────────────────
  const getPendingSales = useCallback(async (): Promise<LocalSale[]> => {
    return db.sales
      .where('sync_status')
      .anyOf(['pending', 'error'])
      .toArray();
  }, []);

  // ─── Buscar producto localmente ───────────────────────────
  const searchProductLocally = useCallback(async (query: string) => {
    const q = query.toLowerCase();
    return db.products
      .filter(p =>
        !p.deleted_at &&
        (p.name.toLowerCase().includes(q) ||
          (p.barcode ?? '').includes(query) ||
          (p.reference ?? '').toLowerCase().includes(q))
      )
      .limit(20)
      .toArray();
  }, []);

  return {
    createSale:           createSale.mutate,
    createSaleAsync:      createSale.mutateAsync,
    isCreating:           createSale.isPending,
    getPendingSales,
    searchProductLocally,
    isOnline,
  };
}
