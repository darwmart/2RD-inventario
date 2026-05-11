import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { bankService } from '@/infrastructure/container';
import type { Bank } from '@/types/settings';

export const bankKeys = { all: ['banks'] as const };

export function useBankSettings() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: bankKeys.all,
    queryFn: () => bankService.getAll(),
  });

  const addMutation = useMutation({
    mutationFn: (data: Omit<Bank, 'id'>) => bankService.add(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bankKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Bank> }) =>
      bankService.update(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: bankKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bankService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: bankKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  const balanceMutation = useMutation({
    mutationFn: ({ id, delta }: { id: string; delta: number }) =>
      bankService.applyDelta(id, delta),
    onSuccess: () => qc.invalidateQueries({ queryKey: bankKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    banks: query.data ?? [],
    isLoading: query.isLoading,
    addBank: addMutation.mutate,
    updateBank: (id: string, updates: Partial<Bank>) => updateMutation.mutate({ id, updates }),
    deleteBank: deleteMutation.mutate,
    updateBankBalance: (id: string, delta: number) => balanceMutation.mutate({ id, delta }),
  };
}
