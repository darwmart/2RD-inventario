import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SupabaseStockCountRepository } from '@/repositories/supabase/SupabaseStockCountRepository';
import type { StockCountItem } from '@/types';

const repo = new SupabaseStockCountRepository();
const KEYS = { all: ['stockCounts'] as const };

export function useStockCountData() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEYS.all,
    queryFn:  () => repo.findAll(),
  });

  const createMutation = useMutation({
    mutationFn: ({ items, notes }: { items: Omit<StockCountItem, 'difference'>[]; notes?: string }) =>
      repo.create(items, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateItemsMutation = useMutation({
    mutationFn: ({ id, items }: { id: string; items: StockCountItem[] }) =>
      repo.updateItems(id, items),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => repo.complete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Conteo completado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repo.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Conteo eliminado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    stockCounts: query.data ?? [],
    isLoading:   query.isLoading,
    createCount:      (items: Omit<StockCountItem, 'difference'>[], notes?: string) =>
                        createMutation.mutate({ items, notes }),
    updateCountItems: (id: string, items: StockCountItem[]) =>
                        updateItemsMutation.mutate({ id, items }),
    completeCount:    completeMutation.mutate,
    deleteCount:      deleteMutation.mutate,
  };
}
