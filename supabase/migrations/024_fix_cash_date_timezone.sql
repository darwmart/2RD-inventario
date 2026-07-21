-- Fix: date_key en apertura de caja usaba CURRENT_DATE (UTC), que adelanta un día
-- para zonas horarias UTC-. Ahora acepta p_date_key opcional desde el cliente;
-- si no se pasa, cae a America/Bogota como zona por defecto del proyecto.

CREATE OR REPLACE FUNCTION rpc_open_cash_session(
  p_opening_amount NUMERIC,
  p_opened_by_name TEXT,
  p_pos_id         TEXT    DEFAULT 'main',
  p_notes          TEXT    DEFAULT NULL,
  p_date_key       DATE    DEFAULT NULL   -- fecha local del cliente (YYYY-MM-DD)
)
RETURNS cash_sessions LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_session     cash_sessions;
  v_session_num TEXT;
  v_date_key    DATE;
BEGIN
  -- Usar la fecha enviada por el cliente; si no viene, calcular en zona Colombia
  v_date_key := COALESCE(p_date_key, (NOW() AT TIME ZONE 'America/Bogota')::DATE);

  -- Verificar que no haya sesión abierta
  IF EXISTS (SELECT 1 FROM cash_sessions WHERE pos_id = p_pos_id AND status = 'OPEN') THEN
    RAISE EXCEPTION 'Ya existe una caja abierta. Ciérrala antes de abrir una nueva.';
  END IF;

  -- Generar número de sesión: CAJA-YYYYMMDD-NNN
  SELECT 'CAJA-' || TO_CHAR(v_date_key, 'YYYYMMDD') || '-' ||
         LPAD((COUNT(*) + 1)::TEXT, 3, '0')
  INTO v_session_num
  FROM cash_sessions WHERE date_key = v_date_key AND pos_id = p_pos_id;

  INSERT INTO cash_sessions(
    session_number, pos_id, opened_by, opened_by_name,
    opening_amount, status, notes, date_key
  )
  VALUES (
    v_session_num, p_pos_id, auth.uid(), p_opened_by_name,
    p_opening_amount, 'OPEN', p_notes, v_date_key
  )
  RETURNING * INTO v_session;

  -- Registrar movimiento inicial
  INSERT INTO cash_movements(session_id, movement_type, amount, description, created_by, created_by_name)
  VALUES (v_session.id, 'CAPITAL_INJECTION', p_opening_amount, 'Base de apertura de caja', auth.uid(), p_opened_by_name);

  RETURN v_session;
END;
$$;
