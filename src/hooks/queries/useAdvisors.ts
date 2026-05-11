import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { repositories } from '@/infrastructure/container';
import type { Advisor } from '@/types/shared';

export const advisorKeys = { all: ['advisors'] as const };

export function useAdvisors() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: advisorKeys.all,
    queryFn: () => repositories.advisors.findAll(),
  });

  const addMutation = useMutation({
    mutationFn: (data: Omit<Advisor, 'id' | 'createdAt'>) =>
      repositories.advisors.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: advisorKeys.all });
      toast.success('Asesor agregado exitosamente');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Advisor> }) =>
      repositories.advisors.update(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: advisorKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repositories.advisors.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: advisorKeys.all });
      toast.success('Asesor eliminado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    advisors: query.data ?? [],
    isLoading: query.isLoading,
    addAdvisor: addMutation.mutate,
    updateAdvisor: (id: string, updates: Partial<Advisor>) =>
      updateMutation.mutate({ id, updates }),
    deleteAdvisor: deleteMutation.mutate,
  };
}
