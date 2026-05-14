-- ============================================================
-- MIGRACIÓN 013: RBAC Profesional
-- Roles: super_admin, admin, manager, cashier, advisor, accountant, warehouse, viewer
-- Permisos granulares almacenados en user_metadata de Supabase Auth
-- + tabla profiles para datos adicionales
-- ============================================================

-- ─── TABLA PROFILES (extiende auth.users) ────────────────────
create table if not exists profiles (
  id              uuid        primary key references auth.users(id) on delete cascade,
  name            text        not null default '',
  username        text        unique,
  role            text        not null default 'viewer',
  is_active       boolean     not null default true,
  avatar_url      text,
  advisor_id      uuid        references advisors(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint profiles_role_check check (
    role in ('super_admin','admin','manager','cashier','advisor','accountant','warehouse','viewer')
  )
);

alter table profiles enable row level security;

-- Cada usuario puede leer su propio perfil
create policy "Users read own profile"
  on profiles for select to authenticated
  using (id = auth.uid());

-- Admin puede leer todos los perfiles
create policy "Admin read all profiles"
  on profiles for select to authenticated
  using ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' in ('admin','super_admin'));

-- Admin puede actualizar perfiles
create policy "Admin update profiles"
  on profiles for update to authenticated
  using ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' in ('admin','super_admin'));

-- Trigger para sincronizar updated_at
create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ─── TABLA DE PERMISOS GRANULARES ────────────────────────────
-- Define qué puede hacer cada rol. Se consulta desde el frontend
-- para habilitar/deshabilitar UI. La seguridad real está en RLS.
create table if not exists role_permissions (
  role        text    not null,
  permission  text    not null,
  granted     boolean not null default true,
  primary key (role, permission)
);

-- Poblar permisos por defecto
insert into role_permissions (role, permission, granted) values
-- SUPER_ADMIN: todo
('super_admin', 'can_manage_users',    true),
('super_admin', 'can_edit_prices',     true),
('super_admin', 'can_delete_sales',    true),
('super_admin', 'can_view_reports',    true),
('super_admin', 'can_close_cash',      true),
('super_admin', 'can_edit_products',   true),
('super_admin', 'can_edit_suppliers',  true),
('super_admin', 'can_view_costs',      true),
('super_admin', 'can_manage_purchases',true),
('super_admin', 'can_view_accounting', true),
('super_admin', 'can_manage_warehouse',true),
('super_admin', 'can_export_data',     true),
('super_admin', 'can_view_audit',      true),
('super_admin', 'can_view_commissions',true),
('super_admin', 'can_create_sales',    true),
('super_admin', 'can_apply_discounts', true),
-- ADMIN: casi todo excepto super_admin settings
('admin', 'can_manage_users',    true),
('admin', 'can_edit_prices',     true),
('admin', 'can_delete_sales',    true),
('admin', 'can_view_reports',    true),
('admin', 'can_close_cash',      true),
('admin', 'can_edit_products',   true),
('admin', 'can_edit_suppliers',  true),
('admin', 'can_view_costs',      true),
('admin', 'can_manage_purchases',true),
('admin', 'can_view_accounting', true),
('admin', 'can_manage_warehouse',true),
('admin', 'can_export_data',     true),
('admin', 'can_view_audit',      true),
('admin', 'can_view_commissions',true),
('admin', 'can_create_sales',    true),
('admin', 'can_apply_discounts', true),
-- MANAGER
('manager', 'can_manage_users',    false),
('manager', 'can_edit_prices',     true),
('manager', 'can_delete_sales',    true),
('manager', 'can_view_reports',    true),
('manager', 'can_close_cash',      true),
('manager', 'can_edit_products',   true),
('manager', 'can_edit_suppliers',  false),
('manager', 'can_view_costs',      true),
('manager', 'can_manage_purchases',true),
('manager', 'can_view_accounting', true),
('manager', 'can_manage_warehouse',true),
('manager', 'can_export_data',     true),
('manager', 'can_view_audit',      true),
('manager', 'can_view_commissions',true),
('manager', 'can_create_sales',    true),
('manager', 'can_apply_discounts', true),
-- CASHIER (cajero)
('cashier', 'can_manage_users',    false),
('cashier', 'can_edit_prices',     false),
('cashier', 'can_delete_sales',    false),
('cashier', 'can_view_reports',    false),
('cashier', 'can_close_cash',      true),
('cashier', 'can_edit_products',   false),
('cashier', 'can_edit_suppliers',  false),
('cashier', 'can_view_costs',      false),
('cashier', 'can_manage_purchases',false),
('cashier', 'can_view_accounting', false),
('cashier', 'can_manage_warehouse',false),
('cashier', 'can_export_data',     false),
('cashier', 'can_view_audit',      false),
('cashier', 'can_view_commissions',false),
('cashier', 'can_create_sales',    true),
('cashier', 'can_apply_discounts', false),
-- ADVISOR (asesor de ventas)
('advisor', 'can_manage_users',    false),
('advisor', 'can_edit_prices',     false),
('advisor', 'can_delete_sales',    false),
('advisor', 'can_view_reports',    false),
('advisor', 'can_close_cash',      false),
('advisor', 'can_edit_products',   false),
('advisor', 'can_edit_suppliers',  false),
('advisor', 'can_view_costs',      false),
('advisor', 'can_manage_purchases',false),
('advisor', 'can_view_accounting', false),
('advisor', 'can_manage_warehouse',false),
('advisor', 'can_export_data',     false),
('advisor', 'can_view_audit',      false),
('advisor', 'can_view_commissions',true),
('advisor', 'can_create_sales',    true),
('advisor', 'can_apply_discounts', true),
-- ACCOUNTANT (contador)
('accountant', 'can_manage_users',    false),
('accountant', 'can_edit_prices',     false),
('accountant', 'can_delete_sales',    false),
('accountant', 'can_view_reports',    true),
('accountant', 'can_close_cash',      false),
('accountant', 'can_edit_products',   false),
('accountant', 'can_edit_suppliers',  false),
('accountant', 'can_view_costs',      true),
('accountant', 'can_manage_purchases',false),
('accountant', 'can_view_accounting', true),
('accountant', 'can_manage_warehouse',false),
('accountant', 'can_export_data',     true),
('accountant', 'can_view_audit',      false),
('accountant', 'can_view_commissions',true),
('accountant', 'can_create_sales',    false),
('accountant', 'can_apply_discounts', false),
-- WAREHOUSE (bodega)
('warehouse', 'can_manage_users',    false),
('warehouse', 'can_edit_prices',     false),
('warehouse', 'can_delete_sales',    false),
('warehouse', 'can_view_reports',    false),
('warehouse', 'can_close_cash',      false),
('warehouse', 'can_edit_products',   false),
('warehouse', 'can_edit_suppliers',  false),
('warehouse', 'can_view_costs',      false),
('warehouse', 'can_manage_purchases',true),
('warehouse', 'can_view_accounting', false),
('warehouse', 'can_manage_warehouse',true),
('warehouse', 'can_export_data',     false),
('warehouse', 'can_view_audit',      false),
('warehouse', 'can_view_commissions',false),
('warehouse', 'can_create_sales',    false),
('warehouse', 'can_apply_discounts', false),
-- VIEWER (solo lectura)
('viewer', 'can_manage_users',    false),
('viewer', 'can_edit_prices',     false),
('viewer', 'can_delete_sales',    false),
('viewer', 'can_view_reports',    true),
('viewer', 'can_close_cash',      false),
('viewer', 'can_edit_products',   false),
('viewer', 'can_edit_suppliers',  false),
('viewer', 'can_view_costs',      false),
('viewer', 'can_manage_purchases',false),
('viewer', 'can_view_accounting', false),
('viewer', 'can_manage_warehouse',false),
('viewer', 'can_export_data',     false),
('viewer', 'can_view_audit',      false),
('viewer', 'can_view_commissions',false),
('viewer', 'can_create_sales',    false),
('viewer', 'can_apply_discounts', false)
on conflict (role, permission) do update set granted = excluded.granted;

alter table role_permissions enable row level security;
create policy "Authenticated read permissions"
  on role_permissions for select to authenticated using (true);

-- ─── FUNCIÓN: VERIFICAR PERMISO ──────────────────────────────
-- Uso en RLS: can_do('can_edit_prices')
create or replace function can_do(p_permission text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role   text;
  v_granted boolean;
begin
  v_role := coalesce(
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role',
    'viewer'
  );

  select granted into v_granted
  from role_permissions
  where role = v_role and permission = p_permission;

  return coalesce(v_granted, false);
end;
$$;

-- ─── TRIGGER: AUTO-CREAR PROFILE EN REGISTRO ─────────────────
create or replace function fn_create_profile_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, name, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email, ''),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'viewer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_create_profile_on_signup
  after insert on auth.users
  for each row execute function fn_create_profile_on_signup();

-- ─── ÍNDICES ──────────────────────────────────────────────────
create index if not exists idx_profiles_role     on profiles(role);
create index if not exists idx_profiles_username on profiles(username);
