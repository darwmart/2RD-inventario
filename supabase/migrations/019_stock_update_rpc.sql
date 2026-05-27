-- ============================================================
-- MIGRACIÓN 019: RPC para actualizar stock sin restricción RLS
--
-- El problema: la política "Products update privileged" (migr. 016)
-- bloquea cualquier UPDATE en products a usuarios sin rol admin/manager.
-- Esto impide que compras y ventas actualicen el stock.
--
-- Solución: función SECURITY DEFINER que corre como el dueño del
-- schema (bypassa RLS) para la operación concreta de stock.
-- Los campos sensibles (precios, nombre, etc.) siguen protegidos.
-- ============================================================

create or replace function update_product_stock(
  p_product_id     uuid,
  p_new_stock      integer,
  p_reserved_stock integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Validar que el stock no sea negativo
  if p_new_stock < 0 then
    raise exception 'El stock no puede ser negativo';
  end if;

  update products
  set
    stock          = p_new_stock,
    reserved_stock = coalesce(p_reserved_stock, reserved_stock),
    updated_at     = now()
  where id = p_product_id;
end;
$$;

-- Permitir que cualquier usuario autenticado llame a esta función
grant execute on function update_product_stock(uuid, integer, integer) to authenticated;
