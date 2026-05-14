import Dexie, { type Table } from 'dexie';

// ─── Tipos locales ────────────────────────────────────────────
// Replica los campos mínimos necesarios para operar offline.
// No duplicar todos los campos del servidor — solo los del POS crítico.

export interface LocalProduct {
  id: string;
  name: string;
  barcode?: string;
  reference?: string;
  current_price: number;
  cost: number;
  stock: number;
  reserved_stock: number;
  min_stock: number;
  has_iva: boolean;
  category_id?: string | null;
  supplier_id?: string | null;
  image?: string;
  deleted_at?: string | null;
  updated_at: string;
  synced_at: string;       // cuándo se sincronizó por última vez
}

export interface LocalCategory {
  id: string;
  name: string;
  description: string;
  updated_at?: string;
  synced_at: string;
}

export interface LocalCustomer {
  id: string;
  full_name: string;
  document?: string;
  phone?: string;
  email?: string;
  updated_at?: string;
  synced_at: string;
}

export interface LocalSale {
  id: string;                    // UUID real o temporal ('offline_' + timestamp)
  local_id?: string;             // ID temporal original si fue creado offline
  sale_number: string;
  advisor_id: string;
  advisor_name: string;
  customer_id?: string | null;
  customer_name?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  iva_total: number;
  payment_method: string;        // JSON serializado
  status: string;
  type: string;
  created_at: string;
  sync_status: 'synced' | 'pending' | 'error' | 'conflict';
  sync_error?: string;
  sync_attempts: number;
  synced_at?: string;
}

export interface LocalSaleItem {
  id: string;
  sale_id: string;               // Puede ser ID temporal
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost: number;
  total: number;
  has_iva: boolean;
  iva_amount: number;
}

export interface PendingOperation {
  id?: number;                   // autoincrement
  operation_id: string;          // UUID único para idempotencia
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string;
  payload: string;               // JSON del registro completo
  created_at: string;
  attempts: number;
  last_attempt?: string;
  last_error?: string;
  status: 'pending' | 'processing' | 'error' | 'done';
  priority: number;              // 1=alta, 2=normal, 3=baja
  idempotency_key: string;       // evitar doble sync
}

export interface StockCache {
  product_id: string;
  available_stock: number;       // stock - reserved
  last_updated: string;
}

export interface LocalSettings {
  key: string;
  value: string;                 // JSON serializado
  synced_at: string;
}

export interface AuditQueue {
  id?: number;
  event_type: string;
  table_name: string;
  record_id: string;
  payload: string;               // JSON
  created_at: string;
  synced: boolean;
}

// ─── Dexie Database ───────────────────────────────────────────
class POSDatabase extends Dexie {
  products!: Table<LocalProduct>;
  categories!: Table<LocalCategory>;
  customers!: Table<LocalCustomer>;
  sales!: Table<LocalSale>;
  sale_items!: Table<LocalSaleItem>;
  pending_operations!: Table<PendingOperation>;
  stock_cache!: Table<StockCache>;
  settings!: Table<LocalSettings>;
  audit_queue!: Table<AuditQueue>;

  constructor() {
    super('pos_offline_db');

    // Versión 1: esquema inicial
    this.version(1).stores({
      products:           'id, barcode, reference, category_id, stock, updated_at, synced_at',
      categories:         'id, name',
      customers:          'id, document, full_name',
      sales:              'id, local_id, sale_number, advisor_id, created_at, sync_status, type, status',
      sale_items:         'id, sale_id, product_id',
      pending_operations: '++id, operation_id, table_name, status, created_at, priority',
      stock_cache:        'product_id',
      settings:           'key',
      audit_queue:        '++id, event_type, synced, created_at',
    });
  }
}

export const localDB = new POSDatabase();

// ─── Helpers de acceso ────────────────────────────────────────
export const db = {
  products:   localDB.products,
  categories: localDB.categories,
  customers:  localDB.customers,
  sales:      localDB.sales,
  saleItems:  localDB.sale_items,
  pending:    localDB.pending_operations,
  stockCache: localDB.stock_cache,
  settings:   localDB.settings,
  audit:      localDB.audit_queue,
};

// ─── Utilidades ───────────────────────────────────────────────
export function generateLocalId(): string {
  // IDs temporales reconocibles, sin colisión con UUIDs reales
  return `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isLocalId(id: string): boolean {
  return id.startsWith('offline_');
}

export async function clearOfflineData(): Promise<void> {
  await Promise.all([
    localDB.products.clear(),
    localDB.categories.clear(),
    localDB.customers.clear(),
    localDB.stock_cache.clear(),
    localDB.settings.clear(),
  ]);
  // No borrar sales/pending: pueden tener datos sin sincronizar
}

export async function getPendingCount(): Promise<number> {
  return localDB.pending_operations
    .where('status')
    .anyOf(['pending', 'error'])
    .count();
}
