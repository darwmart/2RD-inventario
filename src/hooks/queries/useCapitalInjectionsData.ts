import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SupabaseCapitalInjectionRepository } from '@/repositories/supabase/SupabaseCapitalInjectionRepository';
import type { CapitalInjection } from '@/components/cashRegister/CapitalInjectionsCard';

const repo = new SupabaseCapitalInjectionRepository();
const KEYS = { all: ['capitalInjections'] as const };

export function useCapitalInjectionsData() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEYS.all,
    queryFn:  () => repo.findAll(),
  });

  const addMutation = useMutation({
    mutationFn: (data: Omit<CapitalInjection, 'id'>) => repo.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repo.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Inyección eliminada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    capitalInjections: query.data ?? [],
    isLoading:         query.isLoading,
    addInjection:      addMutation.mutate,
    deleteInjection:   deleteMutation.mutate,
  };
}
