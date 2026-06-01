-- ============================================================
-- MIGRACIÓN 021: Permitir edición completa de ventas a admin
-- Problema: trg_prevent_sale_tampering solo dejaba editar
-- totales de ventas completadas a super_admin, bloqueando admin.
-- También asegura permisos DELETE/INSERT en sale_items para admin.
-- ============================================================

-- ─── 1. CORREGIR TRIGGER DE PROTECCIÓN DE VENTAS ─────────────
-- Antes: solo super_admin podía modificar totales de ventas completadas
-- Ahora: super_admin Y admin pueden hacerlo

CREATE OR REPLACE FUNCTION prevent_sale_price_tampering()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'completed' AND NEW.status = 'completed' THEN
    IF OLD.total != NEW.total OR OLD.subtotal != NEW.subtotal THEN
      IF current_user_role() NOT IN ('super_admin', 'admin') THEN
        RAISE EXCEPTION 'TAMPER: No se pueden modificar totales de una venta completada';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ─── 2. ASEGURAR PERMISOS EN sale_items PARA ADMIN ───────────
-- Las políticas de 008 ya cubren autenticados en general,
-- pero forzamos explícitamente DELETE e INSERT para admin/manager.

DROP POLICY IF EXISTS "sale_items_delete_privileged" ON sale_items;
CREATE POLICY "sale_items_delete_privileged" ON sale_items
  FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "sale_items_insert_privileged" ON sale_items;
CREATE POLICY "sale_items_insert_privileged" ON sale_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
