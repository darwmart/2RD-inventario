-- ============================================================
-- MIGRACIÓN 020: MÓDULO DE CAJA ENTERPRISE
-- Sistema POS — Auditoría financiera completa, inmutabilidad,
-- multi-usuario, reapertura controlada, libro mayor de movimientos.
-- ============================================================

-- ─── 1. TIPOS ENUMERADOS ────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE cash_session_status AS ENUM ('OPEN','CLOSED','REOPENED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cash_movement_type AS ENUM (
    'SALE','EXPENSE','CREDIT_PAYMENT','CAPITAL_INJECTION',
    'CASH_WITHDRAWAL','SAFE_TRANSFER','REFUND','ADJUSTMENT','REVERSAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cash_audit_action AS ENUM (
    'INSERT','UPDATE','CLOSE','REOPEN','VOID','REVERSAL','CANCEL'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 2. TABLA: cash_sessions ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cash_sessions (
  id                UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  session_number    TEXT              NOT NULL UNIQUE,
  pos_id            TEXT              NOT NULL DEFAULT 'main',
  opened_by         UUID              NOT NULL REFERENCES auth.users(id),
  opened_by_name    TEXT              NOT NULL DEFAULT '',
  opened_at         TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  opening_amount    NUMERIC(14,2)     NOT NULL DEFAULT 0 CHECK (opening_amount >= 0),
  closed_by         UUID              REFERENCES auth.users(id),
  closed_by_name    TEXT,
  closed_at         TIMESTAMPTZ,
  closing_amount    NUMERIC(14,2)     CHECK (closing_amount >= 0),
  expected_amount   NUMERIC(14,2),
  difference_amount NUMERIC(14,2),
  status            cash_session_status NOT NULL DEFAULT 'OPEN',
  notes             TEXT,
  date_key          DATE              NOT NULL DEFAULT CURRENT_DATE,
  created_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- Índices de cash_sessions
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status      ON cash_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_date_key    ON cash_sessions(date_key DESC);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_opened_by   ON cash_sessions(opened_by);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_pos         ON cash_sessions(pos_id, date_key DESC);

-- ─── 3. TABLA: cash_movements (LIBRO MAYOR — inmutable) ──────────────────────

CREATE TABLE IF NOT EXISTS cash_movements (
  id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID              NOT NULL REFERENCES cash_sessions(id),
  movement_type   cash_movement_type NOT NULL,
  -- positivo = ingreso, negativo = egreso
  amount          NUMERIC(14,2)     NOT NULL,
  description     TEXT              NOT NULL DEFAULT '',
  reference_id    TEXT,
  reference_table TEXT,
  created_by      UUID              NOT NULL REFERENCES auth.users(id),
  created_by_name TEXT              NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  metadata        JSONB             DEFAULT '{}'::jsonb
);

-- Índices de cash_movements
CREATE INDEX IF NOT EXISTS idx_cash_movements_session    ON cash_movements(session_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_type       ON cash_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_cash_movements_created_at ON cash_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_movements_ref        ON cash_movements(reference_id) WHERE reference_id IS NOT NULL;

-- ─── 4. TABLA: cash_reopen_history ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cash_reopen_history (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                UUID        NOT NULL REFERENCES cash_sessions(id),
  reopened_by               UUID        NOT NULL REFERENCES auth.users(id),
  reopened_by_name          TEXT        NOT NULL DEFAULT '',
  reopened_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason                    TEXT        NOT NULL,
  previous_status           cash_session_status NOT NULL,
  previous_closing_amount   NUMERIC(14,2),
  previous_expected_amount  NUMERIC(14,2),
  previous_difference_amount NUMERIC(14,2),
  approved_by               UUID        REFERENCES auth.users(id),
  approved_by_name          TEXT
);

CREATE INDEX IF NOT EXISTS idx_reopen_history_session ON cash_reopen_history(session_id);

-- ─── 5. TABLA: cash_withdrawals ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cash_withdrawals (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID          NOT NULL REFERENCES cash_sessions(id),
  amount           NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  reason           TEXT          NOT NULL,
  authorized_by    UUID          REFERENCES auth.users(id),
  authorized_by_name TEXT,
  created_by       UUID          NOT NULL REFERENCES auth.users(id),
  created_by_name  TEXT          NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  is_reversed      BOOLEAN       NOT NULL DEFAULT FALSE,
  reversed_at      TIMESTAMPTZ,
  reversed_by      UUID          REFERENCES auth.users(id),
  reversal_reason  TEXT
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_session ON cash_withdrawals(session_id);

-- ─── 6. TABLA: sale_reversals ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sale_reversals (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id      UUID          NOT NULL REFERENCES sales(id),
  session_id   UUID          REFERENCES cash_sessions(id),
  amount       NUMERIC(14,2) NOT NULL,
  reason       TEXT          NOT NULL,
  approved_by  UUID          REFERENCES auth.users(id),
  approved_by_name TEXT,
  reversed_by  UUID          NOT NULL REFERENCES auth.users(id),
  reversed_by_name TEXT      NOT NULL DEFAULT '',
  reversed_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_reversals_sale    ON sale_reversals(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_reversals_session ON sale_reversals(session_id);

-- ─── 7. TABLA: cash_audit_log ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cash_audit_log (
  id          BIGSERIAL     PRIMARY KEY,
  table_name  TEXT          NOT NULL,
  record_id   UUID          NOT NULL,
  action      cash_audit_action NOT NULL,
  changed_by  UUID          REFERENCES auth.users(id),
  changed_by_name TEXT,
  changed_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  old_data    JSONB,
  new_data    JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  notes       TEXT
);

CREATE INDEX IF NOT EXISTS idx_cash_audit_table_record ON cash_audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_cash_audit_changed_at   ON cash_audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_audit_changed_by   ON cash_audit_log(changed_by);

-- ─── 8. TRIGGERS ─────────────────────────────────────────────────────────────

-- 8.1 Actualizar updated_at automáticamente en cash_sessions
CREATE OR REPLACE FUNCTION fn_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_cash_sessions_updated_at ON cash_sessions;
CREATE TRIGGER trg_cash_sessions_updated_at
  BEFORE UPDATE ON cash_sessions
  FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

-- 8.2 Inmutabilidad de cash_movements
-- No permitir UPDATE ni DELETE de ningún movimiento
CREATE OR REPLACE FUNCTION fn_prevent_movement_modification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Los movimientos de caja son inmutables. Usa un movimiento REVERSAL para corregir.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_movement_update ON cash_movements;
CREATE TRIGGER trg_prevent_movement_update
  BEFORE UPDATE ON cash_movements
  FOR EACH ROW EXECUTE FUNCTION fn_prevent_movement_modification();

DROP TRIGGER IF EXISTS trg_prevent_movement_delete ON cash_movements;
CREATE TRIGGER trg_prevent_movement_delete
  BEFORE DELETE ON cash_movements
  FOR EACH ROW EXECUTE FUNCTION fn_prevent_movement_modification();

-- 8.3 Auditoría automática de cash_sessions
CREATE OR REPLACE FUNCTION fn_audit_cash_sessions()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_action cash_audit_action;
  v_old    JSONB;
  v_new    JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'INSERT'; v_old := NULL; v_new := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE'; v_old := to_jsonb(OLD); v_new := to_jsonb(NEW);
    IF OLD.status != NEW.status THEN
      IF NEW.status = 'CLOSED'   THEN v_action := 'CLOSE';  END IF;
      IF NEW.status = 'REOPENED' THEN v_action := 'REOPEN'; END IF;
      IF NEW.status = 'CANCELLED' THEN v_action := 'CANCEL'; END IF;
    END IF;
  END IF;

  INSERT INTO cash_audit_log(table_name, record_id, action, changed_by, old_data, new_data)
  VALUES ('cash_sessions', NEW.id, v_action, NEW.opened_by, v_old, v_new);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_cash_sessions ON cash_sessions;
CREATE TRIGGER trg_audit_cash_sessions
  AFTER INSERT OR UPDATE ON cash_sessions
  FOR EACH ROW EXECUTE FUNCTION fn_audit_cash_sessions();

-- 8.4 Solo una sesión OPEN por pos_id
CREATE OR REPLACE FUNCTION fn_check_single_open_session()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'OPEN' THEN
    IF EXISTS (
      SELECT 1 FROM cash_sessions
      WHERE pos_id = NEW.pos_id AND status = 'OPEN' AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Ya existe una caja abierta para este punto de venta (%).', NEW.pos_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_single_open_session ON cash_sessions;
CREATE TRIGGER trg_check_single_open_session
  BEFORE INSERT OR UPDATE ON cash_sessions
  FOR EACH ROW EXECUTE FUNCTION fn_check_single_open_session();

-- ─── 9. RPC FUNCTIONS ────────────────────────────────────────────────────────

-- 9.1 Abrir sesión de caja
CREATE OR REPLACE FUNCTION rpc_open_cash_session(
  p_opening_amount NUMERIC,
  p_opened_by_name TEXT,
  p_pos_id         TEXT DEFAULT 'main',
  p_notes          TEXT DEFAULT NULL
)
RETURNS cash_sessions LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_session     cash_sessions;
  v_session_num TEXT;
  v_date_key    DATE := CURRENT_DATE;
BEGIN
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

-- 9.2 Cerrar sesión de caja
CREATE OR REPLACE FUNCTION rpc_close_cash_session(
  p_session_id      UUID,
  p_closing_amount  NUMERIC,
  p_closed_by_name  TEXT,
  p_notes           TEXT DEFAULT NULL
)
RETURNS cash_sessions LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_session       cash_sessions;
  v_expected      NUMERIC;
  v_diff          NUMERIC;
BEGIN
  SELECT * INTO v_session FROM cash_sessions WHERE id = p_session_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesión de caja no encontrada.';
  END IF;
  IF v_session.status = 'CLOSED' THEN
    RAISE EXCEPTION 'Esta sesión ya está cerrada.';
  END IF;

  -- Calcular monto esperado desde movimientos
  SELECT COALESCE(SUM(amount), 0)
  INTO v_expected
  FROM cash_movements WHERE session_id = p_session_id;

  v_diff := p_closing_amount - v_expected;

  UPDATE cash_sessions SET
    status            = 'CLOSED',
    closed_by         = auth.uid(),
    closed_by_name    = p_closed_by_name,
    closed_at         = NOW(),
    closing_amount    = p_closing_amount,
    expected_amount   = v_expected,
    difference_amount = v_diff,
    notes             = COALESCE(p_notes, notes)
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  -- Registrar diferencia como movimiento si existe
  IF v_diff != 0 THEN
    INSERT INTO cash_movements(session_id, movement_type, amount, description, created_by, created_by_name)
    VALUES (p_session_id, 'ADJUSTMENT', v_diff,
      CASE WHEN v_diff > 0 THEN 'Sobrante al cierre' ELSE 'Faltante al cierre' END,
      auth.uid(), p_closed_by_name);
  END IF;

  RETURN v_session;
END;
$$;

-- 9.3 Reabrir sesión de caja (solo admin/super_admin)
CREATE OR REPLACE FUNCTION rpc_reopen_cash_session(
  p_session_id       UUID,
  p_reason           TEXT,
  p_reopened_by_name TEXT
)
RETURNS cash_sessions LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_session cash_sessions;
  v_role    TEXT;
BEGIN
  -- Verificar rol
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Solo administradores pueden reabrir sesiones de caja.';
  END IF;

  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RAISE EXCEPTION 'El motivo de reapertura es obligatorio.';
  END IF;

  SELECT * INTO v_session FROM cash_sessions WHERE id = p_session_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Sesión no encontrada.'; END IF;
  IF v_session.status = 'OPEN' THEN RAISE EXCEPTION 'La sesión ya está abierta.'; END IF;

  -- Guardar historial de reapertura
  INSERT INTO cash_reopen_history(
    session_id, reopened_by, reopened_by_name, reason, previous_status,
    previous_closing_amount, previous_expected_amount, previous_difference_amount,
    approved_by, approved_by_name
  )
  VALUES (
    p_session_id, auth.uid(), p_reopened_by_name, p_reason, v_session.status,
    v_session.closing_amount, v_session.expected_amount, v_session.difference_amount,
    auth.uid(), p_reopened_by_name
  );

  -- Reabrir: limpiar cierre pero conservar historial en reopen_history
  UPDATE cash_sessions SET
    status            = 'REOPENED',
    closed_by         = NULL,
    closed_by_name    = NULL,
    closed_at         = NULL,
    closing_amount    = NULL,
    expected_amount   = NULL,
    difference_amount = NULL,
    notes             = 'REABIERTA: ' || p_reason
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

-- 9.4 Agregar movimiento de caja
CREATE OR REPLACE FUNCTION rpc_add_cash_movement(
  p_session_id      UUID,
  p_movement_type   cash_movement_type,
  p_amount          NUMERIC,
  p_description     TEXT,
  p_created_by_name TEXT,
  p_reference_id    TEXT DEFAULT NULL,
  p_reference_table TEXT DEFAULT NULL,
  p_metadata        JSONB DEFAULT '{}'::jsonb
)
RETURNS cash_movements LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_session cash_sessions;
  v_movement cash_movements;
BEGIN
  SELECT * INTO v_session FROM cash_sessions WHERE id = p_session_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Sesión de caja no encontrada.'; END IF;
  IF v_session.status = 'CLOSED' THEN
    RAISE EXCEPTION 'No se pueden registrar movimientos en una sesión cerrada.';
  END IF;

  INSERT INTO cash_movements(
    session_id, movement_type, amount, description,
    reference_id, reference_table, created_by, created_by_name, metadata
  )
  VALUES (
    p_session_id, p_movement_type, p_amount, p_description,
    p_reference_id, p_reference_table, auth.uid(), p_created_by_name, p_metadata
  )
  RETURNING * INTO v_movement;

  RETURN v_movement;
END;
$$;

-- 9.5 Obtener resumen de sesión activa
CREATE OR REPLACE FUNCTION rpc_get_session_summary(p_session_id UUID)
RETURNS TABLE (
  total_ingresos    NUMERIC,
  total_egresos     NUMERIC,
  balance_efectivo  NUMERIC,
  total_ventas      NUMERIC,
  total_gastos      NUMERIC,
  total_abonos      NUMERIC,
  total_retiros     NUMERIC,
  total_traspasos   NUMERIC,
  num_movimientos   BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS total_ingresos,
    COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) AS total_egresos,
    COALESCE(SUM(amount), 0) AS balance_efectivo,
    COALESCE(SUM(CASE WHEN movement_type = 'SALE' THEN amount ELSE 0 END), 0) AS total_ventas,
    COALESCE(SUM(CASE WHEN movement_type = 'EXPENSE' THEN ABS(amount) ELSE 0 END), 0) AS total_gastos,
    COALESCE(SUM(CASE WHEN movement_type = 'CREDIT_PAYMENT' THEN amount ELSE 0 END), 0) AS total_abonos,
    COALESCE(SUM(CASE WHEN movement_type = 'CASH_WITHDRAWAL' THEN ABS(amount) ELSE 0 END), 0) AS total_retiros,
    COALESCE(SUM(CASE WHEN movement_type = 'SAFE_TRANSFER' THEN ABS(amount) ELSE 0 END), 0) AS total_traspasos,
    COUNT(*) AS num_movimientos
  FROM cash_movements
  WHERE session_id = p_session_id;
END;
$$;

-- 9.6 Reporte diario de caja
CREATE OR REPLACE FUNCTION rpc_get_daily_cash_report(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  session_id        UUID,
  session_number    TEXT,
  status            cash_session_status,
  opening_amount    NUMERIC,
  closing_amount    NUMERIC,
  expected_amount   NUMERIC,
  difference_amount NUMERIC,
  total_ingresos    NUMERIC,
  total_egresos     NUMERIC,
  opened_by_name    TEXT,
  closed_by_name    TEXT,
  opened_at         TIMESTAMPTZ,
  closed_at         TIMESTAMPTZ,
  num_reopens       BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id,
    cs.session_number,
    cs.status,
    cs.opening_amount,
    cs.closing_amount,
    cs.expected_amount,
    cs.difference_amount,
    COALESCE(SUM(CASE WHEN cm.amount > 0 THEN cm.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN cm.amount < 0 THEN ABS(cm.amount) ELSE 0 END), 0),
    cs.opened_by_name,
    cs.closed_by_name,
    cs.opened_at,
    cs.closed_at,
    (SELECT COUNT(*) FROM cash_reopen_history crh WHERE crh.session_id = cs.id)
  FROM cash_sessions cs
  LEFT JOIN cash_movements cm ON cm.session_id = cs.id
  WHERE cs.date_key = p_date
  GROUP BY cs.id
  ORDER BY cs.opened_at DESC;
END;
$$;

-- ─── 10. VISTAS SQL ──────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_active_cash_session AS
SELECT
  cs.*,
  COALESCE(SUM(cm.amount), 0) AS current_balance,
  COUNT(cm.id) AS movement_count
FROM cash_sessions cs
LEFT JOIN cash_movements cm ON cm.session_id = cs.id
WHERE cs.status IN ('OPEN', 'REOPENED')
GROUP BY cs.id;

CREATE OR REPLACE VIEW v_cash_movements_detail AS
SELECT
  cm.*,
  cs.session_number,
  cs.date_key,
  cs.pos_id
FROM cash_movements cm
JOIN cash_sessions cs ON cs.id = cm.session_id
ORDER BY cm.created_at DESC;

-- ─── 11. ROW LEVEL SECURITY ──────────────────────────────────────────────────

ALTER TABLE cash_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_reopen_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_withdrawals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_reversals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_audit_log       ENABLE ROW LEVEL SECURITY;

-- Helper: obtener rol del usuario actual
CREATE OR REPLACE FUNCTION fn_user_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(role, 'viewer') FROM profiles WHERE id = auth.uid()
$$;

-- cash_sessions: todos los autenticados pueden leer; solo admin puede modificar
DROP POLICY IF EXISTS "cash_sessions_select" ON cash_sessions;
CREATE POLICY "cash_sessions_select" ON cash_sessions
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cash_sessions_insert" ON cash_sessions;
CREATE POLICY "cash_sessions_insert" ON cash_sessions
  FOR INSERT WITH CHECK (
    fn_user_role() IN ('super_admin','admin','manager','cashier')
  );

DROP POLICY IF EXISTS "cash_sessions_update" ON cash_sessions;
CREATE POLICY "cash_sessions_update" ON cash_sessions
  FOR UPDATE USING (
    fn_user_role() IN ('super_admin','admin','manager','cashier')
  );

-- cash_movements: lectura autenticada; inserción solo via RPC
DROP POLICY IF EXISTS "cash_movements_select" ON cash_movements;
CREATE POLICY "cash_movements_select" ON cash_movements
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cash_movements_insert" ON cash_movements;
CREATE POLICY "cash_movements_insert" ON cash_movements
  FOR INSERT WITH CHECK (
    fn_user_role() IN ('super_admin','admin','manager','cashier')
  );

-- cash_reopen_history: lectura autenticada; solo admins insertan
DROP POLICY IF EXISTS "reopen_history_select" ON cash_reopen_history;
CREATE POLICY "reopen_history_select" ON cash_reopen_history
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "reopen_history_insert" ON cash_reopen_history;
CREATE POLICY "reopen_history_insert" ON cash_reopen_history
  FOR INSERT WITH CHECK (fn_user_role() IN ('super_admin','admin'));

-- cash_withdrawals
DROP POLICY IF EXISTS "withdrawals_select" ON cash_withdrawals;
CREATE POLICY "withdrawals_select" ON cash_withdrawals
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "withdrawals_insert" ON cash_withdrawals;
CREATE POLICY "withdrawals_insert" ON cash_withdrawals
  FOR INSERT WITH CHECK (fn_user_role() IN ('super_admin','admin','manager','cashier'));

DROP POLICY IF EXISTS "withdrawals_update" ON cash_withdrawals;
CREATE POLICY "withdrawals_update" ON cash_withdrawals
  FOR UPDATE USING (fn_user_role() IN ('super_admin','admin'));

-- sale_reversals
DROP POLICY IF EXISTS "reversals_select" ON sale_reversals;
CREATE POLICY "reversals_select" ON sale_reversals
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "reversals_insert" ON sale_reversals;
CREATE POLICY "reversals_insert" ON sale_reversals
  FOR INSERT WITH CHECK (fn_user_role() IN ('super_admin','admin','manager'));

-- cash_audit_log: solo lectura para admin/accountant; nadie puede modificar
DROP POLICY IF EXISTS "audit_log_select" ON cash_audit_log;
CREATE POLICY "audit_log_select" ON cash_audit_log
  FOR SELECT USING (fn_user_role() IN ('super_admin','admin','accountant','manager'));

-- ─── 12. ESTRATEGIA DE MIGRACIÓN DESDE localStorage ──────────────────────────
-- Las sesiones históricas de localStorage se pueden importar via la función
-- rpc_migrate_localstorage_session(), llamada desde el cliente en la primera
-- carga si no existen sesiones en Supabase para el dispositivo.

CREATE OR REPLACE FUNCTION rpc_migrate_localstorage_session(
  p_date_key        DATE,
  p_opening_amount  NUMERIC,
  p_opening_at      TIMESTAMPTZ,
  p_closing_amount  NUMERIC,
  p_closing_at      TIMESTAMPTZ,
  p_status          TEXT,
  p_notes           TEXT,
  p_opened_by_name  TEXT,
  p_movements       JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_session_num TEXT;
  v_session_id  UUID;
  v_mov         JSONB;
  v_expected    NUMERIC;
BEGIN
  -- Solo migrar si no existe ya sesión para esa fecha
  IF EXISTS (SELECT 1 FROM cash_sessions WHERE date_key = p_date_key AND pos_id = 'main') THEN
    RETURN NULL;
  END IF;

  SELECT 'CAJA-' || TO_CHAR(p_date_key, 'YYYYMMDD') || '-001' INTO v_session_num;

  INSERT INTO cash_sessions(
    session_number, pos_id, opened_by, opened_by_name, opened_at,
    opening_amount, closed_by, closed_by_name, closed_at,
    closing_amount, expected_amount, difference_amount,
    status, notes, date_key
  )
  VALUES (
    v_session_num, 'main', auth.uid(), p_opened_by_name, p_opening_at,
    p_opening_amount, auth.uid(), p_opened_by_name, p_closing_at,
    p_closing_amount,
    p_closing_amount,
    CASE WHEN p_closing_amount IS NOT NULL THEN p_closing_amount - p_closing_amount ELSE NULL END,
    p_status::cash_session_status, COALESCE(p_notes, 'Migrado desde localStorage'), p_date_key
  )
  RETURNING id INTO v_session_id;

  -- Migrar movimientos si se proveen
  FOR v_mov IN SELECT * FROM jsonb_array_elements(p_movements)
  LOOP
    INSERT INTO cash_movements(session_id, movement_type, amount, description, created_by, created_by_name, created_at)
    VALUES (
      v_session_id,
      (v_mov->>'movement_type')::cash_movement_type,
      (v_mov->>'amount')::NUMERIC,
      COALESCE(v_mov->>'description', 'Migrado'),
      auth.uid(), p_opened_by_name,
      COALESCE((v_mov->>'created_at')::TIMESTAMPTZ, NOW())
    );
  END LOOP;

  RETURN v_session_id;
END;
$$;
