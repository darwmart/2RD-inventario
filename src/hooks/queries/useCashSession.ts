import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SupabaseCashSessionRepository } from '@/repositories/supabase/SupabaseCashSessionRepository';
import type {
  OpenSessionInput, CloseSessionInput, ReopenSessionInput,
  AddMovementInput, AddWithdrawalInput,
} from '@/types/cashRegister';

const repo = new SupabaseCashSessionRepository();

export const cashKeys = {
  activeSession:  ['cash', 'active']       as const,
  sessionsByDate: (d: string) => ['cash', 'date', d] as const,
  movements:      (id: string) => ['cash', 'movements', id] as const,
  movementsByDate:(d: string) => ['cash', 'movements-date', d] as const,
  withdrawals:    (id: string) => ['cash', 'withdrawals', id] as const,
  reopenHistory:  (id: string) => ['cash', 'reopen-history', id] as const,
  summary:        (id: string) => ['cash', 'summary', id] as const,
  dailyReport:    (d: string) => ['cash', 'daily-report', d] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export function useActiveSession() {
  return useQuery({
    queryKey: cashKeys.activeSession,
    queryFn:  () => repo.getActiveSession(),
    refetchInterval: 30_000,
  });
}

export function useSessionsByDate(dateKey: string) {
  return useQuery({
    queryKey: cashKeys.sessionsByDate(dateKey),
    queryFn:  () => repo.getSessionsByDate(dateKey),
  });
}

export function useCashMovements(sessionId: string | undefined) {
  return useQuery({
    queryKey: cashKeys.movements(sessionId ?? ''),
    queryFn:  () => repo.getMovementsBySession(sessionId!),
    enabled:  !!sessionId,
  });
}

export function useCashMovementsByDate(dateKey: string) {
  return useQuery({
    queryKey: cashKeys.movementsByDate(dateKey),
    queryFn:  () => repo.getMovementsByDate(dateKey),
  });
}

export function useCashWithdrawals(sessionId: string | undefined) {
  return useQuery({
    queryKey: cashKeys.withdrawals(sessionId ?? ''),
    queryFn:  () => repo.getWithdrawalsBySession(sessionId!),
    enabled:  !!sessionId,
  });
}

export function useCashReopenHistory(sessionId: string | undefined) {
  return useQuery({
    queryKey: cashKeys.reopenHistory(sessionId ?? ''),
    queryFn:  () => repo.getReopenHistory(sessionId!),
    enabled:  !!sessionId,
  });
}

export function useSessionSummary(sessionId: string | undefined) {
  return useQuery({
    queryKey: cashKeys.summary(sessionId ?? ''),
    queryFn:  () => repo.getSessionSummary(sessionId!),
    enabled:  !!sessionId,
    refetchInterval: 15_000,
  });
}

export function useDailyReport(dateKey: string) {
  return useQuery({
    queryKey: cashKeys.dailyReport(dateKey),
    queryFn:  () => repo.getDailyReport(dateKey),
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCashSessionMutations() {
  const qc = useQueryClient();

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['cash'] });
  };

  const openSession = useMutation({
    mutationFn: (input: OpenSessionInput) => repo.openSession(input),
    onSuccess: (session) => {
      invalidateAll();
      toast.success(`Caja ${session.sessionNumber} abierta con $${session.openingAmount.toLocaleString('es-CO')}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeSession = useMutation({
    mutationFn: (input: CloseSessionInput) => repo.closeSession(input),
    onSuccess: (session) => {
      invalidateAll();
      const diff = session.differenceAmount ?? 0;
      if (diff === 0) toast.success('Caja cerrada. Cuadre exacto.');
      else toast.success(
        `Caja cerrada. ${diff > 0 ? 'Sobrante' : 'Faltante'}: $${Math.abs(diff).toLocaleString('es-CO')}`
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reopenSession = useMutation({
    mutationFn: (input: ReopenSessionInput) => repo.reopenSession(input),
    onSuccess: () => {
      invalidateAll();
      toast.success('Caja reabierta. Se mantiene el historial del cierre anterior.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addMovement = useMutation({
    mutationFn: (input: AddMovementInput) => repo.addMovement(input),
    onSuccess: () => invalidateAll(),
    onError: (e: Error) => toast.error(e.message),
  });

  const addWithdrawal = useMutation({
    mutationFn: (input: AddWithdrawalInput) => repo.addWithdrawal(input),
    onSuccess: (w) => {
      invalidateAll();
      toast.success(`Retiro de $${w.amount.toLocaleString('es-CO')} registrado`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reverseWithdrawal = useMutation({
    mutationFn: ({ id, reason, name }: { id: string; reason: string; name: string }) =>
      repo.reverseWithdrawal(id, reason, name),
    onSuccess: () => {
      invalidateAll();
      toast.success('Retiro revertido correctamente');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    openSession,
    closeSession,
    reopenSession,
    addMovement,
    addWithdrawal,
    reverseWithdrawal,
  };
}
