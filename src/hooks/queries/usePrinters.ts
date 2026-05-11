import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { repositories } from '@/infrastructure/container';
import type { Printer } from '@/types/settings';
import type { CreatePrinterInput } from '@/repositories/interfaces/IPrinterRepository';

export const printerKeys = { all: ['printers'] as const };

export function usePrinters() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: printerKeys.all,
    queryFn: () => repositories.printers.findAll(),
  });

  const addMutation = useMutation({
    mutationFn: (data: CreatePrinterInput) => repositories.printers.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: printerKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Printer> }) =>
      repositories.printers.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: printerKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repositories.printers.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: printerKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => repositories.printers.setDefault(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: printerKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    printers: query.data ?? [],
    isLoading: query.isLoading,
    addPrinter: (data: CreatePrinterInput) => addMutation.mutate(data),
    updatePrinter: (id: string, data: Partial<Printer>) => updateMutation.mutate({ id, data }),
    deletePrinter: deleteMutation.mutate,
    setDefaultPrinter: setDefaultMutation.mutate,
  };
}
