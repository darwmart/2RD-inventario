import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { repositories } from '@/infrastructure/container';
import type { PaymentMethod } from '@/types/shared';

export const paymentMethodKeys = { all: ['paymentMethods'] as const };

export function usePaymentMethods() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: paymentMethodKeys.all,
    queryFn: () => repositories.paymentMethods.findAll(),
  });

  const addMutation = useMutation({
    mutationFn: (data: Omit<PaymentMethod, 'id'>) =>
      repositories.paymentMethods.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: paymentMethodKeys.all });
      toast.success('Método de pago creado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PaymentMethod> }) =>
      repositories.paymentMethods.update(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: paymentMethodKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repositories.paymentMethods.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: paymentMethodKeys.all });
      toast.success('Método de pago eliminado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    paymentMethods: query.data ?? [],
    isLoading: query.isLoading,
    addPaymentMethod: addMutation.mutate,
    updatePaymentMethod: (id: string, updates: Partial<PaymentMethod>) =>
      updateMutation.mutate({ id, updates }),
    deletePaymentMethod: deleteMutation.mutate,
  };
}
