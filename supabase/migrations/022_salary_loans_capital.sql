-- ============================================================
-- MIGRACIÓN 022: Pagos de salario, préstamos e inyecciones de capital
-- Migración desde localStorage a Supabase
-- ============================================================

-- ─── 1. PAGOS DE SALARIO ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS salary_payments (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id            UUID          NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  advisor_name          TEXT          NOT NULL DEFAULT '',
  advisor_document      TEXT,
  period                TEXT          NOT NULL,
  from_date             TEXT          NOT NULL,
  to_date               TEXT          NOT NULL,
  days_worked           INTEGER       NOT NULL DEFAULT 0,
  base_salary_monthly   NUMERIC(14,2) NOT NULL DEFAULT 0,
  base_salary           NUMERIC(14,2) NOT NULL DEFAULT 0,
  commissions           NUMERIC(14,2) NOT NULL DEFAULT 0,
  transport_allowance   NUMERIC(14,2) NOT NULL DEFAULT 0,
  health_deduction      NUMERIC(14,2) NOT NULL DEFAULT 0,
  pension_deduction     NUMERIC(14,2) NOT NULL DEFAULT 0,
  loan_deductions       JSONB         NOT NULL DEFAULT '[]',
  other_deductions      NUMERIC(14,2) NOT NULL DEFAULT 0,
  other_deduction_desc  TEXT          NOT NULL DEFAULT '',
  gross_pay             NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_deductions      NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_pay               NUMERIC(14,2) NOT NULL DEFAULT 0,
  bank_id               TEXT,
  bank_name             TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salary_payments_advisor ON salary_payments(advisor_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_period  ON salary_payments(period);

ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "salary_payments_select" ON salary_payments;
CREATE POLICY "salary_payments_select" ON salary_payments
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "salary_payments_insert" ON salary_payments;
CREATE POLICY "salary_payments_insert" ON salary_payments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "salary_payments_delete" ON salary_payments;
CREATE POLICY "salary_payments_delete" ON salary_payments
  FOR DELETE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- ─── 2. PAGOS DE PRÉSTAMOS ───────────────────────────────────

CREATE TABLE IF NOT EXISTS loan_payments (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id           TEXT          NOT NULL,
  advisor_id        UUID          NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  advisor_name      TEXT          NOT NULL DEFAULT '',
  amount            NUMERIC(14,2) NOT NULL,
  salary_payment_id UUID          REFERENCES salary_payments(id) ON DELETE SET NULL,
  date              TEXT          NOT NULL,
  notes             TEXT          NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loan_payments_advisor ON loan_payments(advisor_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan    ON loan_payments(loan_id);

ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loan_payments_select" ON loan_payments;
CREATE POLICY "loan_payments_select" ON loan_payments
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "loan_payments_insert" ON loan_payments;
CREATE POLICY "loan_payments_insert" ON loan_payments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "loan_payments_delete" ON loan_payments;
CREATE POLICY "loan_payments_delete" ON loan_payments
  FOR DELETE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- ─── 3. INYECCIONES DE CAPITAL ───────────────────────────────

CREATE TABLE IF NOT EXISTS capital_injections (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT          NOT NULL,
  type_label  TEXT          NOT NULL,
  bank_id     TEXT          NOT NULL DEFAULT 'efectivo',
  bank_name   TEXT          NOT NULL DEFAULT 'Efectivo',
  amount      NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  detail      TEXT          NOT NULL DEFAULT '',
  fecha       DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capital_injections_fecha ON capital_injections(fecha DESC);

ALTER TABLE capital_injections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "capital_injections_select" ON capital_injections;
CREATE POLICY "capital_injections_select" ON capital_injections
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "capital_injections_insert" ON capital_injections;
CREATE POLICY "capital_injections_insert" ON capital_injections
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin', 'manager')
  );

DROP POLICY IF EXISTS "capital_injections_delete" ON capital_injections;
CREATE POLICY "capital_injections_delete" ON capital_injections
  FOR DELETE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );
