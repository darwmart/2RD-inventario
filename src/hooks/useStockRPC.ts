import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface StockItem {
  product_id: string;
  quantity: number;
  product_name: string;
}

interface StockError {
  product_name: string;
  available: number;
  requested: number;
  error: string;
}

// ─── Descontar stock al confirmar venta ───────────────────────
export function useDeductStock() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      saleId,
      saleNumber,
      items,
    }: {
      saleId: string;
      saleNumber: string;
      items: StockItem[];
    }) => {
      if (!supabase) {
        // Modo localStorage: actualizar stock localmente (legado)
        return { success: true, movements: [] };
      }

      const { data, error } = await supabase.rpc('deduct_stock', {
        p_sale_id: saleId,
        p_sale_number: saleNumber,
        p_items: items,
        p_actor_id: user?.id ?? null,
        p_actor_name: user?.name ?? 'system',
      });

      if (error) {
        // Parsear errores de stock insuficiente
        if (error.message.includes('STOCK_ERROR')) {
          const raw = error.message.replace('STOCK_ERROR: ', '');
          try {
            const errors: StockError[] = JSON.parse(raw);
            const msg = errors.map(e =>
              `${e.product_name}: disponible ${e.available}, solicitado ${e.requested}`
            ).join('\n');
            throw new Error(`Stock insuficiente:\n${msg}`);
          } catch {
            throw new Error(error.message);
          }
        }
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: Error) => {
      toast.error(error.message, { duration: 6000 });
    },
  });
}

// ─── Reintegrar stock en devoluciones ────────────────────────
export function useReintegrateStock() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      returnId,
      returnNumber,
      items,
    }: {
      returnId: string;
      returnNumber: string;
      items: StockItem[];
    }) => {
      if (!supabase) return { success: true };

      const { data, error } = await supabase.rpc('reintegrate_stock', {
        p_return_id: returnId,
        p_return_number: returnNumber,
        p_items: items,
        p_actor_id: user?.id ?? null,
        p_actor_name: user?.name ?? 'system',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: Error) => {
      toast.error(`Error reintegrando stock: ${error.message}`);
    },
  });
}

// ─── Ajuste manual de stock (solo admin) ─────────────────────
export function useAdjustStock() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      productId,
      newStock,
      reason,
    }: {
      productId: string;
      newStock: number;
      reason: string;
    }) => {
      if (!supabase) return { success: true };

      const { data, error } = await supabase.rpc('adjust_stock', {
        p_product_id: productId,
        p_new_stock: newStock,
        p_reason: reason,
        p_actor_id: user?.id ?? null,
        p_actor_name: user?.name ?? 'system',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Stock ajustado: ${data.stock_before} → ${data.stock_after}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ─── Historial de movimientos de un producto ─────────────────
export function useStockMovements(productId: string) {
  return {
    queryKey: ['stock_movements', productId],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  };
}
