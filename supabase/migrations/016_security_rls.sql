-- ============================================================
-- MIGRACIÓN 016: Seguridad Enterprise — RLS granular, auditoría,
-- protección anti-fraude y validaciones de negocio en BD.
-- ============================================================

-- ─── FUNCIÓN: Obtener rol actual (helper) ─────────────────────
create or replace function current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    'viewer'
  );
$$;

-- ─── FUNCIÓN: Verificar que el usuario es admin/manager ───────
create or replace function is_privileged()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select current_user_role() in ('super_admin','admin','manager');
$$;

-- ─── REFINAR RLS DE VENTAS ────────────────────────────────────
-- Asesores solo ven sus propias ventas (excepto admin/manager)
drop policy if exists "Active sales readable" on sales;

create policy "Sales visible por rol"
  on sales for select to authenticated
  using (
    deleted_at is null
    and (
      is_privileged()
      or advisor_id = auth.uid()
      -- El cajero ve todas las ventas del día actual
      or (current_user_role() = 'cashier' and created_at::date = current_date)
    )
  );

-- Solo roles que pueden crear ventas
create policy "Sales insert por rol"
  on sales for insert to authenticated
  with check (
    current_user_role() in ('super_admin','admin','manager','cashier','advisor')
  );

-- Admin/manager pueden actualizar ventas
create policy "Sales update por rol"
  on sales for update to authenticated
  using (
    is_privileged()
    -- El propio asesor puede actualizar su venta si está pendiente
    or (advisor_id = auth.uid() and status = 'pending')
  );

-- ─── RLS DE PRODUCTOS (precios protegidos) ────────────────────
drop policy if exists "Active products readable" on products;
drop policy if exists "Admin can see deleted products" on products;
drop policy if exists "Authenticated insert products" on products;
drop policy if exists "Authenticated update products" on products;

create policy "Products select todos"
  on products for select to authenticated
  using (deleted_at is null);

-- Solo admin puede ver productos eliminados
create policy "Products deleted solo admin"
  on products for select to authenticated
  using (deleted_at is not null and is_privileged());

-- Solo admin/manager puede crear/modificar productos
create policy "Products insert privileged"
  on products for insert to authenticated
  with check (is_privileged());

create policy "Products update privileged"
  on products for update to authenticated
  using (is_privileged());

-- ─── RESTRICCIÓN: Descuentos máximos por rol ─────────────────
-- Usa check constraint para que no pueda ser bypasseado desde el cliente
-- (un admin malicioso podría modificar la UI pero no la BD)
alter table sales drop constraint if exists sales_discount_limit;
alter table sales add constraint sales_discount_limit
  check (discount >= 0 and discount <= total * 1.0);  -- máx 100% del total

-- ─── FUNCIÓN: Validar descuento según rol ─────────────────────
create or replace function validate_discount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role          text;
  v_max_discount  numeric;
  v_discount_pct  numeric;
begin
  v_role := current_user_role();

  -- Límites de descuento por rol
  v_max_discount := case v_role
    when 'advisor'  then 5.0    -- asesores: máx 5%
    when 'cashier'  then 10.0   -- cajeros: máx 10%
    when 'manager'  then 25.0   -- managers: máx 25%
    else 100.0                   -- admin/super_admin: sin límite
  end;

  if NEW.subtotal > 0 then
    v_discount_pct := (NEW.discount / NEW.subtotal) * 100;
    if v_discount_pct > v_max_discount then
      raise exception 'DISCOUNT_LIMIT: Descuento %.1f%% supera el límite para tu rol (%.1f%%)',
        v_discount_pct, v_max_discount;
    end if;
  end if;

  return NEW;
end;
$$;

create trigger trg_validate_discount
  before insert or update on sales
  for each row execute function validate_discount();

-- ─── FUNCIÓN: Bloquear modificación de precios históricos ─────
-- Una venta completada no puede tener sus precios modificados
create or replace function prevent_sale_price_tampering()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No permitir cambio de totales en ventas completadas
  if OLD.status = 'completed' and NEW.status = 'completed' then
    if OLD.total != NEW.total or OLD.subtotal != NEW.subtotal then
      -- Solo super_admin puede hacerlo (correcciones contables)
      if current_user_role() != 'super_admin' then
        raise exception 'TAMPER: No se pueden modificar totales de una venta completada';
      end if;
    end if;
  end if;

  return NEW;
end;
$$;

create trigger trg_prevent_sale_tampering
  before update on sales
  for each row execute function prevent_sale_price_tampering();

-- ─── RLS: CONTABILIDAD solo para contadores y admin ──────────
drop policy if exists "Authenticated full access accounting" on accounting_records;

create policy "Accounting select por rol"
  on accounting_records for select to authenticated
  using (
    current_user_role() in ('super_admin','admin','manager','accountant')
  );

create policy "Accounting insert por rol"
  on accounting_records for insert to authenticated
  with check (
    current_user_role() in ('super_admin','admin','manager','accountant')
  );

-- ─── RLS: SESIONES DE CAJA ────────────────────────────────────
drop policy if exists "Authenticated full access cash_register_sessions" on cash_register_sessions;

create policy "Cash sessions select"
  on cash_register_sessions for select to authenticated
  using (
    is_privileged()
    or current_user_role() = 'cashier'
  );

create policy "Cash sessions insert"
  on cash_register_sessions for insert to authenticated
  with check (
    current_user_role() in ('super_admin','admin','manager','cashier')
  );

create policy "Cash sessions update"
  on cash_register_sessions for update to authenticated
  using (
    is_privileged()
    or current_user_role() = 'cashier'
  );

-- ─── RLS: GASTOS solo admin/cashier ──────────────────────────
drop policy if exists "Authenticated full access expenses" on expenses;

create policy "Expenses select"
  on expenses for select to authenticated
  using (
    is_privileged()
    or current_user_role() = 'cashier'
    or (current_user_role() = 'advisor' and advisor_id = auth.uid())
  );

create policy "Expenses insert"
  on expenses for insert to authenticated
  with check (
    is_privileged()
    or current_user_role() in ('cashier','advisor')
  );

-- ─── FUNCIÓN: Log de acceso a datos sensibles ─────────────────
-- Se ejecuta cuando alguien consulta precios de costo
create or replace function log_cost_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo loguear si el rol no debería ver costos
  if current_user_role() in ('advisor','viewer') then
    insert into audit_log (table_name, record_id, operation, new_data, changed_by, user_role)
    values ('products_cost_access', NEW.id, 'SELECT',
            jsonb_build_object('cost', NEW.cost, 'viewed_by_role', current_user_role()),
            auth.uid(), current_user_role());
  end if;
  return NEW;
end;
$$;

-- ─── RESTRICCIÓN: Stock nunca negativo ────────────────────────
alter table products drop constraint if exists products_stock_non_negative;
alter table products add constraint products_stock_non_negative
  check (stock >= 0 and reserved_stock >= 0);

-- ─── FUNCIÓN: Detección de anomalías en ventas ───────────────
-- Alerta si una venta tiene total superior al umbral (posible error)
create or replace function detect_sale_anomaly()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_threshold numeric := 50000000; -- 50 millones COP
begin
  if NEW.total > v_threshold then
    insert into audit_log (table_name, record_id, operation, new_data, changed_by, user_role)
    values (
      'sales_anomaly', NEW.id, 'INSERT',
      jsonb_build_object(
        'sale_number', NEW.sale_number,
        'total', NEW.total,
        'threshold', v_threshold,
        'alert', 'LARGE_SALE_DETECTED'
      ),
      auth.uid(), current_user_role()
    );
  end if;
  return NEW;
end;
$$;

create trigger trg_detect_sale_anomaly
  after insert on sales
  for each row execute function detect_sale_anomaly();

-- ─── RLS: PROFILES solo el propio usuario y admins ────────────
drop policy if exists "Users read own profile" on profiles;
drop policy if exists "Admin read all profiles" on profiles;
drop policy if exists "Admin update profiles" on profiles;

create policy "Profile own read"
  on profiles for select to authenticated
  using (id = auth.uid() or is_privileged());

create policy "Profile own update"
  on profiles for update to authenticated
  using (id = auth.uid() or is_privileged());

-- Solo admin puede crear/activar perfiles
create policy "Profile admin insert"
  on profiles for insert to authenticated
  with check (is_privileged());

-- ─── ÍNDICE: Buscar anomalías rápidamente ─────────────────────
create index if not exists idx_audit_anomalies
  on audit_log(table_name, created_at desc)
  where table_name like '%_anomaly';
