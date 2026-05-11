-- ============================================================
-- MIGRACIÓN 004: Compras (remisiones y facturas de proveedores)
-- Depende de: 001 (suppliers, products)
-- ============================================================

-- ─── DOCUMENTOS DE COMPRA ────────────────────────────────────
-- Cada documento es una remisión ('delivery') o factura ('invoice').
-- Los campos payment_method y payment_details se guardan como JSONB
-- porque tienen estructura variable según el tipo de pago.
create table if not exists purchase_documents (
  id                       uuid        primary key default gen_random_uuid(),
  document_type            text        not null,
  document_number          text        not null,
  supplier_invoice_number  text,
  warehouse                text,
  status                   text        not null,
  supplier_id              uuid        not null references suppliers(id),
  supplier_name            text        not null,
  subtotal                 numeric(14,2) not null default 0,
  tax                      numeric(14,2) not null default 0,
  total                    numeric(14,2) not null default 0,
  notes                    text,
  payment_method           jsonb,
  payment_details          jsonb,
  order_ref                text,
  delivery_ref             text,
  invoice_ref              text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  constraint purchase_doc_type_check
    check (document_type in ('delivery', 'invoice')),
  constraint purchase_doc_status_check
    check (status in ('pending', 'partial', 'completed', 'invoiced', 'cancelled'))
);

create trigger trg_purchases_updated_at
  before update on purchase_documents
  for each row execute function set_updated_at();

-- ─── ITEMS DE COMPRA ─────────────────────────────────────────
create table if not exists purchase_items (
  id           uuid    primary key default gen_random_uuid(),
  document_id  uuid    not null references purchase_documents(id) on delete cascade,
  product_id   uuid    not null,
  product_name text    not null,
  quantity     integer not null default 1,
  unit_cost    numeric(14,2) not null default 0,
  total        numeric(14,2) not null default 0,
  sort_order   integer not null default 0
);

-- ─── PAGOS DE COMPRA ─────────────────────────────────────────
-- Un documento puede tener múltiples pagos parciales.
create table if not exists purchase_payments (
  id          uuid        primary key default gen_random_uuid(),
  document_id uuid        not null references purchase_documents(id) on delete cascade,
  date        text        not null,
  amount      numeric(14,2) not null,
  bank_id     text        not null,
  bank_name   text        not null
);
