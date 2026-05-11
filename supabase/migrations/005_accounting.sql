-- ============================================================
-- MIGRACIÓN 005: Contabilidad — Bancos, Registros, Caja, Gastos
-- ============================================================

-- ─── BANCOS / CAJAS ──────────────────────────────────────────
-- IDs semánticos (texto) para mantener compatibilidad con el
-- sistema de contabilidad: 'efectivo', 'caja-principal', etc.
create table if not exists banks (
  id        text        primary key,
  name      text        not null,
  icon      text,
  is_active boolean     not null default true,
  balance   numeric(14,2) not null default 0
);

-- ─── REGISTROS CONTABLES ─────────────────────────────────────
-- id es bigserial (entero) para coincidir con el tipo AccountingRecord.id: number
create table if not exists accounting_records (
  id          bigserial   primary key,
  tipo        text        not null,
  descripcion text        not null,
  proveedor   text,
  factura     text,
  monto       numeric(14,2) not null,
  banco       text        not null,
  fecha       text        not null,  -- formato 'YYYY-MM-DD'

  constraint accounting_tipo_check
    check (tipo in ('ingreso', 'egreso', 'compra', 'credito', 'traspaso'))
);

-- ─── SESIONES DE CAJA REGISTRADORA ───────────────────────────
create table if not exists cash_register_sessions (
  id             uuid        primary key default gen_random_uuid(),
  date           text        not null,
  opening_amount numeric(14,2) not null default 0,
  opening_time   text        not null,
  closing_amount numeric(14,2),
  closing_time   text,
  status         text        not null,
  difference     numeric(14,2),
  notes          text,

  constraint cash_session_status_check
    check (status in ('open', 'closed'))
);

-- ─── GASTOS Y PRÉSTAMOS ──────────────────────────────────────
-- created_at almacenado como text ISO para compatibilidad con
-- el tipo Expense.createdAt: string del dominio.
create table if not exists expenses (
  id          uuid        primary key default gen_random_uuid(),
  advisor_id  uuid        not null,
  advisor     text        not null,
  type        text        not null,
  amount      numeric(14,2) not null,
  description text        not null default '',
  created_at  text        not null default to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),

  constraint expenses_type_check
    check (type in ('gasto', 'prestamo'))
);
