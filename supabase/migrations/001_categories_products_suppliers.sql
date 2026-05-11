-- ============================================================
-- MIGRACIÓN 001: Categorías, Productos, Proveedores
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- ─── CATEGORÍAS ──────────────────────────────────────────────
create table if not exists categories (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  description text        not null default '',
  created_at  timestamptz not null default now()
);

-- ─── PROVEEDORES ─────────────────────────────────────────────
create table if not exists suppliers (
  id               uuid        primary key default gen_random_uuid(),
  code             text,
  accounting_code  text,
  tax_id_type      text        not null default 'NIT',
  tax_id           text        not null,
  fiscal_name      text        not null,
  commercial_name  text,
  address          text        not null default '',
  postal_code      text,
  city             text,
  province         text,
  country          text,
  phone            text        not null default '',
  mobile           text,
  fax              text,
  contact_person   text,
  email            text        not null default '',
  twitter          text,
  facebook         text,
  iban             text,
  ccc              text,
  bank_name        text,
  observations     text,
  is_provider      boolean     not null default true,
  is_creditor      boolean     not null default false,
  created_at       timestamptz not null default now()
);

-- ─── PRODUCTOS ───────────────────────────────────────────────
create table if not exists products (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null,
  barcode         text,
  reference       text,
  description     text        not null default '',
  image           text        not null default '',
  cost            numeric(14,2) not null default 0,
  suggested_price numeric(14,2) not null default 0,
  discount_price  numeric(14,2) not null default 0,
  wholesale_price numeric(14,2) not null default 0,
  current_price   numeric(14,2) not null default 0,
  stock           integer     not null default 0,
  min_stock       integer     not null default 0,
  reserved_stock  integer     not null default 0,
  has_iva         boolean     not null default false,
  category_id     uuid        references categories(id) on delete set null,
  supplier_id     uuid        references suppliers(id)  on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Trigger para actualizar updated_at automáticamente
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();
