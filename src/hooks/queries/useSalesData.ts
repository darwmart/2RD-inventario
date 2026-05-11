// Hook de ventas — usa la nueva arquitectura (Repository + Service + React Query).
// Reemplaza useSales() en las páginas migradas.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { salesService } from '@/infrastructure/container';
import type { Sale } from '@/types/sale';
import type { PaymentMethod } from '@/types/shared';
import type { CreateSaleInput } from '@/domain/sales';

export const saleKeys = {
  all: ['sales'] as const,
  byDate: (date: string) => ['sales', 'date', date] as const,
  byAdvisor: (id: string) => ['sales', 'advisor', id] as const,
};

export function useSalesData() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: saleKeys.all,
    queryFn: () => salesService.getAllSales(),
  });

  const addMutation = useMutation({
    mutationFn: (data: CreateSaleInput) => salesService.addSale(data),
    onSuccess: (sale) => {
      qc.invalidateQueries({ queryKey: saleKeys.all });
      // Invalida también products porque addSale puede modificar stock
      qc.invalidateQueries({ queryKey: ['products'] });
      const label = sale.type === 'quote' ? 'Cotización' : sale.type === 'reserved' ? 'Separado' : 'Venta';
      toast.success(`${label} creada correctamente`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Sale> }) =>
      salesService.updateSale(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: saleKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => salesService.deleteSale(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: saleKeys.all });
      toast.success('Venta eliminada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const depositMutation = useMutation({
    mutationFn: ({ saleId, amount, method }: { saleId: string; amount: number; method: PaymentMethod }) =>
      salesService.addDeposit(saleId, amount, method),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: saleKeys.all });
      toast.success('Abono registrado correctamente');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const convertMutation = useMutation({
    mutationFn: (saleId: string) => salesService.convertToSale(saleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: saleKeys.all });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Convertido a venta exitosamente');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (saleId: string) => salesService.cancelSale(saleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: saleKeys.all });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Cancelado exitosamente');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sales = query.data ?? [];

  return {
    // Estado
    sales,
    isLoading: query.isLoading,
    isError: query.isError,

    // Mutaciones
    addSale: addMutation.mutate,
    addSaleAsync: addMutation.mutateAsync,
    updateSale: (id: string, updates: Partial<Sale>) =>
      updateMutation.mutate({ id, updates }),
    deleteSale: deleteMutation.mutate,
    addDeposit: (saleId: string, amount: number, method: PaymentMethod) =>
      depositMutation.mutate({ saleId, amount, method }),
    convertToSale: convertMutation.mutate,
    cancelSale: cancelMutation.mutate,

    // Derivados síncronos (filtrados sobre datos ya cargados)
    getSalesByDate: (dateKey: string) => {
      const toKey = (d: Date | string) => {
        const date = new Date(d);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      };
      return sales.filter(s => toKey(s.createdAt) === dateKey);
    },
    getSalesByAdvisor: (advisorId: string) =>
      sales.filter(s => s.advisorId === advisorId),
    getCompletedSales: () =>
      sales.filter(s => s.status === 'completed' && s.type === 'sale'),
  };
}
