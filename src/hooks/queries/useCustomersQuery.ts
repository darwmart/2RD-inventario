import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { customerService } from '@/infrastructure/container';
import type { Customer } from '@/types/customer';
import type { CreateCustomerInput } from '@/services/customerService';

export const customerKeys = { all: ['customers'] as const };

export function useCustomersQuery() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: customerKeys.all,
    queryFn: () => customerService.getAll(),
  });

  const addMutation = useMutation({
    mutationFn: (data: CreateCustomerInput) => customerService.add(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.all });
      toast.success('Cliente creado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Customer> }) =>
      customerService.update(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: customerKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customerService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.all });
      toast.success('Cliente eliminado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const creditMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      customerService.addCreditBalance(id, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: customerKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    customers: query.data ?? [],
    isLoading: query.isLoading,
    addCustomer: addMutation.mutate,
    updateCustomer: (id: string, updates: Partial<Customer>) =>
      updateMutation.mutate({ id, updates }),
    deleteCustomer: deleteMutation.mutate,
    addCreditBalance: (id: string, amount: number) =>
      creditMutation.mutate({ id, amount }),
    findByDocument: (doc: string) =>
      (query.data ?? []).find(c => c.document === doc) ?? null,
  };
}
