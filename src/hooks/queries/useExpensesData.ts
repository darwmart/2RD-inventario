import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { expenseService } from '@/infrastructure/container';
import type { CreateExpenseInput } from '@/services/expenseService';

export const expenseKeys = { all: ['expenses'] as const };

const toDateKey = (d: Date | string): string => {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export function useExpensesData() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: expenseKeys.all,
    queryFn: () => expenseService.getAll(),
  });

  const addMutation = useMutation({
    mutationFn: (data: CreateExpenseInput) => expenseService.add(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: expenseKeys.all }),
    onError: (e: Error) => toast.error(e.message),
  });

  const expenses = query.data ?? [];

  return {
    expenses,
    isLoading: query.isLoading,
    addExpense: addMutation.mutate,

    // Derivados síncronos sobre datos ya cargados
    getExpensesByDate: (dateKey: string) =>
      expenses.filter(e => toDateKey(e.createdAt) === dateKey),
    getExpensesByAdvisorId: (advisorId: string) =>
      expenses.filter(e => e.advisorId === advisorId),
    getExpensesByAdvisorName: (name: string) =>
      expenses.filter(e => e.advisor === name),
  };
}
