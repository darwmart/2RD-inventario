import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { repositories } from '@/infrastructure/container';
import type { LabelDesign } from '@/types/settings';
import type { CreateLabelDesignInput } from '@/repositories/interfaces/ILabelDesignRepository';

export const labelDesignKeys = { all: ['labelDesigns'] as const };

export function useLabelDesigns() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: labelDesignKeys.all,
    queryFn: () => repositories.labelDesigns.findAll(),
    staleTime: 0,
    refetchOnMount: true,
  });

  const addMutation = useMutation({
    mutationFn: (data: CreateLabelDesignInput) => repositories.labelDesigns.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: labelDesignKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LabelDesign> }) =>
      repositories.labelDesigns.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: labelDesignKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repositories.labelDesigns.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: labelDesignKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    labelDesigns: query.data ?? [],
    isLoading: query.isLoading,
    addLabelDesign: (data: CreateLabelDesignInput) => addMutation.mutate(data),
    updateLabelDesign: (id: string, data: Partial<LabelDesign>) => updateMutation.mutate({ id, data }),
    deleteLabelDesign: deleteMutation.mutate,
  };
}
