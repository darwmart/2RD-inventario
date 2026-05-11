-- ============================================================
-- MIGRACIÓN 003: Ventas, Items, Abonos, Devoluciones
-- Depende de: 001 (products), 002 (advisors, customers)
-- ============================================================

-- ─── VENTAS ──────────────────────────────────────────────────
-- payment_method se almacena como JSONB porque es un objeto
-- anidado con estructura variable (tipo, banco, comisión, etc.)
create table if not exists sales (
  id                uuid        primary key default gen_random_uuid(),
  sale_number       text        not null unique,
  advisor_id        uuid        not null references advisors(id),
  advisor_name      text        not null,
  customer_id       uuid        references customers(id) on delete set null,
  subtotal          numeric(14,2) not null default 0,
  discount          numeric(14,2) not null default 0,
  total             numeric(14,2) not null default 0,
  iva_total         numeric(14,2) not null default 0,
  commission        numeric(6,3),
  commission_amount numeric(14,2),
  reteiva_amount    numeric(14,2),
  payment_method    jsonb       not null default '{}',
  customer_name     text,
  customer_document text,
  customer_phone    text,
  deposit           numeric(14,2) not null default 0,
  status            text        not null,
  type              text        not null,
  created_at        timestamptz not null default now(),

  constraint sales_status_check
    check (status in ('pending', 'completed', 'cancelled', 'returned')),
  constraint sales_type_check
    check (type in ('sale', 'quote', 'reserved'))
);

-- Secuencia para el número de venta
create sequence if not exists sale_number_seq start 1;

-- ─── ITEMS DE VENTA ──────────────────────────────────────────
create table if not exists sale_items (
  id           uuid        primary key default gen_random_uuid(),
  sale_id      uuid        not null references sales(id) on delete cascade,
  product_id   uuid        not null,
  product_name text        not null,
  description  text        not null default '',
  cost         numeric(14,2) not null default 0,
  quantity     integer     not null default 1,
  unit_price   numeric(14,2) not null default 0,
  total        numeric(14,2) not null default 0,
  has_iva      boolean     not null default false,
  iva_amount   numeric(14,2) not null default 0,
  sort_order   integer     not null default 0
);

-- ─── ABONOS DE VENTA ─────────────────────────────────────────
-- Un separado (reserved) puede recibir múltiples abonos parciales.
-- method se almacena como JSONB (igual que payment_method en sales).
create table if not exists sale_deposits (
  id         uuid        primary key default gen_random_uuid(),
  sale_id    uuid        not null references sales(id) on delete cascade,
  amount     numeric(14,2) not null,
  method     jsonb       not null default '{}',
  created_at timestamptz not null default now()
);

-- ─── DEVOLUCIONES ────────────────────────────────────────────
create table if not exists sale_returns (
  id             uuid        primary key default gen_random_uuid(),
  return_number  text        not null unique,
  sale_id        uuid        not null references sales(id),
  sale_number    text        not null,
  advisor_id     uuid        not null,
  advisor_name   text        not null,
  subtotal       numeric(14,2) not null default 0,
  total          numeric(14,2) not null default 0,
  reason         text,
  payment_method jsonb,
  created_at     timestamptz not null default now()
);

-- Items de devolución
create table if not exists sale_return_items (
  id           uuid        primary key default gen_random_uuid(),
  return_id    uuid        not null references sale_returns(id) on delete cascade,
  product_id   uuid        not null,
  product_name text        not null,
  description  text        not null default '',
  cost         numeric(14,2) not null default 0,
  quantity     integer     not null default 1,
  unit_price   numeric(14,2) not null default 0,
  total        numeric(14,2) not null default 0
);
