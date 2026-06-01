import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SupabaseReturnsRepository } from '@/repositories/supabase/SupabaseReturnsRepository';
import type { SaleItem } from '@/types';
import type { PaymentMethod } from '@/types/shared';

const repo = new SupabaseReturnsRepository();
const KEYS = { all: ['returns'] as const };

export function useReturnsData() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEYS.all,
    queryFn:  () => repo.findAll(),
  });

  const addMutation = useMutation({
    mutationFn: (data: {
      saleId: string; saleNumber: string;
      advisorId: string; advisorName: string;
      items: SaleItem[]; reason: string;
      paymentMethod?: PaymentMethod;
    }) => repo.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repo.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Devolución eliminada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const returns = query.data ?? [];

  return {
    returns,
    isLoading: query.isLoading,
    addReturn:    addMutation.mutate,
    deleteReturn: deleteMutation.mutate,
    getReturnsBySale: (saleId: string) => returns.filter(r => r.saleId === saleId),
  };
}
