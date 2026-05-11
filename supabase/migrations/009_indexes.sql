-- ============================================================
-- MIGRACIÓN 009: Índices para consultas frecuentes
-- ============================================================

-- ─── INVENTARIO ──────────────────────────────────────────────
create index if not exists idx_products_category    on products(category_id);
create index if not exists idx_products_supplier    on products(supplier_id);
create index if not exists idx_products_barcode     on products(barcode)    where barcode is not null;
create index if not exists idx_products_reference   on products(reference)  where reference is not null;
create index if not exists idx_products_low_stock   on products(stock, min_stock);

-- ─── VENTAS ──────────────────────────────────────────────────
create index if not exists idx_sales_advisor        on sales(advisor_id);
create index if not exists idx_sales_customer       on sales(customer_id)   where customer_id is not null;
create index if not exists idx_sales_status         on sales(status);
create index if not exists idx_sales_type           on sales(type);
create index if not exists idx_sales_created_at     on sales(created_at desc);
create index if not exists idx_sales_status_type    on sales(status, type);

create index if not exists idx_sale_items_sale      on sale_items(sale_id);
create index if not exists idx_sale_items_product   on sale_items(product_id);
create index if not exists idx_sale_deposits_sale   on sale_deposits(sale_id);
create index if not exists idx_sale_returns_sale    on sale_returns(sale_id);

-- ─── COMPRAS ─────────────────────────────────────────────────
create index if not exists idx_purchases_supplier   on purchase_documents(supplier_id);
create index if not exists idx_purchases_status     on purchase_documents(status);
create index if not exists idx_purchases_created    on purchase_documents(created_at desc);
create index if not exists idx_purchase_items_doc   on purchase_items(document_id);
create index if not exists idx_purchase_payments_doc on purchase_payments(document_id);

-- ─── CONTABILIDAD ────────────────────────────────────────────
create index if not exists idx_accounting_fecha     on accounting_records(fecha);
create index if not exists idx_accounting_banco     on accounting_records(banco);
create index if not exists idx_accounting_tipo      on accounting_records(tipo);
create index if not exists idx_expenses_advisor     on expenses(advisor_id);
create index if not exists idx_cash_sessions_date   on cash_register_sessions(date);
create index if not exists idx_cash_sessions_status on cash_register_sessions(status);

-- ─── BODEGA ──────────────────────────────────────────────────
create index if not exists idx_wh_transactions_warehouse on warehouse_transactions(warehouse_id);
create index if not exists idx_wh_transaction_items_tx   on warehouse_transaction_items(transaction_id);
create index if not exists idx_stock_count_items_count   on stock_count_items(count_id);
