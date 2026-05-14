-- ============================================================
-- MIGRACIÓN 015: Control de Concurrencia
-- Previene: doble cierre de caja, doble arqueo, edición simultánea
-- ============================================================

-- ─── VERSIÓN EN TABLAS CRÍTICAS ──────────────────────────────
-- Products ya tiene version de 012. Agregar a sesiones de caja.
alter table cash_register_sessions add column if not exists version integer not null default 1;
alter table purchase_documents     add column if not exists version integer not null default 1;

-- Trigger de versión para sesiones de caja
create trigger trg_cash_sessions_version
  before update on cash_register_sessions
  for each row execute function fn_increment_version();

create trigger trg_purchase_docs_version
  before update on purchase_documents
  for each row execute function fn_increment_version();

-- ─── RPC: CERRAR CAJA CON BLOQUEO ────────────────────────────
-- Garantiza que solo un cierre puede ocurrir, incluso si dos usuarios
-- hacen clic al mismo tiempo. El segundo encontrará status='closed'.
create or replace function close_cash_session(
  p_session_id   uuid,
  p_version      integer,
  p_closing_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session cash_register_sessions%rowtype;
begin
  -- Bloquear la fila
  select * into v_session
  from cash_register_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Sesión de caja no encontrada';
  end if;

  if v_session.status = 'closed' then
    raise exception 'ALREADY_CLOSED: La sesión ya fue cerrada';
  end if;

  -- Verificar versión (optimistic locking)
  if v_session.version != p_version then
    raise exception 'CONFLICT: La sesión fue modificada por otro usuario. Recarga e intenta de nuevo.';
  end if;

  -- Cerrar la sesión
  update cash_register_sessions
  set
    status       = 'closed',
    closed_at    = now(),
    closing_data = p_closing_data,
    updated_at   = now()
  where id = p_session_id;

  return jsonb_build_object('success', true, 'closed_at', now());

exception
  when others then raise;
end;
$$;

-- ─── RPC: ABRIR SESIÓN DE CAJA (evitar doble apertura) ───────
create or replace function open_cash_session(
  p_initial_amount numeric,
  p_opened_by      uuid,
  p_opened_by_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_open_count integer;
  v_new_id     uuid;
begin
  -- Verificar que no hay sesión abierta hoy
  select count(*) into v_open_count
  from cash_register_sessions
  where status = 'open'
    and date = current_date;

  if v_open_count > 0 then
    raise exception 'ALREADY_OPEN: Ya existe una sesión de caja abierta para hoy';
  end if;

  insert into cash_register_sessions (
    date, status, initial_amount, opened_by, opened_by_name
  ) values (
    current_date, 'open', p_initial_amount, p_opened_by, p_opened_by_name
  )
  returning id into v_new_id;

  return jsonb_build_object('success', true, 'session_id', v_new_id);
end;
$$;

-- ─── ÍNDICE: buscar sesión abierta eficientemente ────────────
create index if not exists idx_cash_sessions_open
  on cash_register_sessions(date, status)
  where status = 'open';
