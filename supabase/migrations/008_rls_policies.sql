-- ============================================================
-- MIGRACIÓN 008: Row Level Security — todas las tablas
-- Política: solo usuarios autenticados (auth.role() = 'authenticated')
-- ============================================================

do $$
declare
  t text;
  tables text[] := array[
    -- Inventario
    'categories', 'products', 'suppliers',
    -- Personas
    'advisors', 'payment_methods', 'customers',
    -- Ventas
    'sales', 'sale_items', 'sale_deposits',
    'sale_returns', 'sale_return_items',
    -- Compras
    'purchase_documents', 'purchase_items', 'purchase_payments',
    -- Contabilidad
    'banks', 'accounting_records', 'cash_register_sessions', 'expenses',
    -- Configuración
    'settings',
    -- Bodega y stock
    'external_warehouses', 'warehouse_transactions', 'warehouse_transaction_items',
    'stock_counts', 'stock_count_items'
  ];
begin
  foreach t in array tables loop
    execute format('alter table %I enable row level security', t);

    -- Política de lectura
    execute format(
      'create policy %I on %I for select using (auth.role() = ''authenticated'')',
      t || '_select', t
    );

    -- Política de escritura (insert/update/delete)
    execute format(
      'create policy %I on %I for insert with check (auth.role() = ''authenticated'')',
      t || '_insert', t
    );
    execute format(
      'create policy %I on %I for update using (auth.role() = ''authenticated'')',
      t || '_update', t
    );
    execute format(
      'create policy %I on %I for delete using (auth.role() = ''authenticated'')',
      t || '_delete', t
    );
  end loop;
end $$;
