-- ============================================================
-- MIGRACIÓN 023: Cambiar update_product_stock a delta-based
--
-- La función anterior recibía p_new_stock (valor absoluto).
-- Ahora recibe p_delta y p_reserved_delta para sumar/restar
-- al stock existente, evitando race conditions y el bug de
-- purchasesService que pasaba valores absolutos como deltas.
-- ============================================================

CREATE OR REPLACE FUNCTION update_product_stock(
  p_product_id     uuid,
  p_delta          integer,
  p_reserved_delta integer default 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE products
  SET
    stock          = GREATEST(0, stock + p_delta),
    reserved_stock = GREATEST(0, COALESCE(reserved_stock, 0) + p_reserved_delta),
    updated_at     = now()
  WHERE id = p_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_product_stock(uuid, integer, integer) TO authenticated;
