-- ============================================================
-- MIGRACIÓN 002: Asesores, Métodos de Pago, Clientes
-- ============================================================

-- ─── ASESORES ────────────────────────────────────────────────
create table if not exists advisors (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  email      text        not null default '',
  phone      text        not null default '',
  is_active  boolean     not null default true,
  created_at timestamptz not null default now()
);

-- ─── MÉTODOS DE PAGO ─────────────────────────────────────────
create table if not exists payment_methods (
  id             uuid    primary key default gen_random_uuid(),
  name           text    not null,
  type           text    not null,
  is_active      boolean not null default true,
  bank_id        text,
  commission     numeric(6,3),
  payment_period text,
  payment_days   integer,

  constraint payment_methods_type_check
    check (type in ('cash', 'electronic', 'credit')),
  constraint payment_methods_period_check
    check (payment_period in ('immediate', 'weekly', 'monthly') or payment_period is null)
);

-- ─── CLIENTES ────────────────────────────────────────────────
create table if not exists customers (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  document      text,
  document_type text,
  phone         text,
  email         text,
  address       text,
  city          text,
  credit_limit  numeric(14,2),
  balance       numeric(14,2) not null default 0,
  notes         text,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now()
);

create unique index if not exists idx_customers_document
  on customers(document) where document is not null;
