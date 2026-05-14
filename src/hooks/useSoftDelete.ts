import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type SoftDeleteTable =
  | 'products'
  | 'sales'
  | 'customers'
  | 'suppliers'
  | 'purchase_documents'
  | 'categories'
  | 'advisors';

// ─── Hook de soft delete ──────────────────────────────────────
export function useSoftDelete(
  table: SoftDeleteTable,
  queryKey: string[],
) {
  const qc = useQueryClient();

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) {
        // Modo localStorage: no hay soft delete real, usar lógica local
        throw new Error('Soft delete requiere Supabase');
      }
      const { error } = await supabase.rpc('soft_delete_record', {
        p_table: table,
        p_id: id,
      });
      if (error) throw error;
    },
    onMutate: async (id) => {
      // Actualización optimista: ocultar inmediatamente
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData(queryKey);
      qc.setQueryData<{ id: string; deleted_at: string | null }[]>(
        queryKey,
        (old) => old?.filter((item) => item.id !== id),
      );
      return { prev };
    },
    onError: (error: Error, _id, ctx) => {
      qc.setQueryData(queryKey, ctx?.prev);
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success('Registro eliminado');
      qc.invalidateQueries({ queryKey });
    },
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Restaurar requiere Supabase');
      const { error } = await supabase.rpc('restore_record', {
        p_table: table,
        p_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Registro restaurado');
      qc.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    softDelete: (id: string) => softDelete.mutate(id),
    restore: (id: string) => restore.mutate(id),
    isDeleting: softDelete.isPending,
    isRestoring: restore.isPending,
  };
}
