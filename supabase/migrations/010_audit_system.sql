-- ============================================================
-- MIGRACIÓN 010: Sistema de Auditoría Enterprise
-- Tablas: audit_log, stock_movements, price_history, sale_status_history
-- ============================================================

-- ─── AUDIT LOG GENERAL ───────────────────────────────────────
-- Registra cualquier INSERT/UPDATE/DELETE en tablas críticas.
-- Se puebla exclusivamente vía triggers, nunca por código de aplicación.
create table if not exists audit_log (
  id          uuid        primary key default gen_random_uuid(),
  table_name  text        not null,
  record_id   uuid        not null,
  operation   text        not null,
  old_data    jsonb,
  new_data    jsonb,
  changed_by  uuid,                    -- auth.uid() en el momento del cambio
  user_email  text,                    -- desnormalizado para legibilidad
  user_role   text,                    -- desnormalizado para legibilidad
  ip_address  text,
  created_at  timestamptz not null default now(),

  constraint audit_operation_check
    check (operation in ('INSERT', 'UPDATE', 'DELETE'))
);

-- ─── MOVIMIENTOS DE STOCK ────────────────────────────────────
-- Cada cambio de stock genera una fila aquí (ventas, compras,
-- ajustes manuales, devoluciones). Es el libro mayor del inventario.
create table if not exists stock_movements (
  id              uuid        primary key default gen_random_uuid(),
  product_id      uuid        not null references products(id) on delete cascade,
  product_name    text        not null,
  movement_type   text        not null,  -- sale, purchase, return, adjustment, transfer, count
  quantity_before integer     not null,
  quantity_change integer     not null,  -- positivo = entrada, negativo = salida
  quantity_after  integer     not null,
  reference_type  text,                  -- sale, purchase_document, stock_count, manual
  reference_id    uuid,                  -- FK flexible al documento origen
  reference_number text,                 -- número legible del documento
  notes           text,
  created_by      uuid,
  created_by_name text,
  created_at      timestamptz not null default now(),

  constraint stock_movement_type_check
    check (movement_type in ('sale','purchase','return','adjustment','transfer','count','reservation'))
);

-- ─── HISTORIAL DE PRECIOS ────────────────────────────────────
-- Se inserta automáticamente cuando cambia cualquier precio del producto.
create table if not exists price_history (
  id                uuid        primary key default gen_random_uuid(),
  product_id        uuid        not null references products(id) on delete cascade,
  product_name      text        not null,
  field_changed     text        not null,  -- cost, current_price, suggested_price, etc.
  old_value         numeric(14,2) not null,
  new_value         numeric(14,2) not null,
  pct_change        numeric(8,4),          -- ((new-old)/old)*100
  changed_by        uuid,
  changed_by_name   text,
  created_at        timestamptz not null default now()
);

-- ─── HISTORIAL DE ESTADO DE VENTAS ───────────────────────────
-- Registra cada transición de estado en una venta.
create table if not exists sale_status_history (
  id          uuid        primary key default gen_random_uuid(),
  sale_id     uuid        not null references sales(id) on delete cascade,
  sale_number text        not null,
  from_status text,
  to_status   text        not null,
  reason      text,
  changed_by  uuid,
  changed_by_name text,
  created_at  timestamptz not null default now()
);

-- ─── RLS EN TABLAS DE AUDITORÍA ──────────────────────────────
alter table audit_log           enable row level security;
alter table stock_movements     enable row level security;
alter table price_history       enable row level security;
alter table sale_status_history enable row level security;

-- Solo usuarios autenticados pueden leer (INSERT solo via triggers con SECURITY DEFINER)
create policy "Authenticated read audit_log"
  on audit_log for select to authenticated using (true);

create policy "Authenticated read stock_movements"
  on stock_movements for select to authenticated using (true);

create policy "Authenticated read price_history"
  on price_history for select to authenticated using (true);

create policy "Authenticated read sale_status_history"
  on sale_status_history for select to authenticated using (true);

-- ─── FUNCIÓN GENÉRICA DE AUDITORÍA ───────────────────────────
-- Se reutiliza para todos los triggers de auditoría.
create or replace function fn_audit_trigger()
returns trigger
language plpgsql
security definer  -- Corre como owner, bypasea RLS para poder insertar
set search_path = public
as $$
declare
  v_record_id  uuid;
  v_old_data   jsonb := null;
  v_new_data   jsonb := null;
  v_user_id    uuid;
  v_user_email text;
  v_user_role  text;
begin
  -- Obtener contexto del usuario actual
  begin
    v_user_id    := auth.uid();
    v_user_email := auth.email();
    v_user_role  := coalesce((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role', 'user');
  exception when others then
    v_user_id    := null;
    v_user_email := 'system';
    v_user_role  := 'system';
  end;

  if (TG_OP = 'DELETE') then
    v_record_id := OLD.id;
    v_old_data  := to_jsonb(OLD);
  elsif (TG_OP = 'INSERT') then
    v_record_id := NEW.id;
    v_new_data  := to_jsonb(NEW);
  else
    v_record_id := NEW.id;
    -- En UPDATE solo guardamos los campos que cambiaron
    select jsonb_object_agg(key, value)
    into v_old_data
    from jsonb_each(to_jsonb(OLD))
    where value is distinct from (to_jsonb(NEW) -> key);

    select jsonb_object_agg(key, value)
    into v_new_data
    from jsonb_each(to_jsonb(NEW))
    where value is distinct from (to_jsonb(OLD) -> key);

    -- Si nada cambió efectivamente, no auditar
    if v_old_data is null then
      return NEW;
    end if;
  end if;

  insert into audit_log (
    table_name, record_id, operation,
    old_data, new_data,
    changed_by, user_email, user_role
  ) values (
    TG_TABLE_NAME, v_record_id, TG_OP,
    v_old_data, v_new_data,
    v_user_id, v_user_email, v_user_role
  );

  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end;
$$;

-- ─── TRIGGER DE AUDITORÍA EN PRODUCTOS ───────────────────────
create trigger trg_products_audit
  after insert or update or delete on products
  for each row execute function fn_audit_trigger();

-- ─── TRIGGER DE AUDITORÍA EN VENTAS ──────────────────────────
create trigger trg_sales_audit
  after insert or update or delete on sales
  for each row execute function fn_audit_trigger();

-- ─── TRIGGER DE AUDITORÍA EN COMPRAS ─────────────────────────
create trigger trg_purchases_audit
  after insert or update or delete on purchase_documents
  for each row execute function fn_audit_trigger();

-- ─── TRIGGER ESPECÍFICO: HISTORIAL DE PRECIOS ────────────────
create or replace function fn_price_history_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid;
  v_user_name text;
  price_fields text[] := array['cost','current_price','suggested_price','discount_price','wholesale_price'];
  field_name  text;
  old_val     numeric;
  new_val     numeric;
begin
  if TG_OP != 'UPDATE' then return NEW; end if;

  begin
    v_user_id   := auth.uid();
    v_user_name := coalesce((auth.jwt() ->> 'user_metadata')::jsonb ->> 'name', auth.email(), 'system');
  exception when others then
    v_user_id   := null;
    v_user_name := 'system';
  end;

  foreach field_name in array price_fields loop
    execute format('select ($1).%I', field_name) into old_val using OLD;
    execute format('select ($1).%I', field_name) into new_val using NEW;

    if old_val is distinct from new_val then
      insert into price_history (
        product_id, product_name, field_changed,
        old_value, new_value, pct_change,
        changed_by, changed_by_name
      ) values (
        NEW.id, NEW.name, field_name,
        coalesce(old_val, 0), coalesce(new_val, 0),
        case when coalesce(old_val, 0) != 0
          then round(((coalesce(new_val,0) - coalesce(old_val,0)) / old_val) * 100, 4)
          else null
        end,
        v_user_id, v_user_name
      );
    end if;
  end loop;

  return NEW;
end;
$$;

create trigger trg_products_price_history
  after update on products
  for each row execute function fn_price_history_trigger();

-- ─── TRIGGER: HISTORIAL DE ESTADO DE VENTAS ──────────────────
create or replace function fn_sale_status_history_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid;
  v_user_name text;
begin
  if TG_OP != 'UPDATE' then return NEW; end if;
  if OLD.status = NEW.status then return NEW; end if;

  begin
    v_user_id   := auth.uid();
    v_user_name := coalesce((auth.jwt() ->> 'user_metadata')::jsonb ->> 'name', auth.email(), 'system');
  exception when others then
    v_user_id   := null;
    v_user_name := 'system';
  end;

  insert into sale_status_history (
    sale_id, sale_number,
    from_status, to_status,
    changed_by, changed_by_name
  ) values (
    NEW.id, NEW.sale_number,
    OLD.status, NEW.status,
    v_user_id, v_user_name
  );

  return NEW;
end;
$$;

create trigger trg_sales_status_history
  after update on sales
  for each row execute function fn_sale_status_history_trigger();

-- ─── ÍNDICES DE AUDITORÍA ────────────────────────────────────
create index if not exists idx_audit_log_table_record  on audit_log(table_name, record_id);
create index if not exists idx_audit_log_changed_by    on audit_log(changed_by);
create index if not exists idx_audit_log_created_at    on audit_log(created_at desc);
create index if not exists idx_stock_movements_product on stock_movements(product_id, created_at desc);
create index if not exists idx_price_history_product   on price_history(product_id, created_at desc);
create index if not exists idx_sale_status_history_sale on sale_status_history(sale_id);

-- ─── VISTA ÚTIL: ACTIVIDAD RECIENTE ──────────────────────────
create or replace view v_recent_activity as
select
  id,
  table_name,
  record_id,
  operation,
  coalesce(user_email, 'system') as actor,
  user_role,
  created_at,
  case
    when operation = 'INSERT' then 'Creó ' || table_name
    when operation = 'UPDATE' then 'Modificó ' || table_name
    when operation = 'DELETE' then 'Eliminó ' || table_name
  end as description
from audit_log
order by created_at desc;
