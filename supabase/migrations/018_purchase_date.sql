-- ============================================================
-- MIGRACIÓN 018: Fecha de compra en documentos
-- Agrega document_date para registrar la fecha real del
-- documento, independiente de cuándo se digitó en el sistema.
-- ============================================================

ALTER TABLE purchase_documents
  ADD COLUMN IF NOT EXISTS document_date date;

-- Backfill: los documentos existentes heredan su fecha de creación
UPDATE purchase_documents
  SET document_date = created_at::date
  WHERE document_date IS NULL;

-- Default para nuevas filas
ALTER TABLE purchase_documents
  ALTER COLUMN document_date SET DEFAULT CURRENT_DATE;
