-- ============================================================
-- MIGRACIÓN 007: Bodegas Externas y Conteo de Stock
-- ============================================================

-- ─── BODEGAS EXTERNAS ────────────────────────────────────────
create table if not exists external_warehouses (
  id          uuid        primary key default gen_random_uuid(),
  code        text        not null unique,
  name        text        not null,
  location    text,
  contact     text,
  phone       text,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_warehouses_updated_at
  before update on external_warehouses
  for each row execute function set_updated_at();

-- ─── TRANSACCIONES DE BODEGA ─────────────────────────────────
create table if not exists warehouse_transactions (
  id              uuid    primary key default gen_random_uuid(),
  warehouse_id    uuid    not null references external_warehouses(id),
  warehouse_name  text    not null,
  type            text    not null,
  notes           text,
  evidence_images jsonb   not null default '[]',
  created_at      timestamptz not null default now(),
  created_by      text    not null,

  constraint wh_transaction_type_check
    check (type in ('loan', 'return', 'adjustment', 'exchange'))
);

-- Items de la transacción
create table if not exists warehouse_transaction_items (
  id             uuid    primary key default gen_random_uuid(),
  transaction_id uuid    not null references warehouse_transactions(id) on delete cascade,
  product_id     uuid    not null,
  product_name   text    not null,
  barcode        text,
  reference      text,
  quantity       integer not null default 1,
  color          text,
  brand          text,
  size           text,
  direction      text,

  constraint wh_item_direction_check
    check (direction in ('out', 'in') or direction is null)
);

-- ─── CONTEOS DE STOCK ────────────────────────────────────────
create table if not exists stock_counts (
  id           uuid        primary key default gen_random_uuid(),
  count_number text        not null unique,
  status       text        not null,
  notes        text,
  created_at   timestamptz not null default now(),
  completed_at timestamptz,

  constraint stock_count_status_check
    check (status in ('draft', 'completed'))
);

-- Items del conteo
create table if not exists stock_count_items (
  id            uuid    primary key default gen_random_uuid(),
  count_id      uuid    not null references stock_counts(id) on delete cascade,
  product_id    uuid    not null,
  product_name  text    not null,
  barcode       text,
  reference     text,
  system_stock  integer not null default 0,
  counted_stock integer not null default 0,
  difference    integer not null generated always as (counted_stock - system_stock) stored
);
