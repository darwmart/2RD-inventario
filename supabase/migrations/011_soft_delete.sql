-- ============================================================
-- MIGRACIÓN 011: Soft Delete Global
-- Agrega deleted_at a las tablas críticas.
-- Los DELETE físicos se reemplazan por UPDATE deleted_at = now().
-- Los SELECT filtran automáticamente via RLS / vistas.
-- ============================================================

-- ─── AGREGAR COLUMNAS SOFT DELETE ────────────────────────────
alter table products         add column if not exists deleted_at timestamptz;
alter table sales            add column if not exists deleted_at timestamptz;
alter table customers        add column if not exists deleted_at timestamptz;
alter table suppliers        add column if not exists deleted_at timestamptz;
alter table purchase_documents add column if not exists deleted_at timestamptz;
alter table categories       add column if not exists deleted_at timestamptz;
alter table advisors         add column if not exists deleted_at timestamptz;

-- ─── ÍNDICES PARCIALES (performance: solo filas activas) ─────
create index if not exists idx_products_active
  on products(id) where deleted_at is null;

create index if not exists idx_sales_active
  on sales(created_at desc) where deleted_at is null;

create index if not exists idx_customers_active
  on customers(id) where deleted_at is null;

create index if not exists idx_suppliers_active
  on suppliers(id) where deleted_at is null;

create index if not exists idx_purchase_docs_active
  on purchase_documents(created_at desc) where deleted_at is null;

-- ─── FUNCIÓN RPC: SOFT DELETE SEGURO ─────────────────────────
-- Llamar desde frontend: supabase.rpc('soft_delete_record', { p_table, p_id })
create or replace function soft_delete_record(
  p_table text,
  p_id    uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Validar que la tabla es una de las permitidas
  if p_table not in ('products','sales','customers','suppliers','purchase_documents','categories','advisors') then
    raise exception 'Tabla no permitida para soft delete: %', p_table;
  end if;

  -- Solo admin puede hacer soft delete
  if (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' != 'admin' then
    raise exception 'Solo administradores pueden eliminar registros';
  end if;

  execute format(
    'update %I set deleted_at = now() where id = $1 and deleted_at is null',
    p_table
  ) using p_id;
end;
$$;

-- ─── FUNCIÓN RPC: RESTAURAR REGISTRO ─────────────────────────
create or replace function restore_record(
  p_table text,
  p_id    uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_table not in ('products','sales','customers','suppliers','purchase_documents','categories','advisors') then
    raise exception 'Tabla no permitida para restaurar: %', p_table;
  end if;

  if (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' != 'admin' then
    raise exception 'Solo administradores pueden restaurar registros';
  end if;

  execute format(
    'update %I set deleted_at = null where id = $1',
    p_table
  ) using p_id;
end;
$$;

-- ─── ACTUALIZAR POLÍTICAS RLS PARA FILTRAR SOFT DELETE ───────
-- Los SELECT ya existentes en 008_rls_policies.sql necesitan
-- incluir: AND deleted_at IS NULL
-- Reemplazar las políticas de SELECT en las tablas principales:

drop policy if exists "Authenticated full access products" on products;
create policy "Active products readable"
  on products for select to authenticated
  using (deleted_at is null);

create policy "Admin can see deleted products"
  on products for select to authenticated
  using ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

drop policy if exists "Authenticated full access sales" on sales;
create policy "Active sales readable"
  on sales for select to authenticated
  using (deleted_at is null);

drop policy if exists "Authenticated full access customers" on customers;
create policy "Active customers readable"
  on customers for select to authenticated
  using (deleted_at is null);

drop policy if exists "Authenticated full access suppliers" on suppliers;
create policy "Active suppliers readable"
  on suppliers for select to authenticated
  using (deleted_at is null);

-- INSERT/UPDATE/DELETE siguen siendo para autenticados
create policy "Authenticated insert products"
  on products for insert to authenticated with check (true);

create policy "Authenticated update products"
  on products for update to authenticated using (true);

create policy "Authenticated insert sales"
  on sales for insert to authenticated with check (true);

create policy "Authenticated update sales"
  on sales for update to authenticated using (true);

create policy "Authenticated insert customers"
  on customers for insert to authenticated with check (true);

create policy "Authenticated update customers"
  on customers for update to authenticated using (true);

create policy "Authenticated insert suppliers"
  on suppliers for insert to authenticated with check (true);

create policy "Authenticated update suppliers"
  on suppliers for update to authenticated using (true);
