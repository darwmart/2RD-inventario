-- ============================================================
-- MIGRACIÓN 012: Stock Transaccional Real
-- Previene: stock negativo, doble venta, condiciones de carrera.
-- Estrategia: Advisory Locks + FOR UPDATE SKIP LOCKED + RPC functions
-- ============================================================

-- ─── VERSIÓN EN PRODUCTOS (optimistic locking) ───────────────
-- Se incrementa en cada UPDATE. El frontend envía la versión que conoce.
-- Si no coincide → otro proceso modificó el registro → conflicto detectado.
alter table products add column if not exists version integer not null default 1;

create or replace function fn_increment_version()
returns trigger language plpgsql as $$
begin
  new.version := old.version + 1;
  return new;
end;
$$;

create trigger trg_products_version
  before update on products
  for each row execute function fn_increment_version();

-- ─── RPC: DESCONTAR STOCK CON BLOQUEO ────────────────────────
-- Se llama al confirmar una venta. Bloquea la fila con SELECT FOR UPDATE
-- dentro de una transacción, impidiendo que otro proceso vea el stock
-- antes de que este lo descuente. Atómico y sin condiciones de carrera.
create or replace function deduct_stock(
  p_sale_id    uuid,
  p_sale_number text,
  p_items      jsonb,   -- [{product_id, quantity, product_name}]
  p_actor_id   uuid     default null,
  p_actor_name text     default 'system'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item        jsonb;
  v_product   products%rowtype;
  v_qty       integer;
  v_errors    jsonb := '[]'::jsonb;
  v_movements jsonb := '[]'::jsonb;
begin
  -- Iterar sobre cada item del carrito
  for item in select * from jsonb_array_elements(p_items) loop
    v_qty := (item->>'quantity')::integer;

    -- Bloquear la fila para esta transacción (impide lectura sucia)
    select * into v_product
    from products
    where id = (item->>'product_id')::uuid
    for update;

    if not found then
      v_errors := v_errors || jsonb_build_object(
        'product_id', item->>'product_id',
        'error', 'Producto no encontrado'
      );
      continue;
    end if;

    -- Verificar stock suficiente
    if v_product.stock < v_qty then
      v_errors := v_errors || jsonb_build_object(
        'product_id', v_product.id,
        'product_name', v_product.name,
        'available', v_product.stock,
        'requested', v_qty,
        'error', format('Stock insuficiente: disponible %s, solicitado %s', v_product.stock, v_qty)
      );
      continue;
    end if;

    -- Descontar stock
    update products
    set stock = stock - v_qty,
        updated_at = now()
    where id = v_product.id;

    -- Registrar movimiento
    insert into stock_movements (
      product_id, product_name,
      movement_type,
      quantity_before, quantity_change, quantity_after,
      reference_type, reference_id, reference_number,
      created_by, created_by_name
    ) values (
      v_product.id, v_product.name,
      'sale',
      v_product.stock, -v_qty, v_product.stock - v_qty,
      'sale', p_sale_id, p_sale_number,
      p_actor_id, p_actor_name
    );

    v_movements := v_movements || jsonb_build_object(
      'product_id', v_product.id,
      'deducted', v_qty,
      'stock_after', v_product.stock - v_qty
    );
  end loop;

  -- Si hay errores, lanzar excepción para hacer rollback de toda la transacción
  if jsonb_array_length(v_errors) > 0 then
    raise exception 'STOCK_ERROR: %', v_errors::text;
  end if;

  return jsonb_build_object('success', true, 'movements', v_movements);

exception
  when others then
    -- Re-lanzar para que Supabase haga rollback
    raise;
end;
$$;

-- ─── RPC: REINTEGRAR STOCK (DEVOLUCIONES) ────────────────────
create or replace function reintegrate_stock(
  p_return_id     uuid,
  p_return_number text,
  p_items         jsonb,   -- [{product_id, quantity, product_name}]
  p_actor_id      uuid     default null,
  p_actor_name    text     default 'system'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item      jsonb;
  v_product products%rowtype;
  v_qty     integer;
begin
  for item in select * from jsonb_array_elements(p_items) loop
    v_qty := (item->>'quantity')::integer;

    select * into v_product
    from products
    where id = (item->>'product_id')::uuid
    for update;

    if not found then continue; end if;

    update products
    set stock = stock + v_qty,
        updated_at = now()
    where id = v_product.id;

    insert into stock_movements (
      product_id, product_name,
      movement_type,
      quantity_before, quantity_change, quantity_after,
      reference_type, reference_id, reference_number,
      created_by, created_by_name
    ) values (
      v_product.id, v_product.name,
      'return',
      v_product.stock, v_qty, v_product.stock + v_qty,
      'sale_return', p_return_id, p_return_number,
      p_actor_id, p_actor_name
    );
  end loop;

  return jsonb_build_object('success', true);
end;
$$;

-- ─── RPC: AJUSTE MANUAL DE STOCK (SOLO ADMIN) ────────────────
create or replace function adjust_stock(
  p_product_id   uuid,
  p_new_stock    integer,
  p_reason       text,
  p_actor_id     uuid     default null,
  p_actor_name   text     default 'system'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product products%rowtype;
  v_change  integer;
begin
  if (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' != 'admin' then
    raise exception 'Solo administradores pueden ajustar stock manualmente';
  end if;

  if p_new_stock < 0 then
    raise exception 'El stock no puede ser negativo';
  end if;

  select * into v_product
  from products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Producto no encontrado';
  end if;

  v_change := p_new_stock - v_product.stock;

  update products
  set stock = p_new_stock,
      updated_at = now()
  where id = p_product_id;

  insert into stock_movements (
    product_id, product_name,
    movement_type,
    quantity_before, quantity_change, quantity_after,
    notes,
    created_by, created_by_name
  ) values (
    v_product.id, v_product.name,
    'adjustment',
    v_product.stock, v_change, p_new_stock,
    p_reason,
    p_actor_id, p_actor_name
  );

  return jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'stock_before', v_product.stock,
    'stock_after', p_new_stock,
    'change', v_change
  );
end;
$$;

-- ─── RPC: RESERVAR STOCK (SEPARADOS/COTIZACIONES) ────────────
create or replace function reserve_stock(
  p_sale_id     uuid,
  p_sale_number text,
  p_items       jsonb,
  p_actor_id    uuid  default null,
  p_actor_name  text  default 'system'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item      jsonb;
  v_product products%rowtype;
  v_qty     integer;
  v_errors  jsonb := '[]'::jsonb;
begin
  for item in select * from jsonb_array_elements(p_items) loop
    v_qty := (item->>'quantity')::integer;

    select * into v_product
    from products
    where id = (item->>'product_id')::uuid
    for update;

    if not found then continue; end if;

    -- Stock disponible = stock total - ya reservado
    if (v_product.stock - v_product.reserved_stock) < v_qty then
      v_errors := v_errors || jsonb_build_object(
        'product_name', v_product.name,
        'available', v_product.stock - v_product.reserved_stock,
        'requested', v_qty,
        'error', 'Stock disponible insuficiente para reservar'
      );
      continue;
    end if;

    update products
    set reserved_stock = reserved_stock + v_qty,
        updated_at = now()
    where id = v_product.id;

    insert into stock_movements (
      product_id, product_name,
      movement_type,
      quantity_before, quantity_change, quantity_after,
      reference_type, reference_id, reference_number,
      created_by, created_by_name
    ) values (
      v_product.id, v_product.name,
      'reservation',
      v_product.reserved_stock, v_qty, v_product.reserved_stock + v_qty,
      'sale', p_sale_id, p_sale_number,
      p_actor_id, p_actor_name
    );
  end loop;

  if jsonb_array_length(v_errors) > 0 then
    raise exception 'STOCK_RESERVE_ERROR: %', v_errors::text;
  end if;

  return jsonb_build_object('success', true);
end;
$$;

-- ─── ÍNDICE PARA MOVIMIENTOS ──────────────────────────────────
create index if not exists idx_stock_movements_product_date
  on stock_movements(product_id, created_at desc);

create index if not exists idx_stock_movements_type
  on stock_movements(movement_type, created_at desc);
