import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  SupabaseSalaryRepository,
  SupabaseLoanPaymentRepository,
} from '@/repositories/supabase/SupabaseSalaryLoanRepository';
import type { SalaryPayment, LoanPayment } from '@/types/shared';

const salaryRepo = new SupabaseSalaryRepository();
const loanRepo   = new SupabaseLoanPaymentRepository();

const KEYS = {
  salary: ['salaryPayments'] as const,
  loans:  ['loanPayments']   as const,
};

// ── Salarios ────────────────────────────────────────────────────────────────

export function useSalaryPayments() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEYS.salary,
    queryFn:  () => salaryRepo.findAll(),
  });

  const addMutation = useMutation({
    mutationFn: (data: Omit<SalaryPayment, 'id' | 'createdAt'>) => salaryRepo.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.salary }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => salaryRepo.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.salary }),
    onError: (e: Error) => toast.error(e.message),
  });

  const salaryPayments = query.data ?? [];

  return {
    salaryPayments,
    isLoading: query.isLoading,
    addSalaryPayment: addMutation.mutateAsync,
    deleteSalaryPayment: deleteMutation.mutate,
    getByAdvisor: (id: string) => salaryPayments.filter(p => p.advisorId === id),
    getByPeriod:  (advisorId: string, period: string) =>
      salaryPayments.find(p => p.advisorId === advisorId && p.period === period),
  };
}

// ── Préstamos ────────────────────────────────────────────────────────────────

export function useLoanPayments() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEYS.loans,
    queryFn:  () => loanRepo.findAll(),
  });

  const addMutation = useMutation({
    mutationFn: (data: Omit<LoanPayment, 'id'>) => loanRepo.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.loans }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addManyMutation = useMutation({
    mutationFn: (items: Omit<LoanPayment, 'id'>[]) => loanRepo.createMany(items),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.loans }),
    onError: (e: Error) => toast.error(e.message),
  });

  const loanPayments = query.data ?? [];

  return {
    loanPayments,
    isLoading: query.isLoading,
    addLoanPayment: addMutation.mutateAsync,
    addMany:        (items: Omit<LoanPayment, 'id'>[]) => addManyMutation.mutateAsync(items),
    getTotalPaid:   (loanId: string) =>
      loanPayments.filter(p => p.loanId === loanId).reduce((s, p) => s + p.amount, 0),
    getByAdvisor:   (id: string) => loanPayments.filter(p => p.advisorId === id),
  };
}
