import { useState } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import { useSalesData } from '@/hooks/queries/useSalesData';
import { useAdvisors } from '@/hooks/queries/useAdvisors';
import { usePaymentMethods } from '@/hooks/queries/usePaymentMethods';
import { useExpensesData } from '@/hooks/queries/useExpensesData';
import { useBankSettings } from '@/hooks/queries/useBankSettings';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CashRegisterSession } from '@/types';
import { toast } from 'sonner';
import { printReport } from '@/utils/reportPrint';
import { supabase } from '@/lib/supabase';

import {
  useActiveSession,
  useSessionsByDate,
  useCashMovements,
  useCashSessionMutations,
} from '@/hooks/queries/useCashSession';
import { useCashRegisterSummary } from '@/hooks/useCashRegisterSummary';

import { AlertTriangle } from 'lucide-react';
import CashRegisterHeader from '@/components/cashRegister/CashRegisterHeader';
import CashSessionCard from '@/components/cashRegister/CashSessionCard';
import EditSessionDialog from '@/components/cashRegister/EditSessionDialog';
import SummaryCards from '@/components/cashRegister/SummaryCards';
import PaymentBreakdownCard from '@/components/cashRegister/PaymentBreakdownCard';
import ExpensesCard from '@/components/cashRegister/ExpensesCard';
import CreditPaymentsCard from '@/components/cashRegister/CreditPaymentsCard';
import ReopenSessionDialog from '@/components/cashRegister/ReopenSessionDialog';

import type { CashSession } from '@/types/cashRegister';

const toDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Adapta CashSession (Supabase) → CashRegisterSession (formato UI existente)
function toLegacySession(s: CashSession): CashRegisterSession {
  return {
    id: s.id,
    date: s.dateKey,
    openingAmount: s.openingAmount,
    openingTime: s.openedAt,
    closingAmount: s.closingAmount ?? undefined,
    closingTime: s.closedAt ?? undefined,
    status: (s.status === 'OPEN' || s.status === 'REOPENED') ? 'open' : 'closed',
    difference: s.differenceAmount ?? undefined,
    notes: s.notes ?? undefined,
  };
}

export default function CashRegister() {
  const { isAdmin, user } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const userName = (user as any)?.user_metadata?.full_name ?? user?.email ?? 'Usuario';

  const { sales, getSalesByDate } = useSalesData();
  const { advisors } = useAdvisors();
  const { paymentMethods } = usePaymentMethods();
  const { addExpense, deleteExpense, getExpensesByDate } = useExpensesData();
  const { banks, updateBankBalance } = useBankSettings();

  const [selectedDate, setSelectedDate] = useState(() => toDateKey());
  const [isEditSessionDialog, setIsEditSessionDialog] = useState(false);
  const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false);

  // ── Datos Supabase ─────────────────────────────────────────────────────────
  const { data: activeSession } = useActiveSession();
  const { data: dateSessions = [] } = useSessionsByDate(selectedDate);

  // Sesión del día seleccionado: prioriza dateSessions (ya filtrados por fecha).
  // activeSession solo se usa como fallback si coincide con selectedDate
  // (evita que la sesión activa de hoy aparezca en días anteriores).
  const currentSupabase: CashSession | null =
    dateSessions.find(s => s.dateKey === selectedDate)
    ?? (activeSession?.dateKey === selectedDate ? activeSession : null)
    ?? null;

  const { data: movements = [] } = useCashMovements(currentSupabase?.id);

  const { openSession, closeSession, reopenSession, addMovement } = useCashSessionMutations();

  // Adaptar al formato legacy para los componentes UI existentes
  const currentSession: CashRegisterSession | undefined =
    currentSupabase ? toLegacySession(currentSupabase) : undefined;

  // ── Derivados desde movimientos ────────────────────────────────────────────
  const dailyTransfers = movements
    .filter(m => m.movementType === 'SAFE_TRANSFER')
    .reduce((sum, m) => sum + Math.abs(m.amount), 0);

  // IDs de movimientos de crédito que ya tienen un REVERSAL asociado
  const reversedCreditIds = new Set(
    movements
      .filter(m => m.movementType === 'REVERSAL' && m.referenceTable === 'cash_movements')
      .map(m => m.referenceId)
      .filter(Boolean) as string[]
  );

  const dailyCreditMovements = movements.filter(m => m.movementType === 'CREDIT_PAYMENT');
  // Solo los no anulados suman al total
  const totalCreditPayments = dailyCreditMovements
    .filter(m => !reversedCreditIds.has(m.id))
    .reduce((sum, m) => sum + m.amount, 0);

  // Egresos (siguen en tabla expenses de Supabase)
  const dailyExpenses = getExpensesByDate(selectedDate);
  const totalExpenses = dailyExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Sesión activa de otro día (huérfana — bloquea apertura de caja nueva)
  const orphanSession: CashSession | null =
    activeSession && activeSession.dateKey !== selectedDate ? activeSession : null;

  // ── Resumen de ventas (sin cambios — viene de sales) ──────────────────────
  const { dailySales, summary, depositSummary, totalsWithDeposits, estimatedCloseCash, expectedCash } =
    useCashRegisterSummary(
      sales, selectedDate, [], currentSession, totalExpenses,
      getSalesByDate, totalCreditPayments, dailyTransfers
    );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleOpenCashRegister = (amount: number) => {
    openSession.mutate({ openingAmount: amount, openedByName: userName });
    updateBankBalance('caja-principal', -amount);
    toast.success(`Caja abierta con $${amount.toLocaleString('es-CO')}`);
  };

  const handleCloseCashRegister = (amount: number, notes: string) => {
    if (!currentSupabase || currentSupabase.status === 'CLOSED') {
      toast.error('No hay una caja abierta para cerrar'); return;
    }
    closeSession.mutate({
      sessionId: currentSupabase.id,
      closingAmount: amount,
      closedByName: userName,
      notes,
    });
  };

  const handleTransferCash = (amount: number, description: string) => {
    if (!currentSupabase || currentSupabase.status === 'CLOSED') {
      toast.error('Debe haber una caja abierta para hacer traspasos'); return;
    }
    addMovement.mutate({
      sessionId: currentSupabase.id,
      movementType: 'SAFE_TRANSFER',
      amount: -amount,
      description: description || 'Traspaso de efectivo a Caja Fuerte',
      createdByName: userName,
    });
    updateBankBalance('caja-principal', amount);
    updateBankBalance('efectivo', -amount);
    toast.success(`Traspaso de $${amount.toLocaleString('es-CO')} a Caja Fuerte realizado`);
  };

  const handleAddCreditPayment = (data: {
    platform: string; paymentMethodId: string; paymentMethodName: string;
    amount: number; description: string;
  }) => {
    if (!currentSupabase) return;
    addMovement.mutate({
      sessionId: currentSupabase.id,
      movementType: 'CREDIT_PAYMENT',
      amount: data.amount,
      description: `${data.platform}${data.paymentMethodName ? ' · ' + data.paymentMethodName : ''}${data.description ? ' — ' + data.description : ''}`,
      createdByName: userName,
      metadata: { platform: data.platform, paymentMethodId: data.paymentMethodId },
    });
    // Actualizar saldo del banco según método de pago
    const pm = paymentMethods.find(p => p.id === data.paymentMethodId);
    if (pm) {
      const bankId = pm.type === 'cash' ? 'efectivo' : pm.bankId;
      if (bankId) updateBankBalance(bankId, data.amount);
    }
  };

  const handleReverseCreditPayment = (movementId: string, amount: number, metadata: Record<string, unknown>) => {
    if (!currentSupabase) return;
    addMovement.mutate({
      sessionId: currentSupabase.id,
      movementType: 'REVERSAL',
      amount: -amount,
      description: 'Anulación de ingreso por abono a crédito',
      createdByName: userName,
      referenceId: movementId,
      referenceTable: 'cash_movements',
    });
    // Revertir el saldo del banco
    const pmId = metadata?.paymentMethodId as string | undefined;
    const pm = paymentMethods.find(p => p.id === pmId);
    if (pm) {
      const bankId = pm.type === 'cash' ? 'efectivo' : pm.bankId;
      if (bankId) updateBankBalance(bankId, -amount);
    }
  };

  // Editar sesión — actualización directa en Supabase (admin)
  const handleSaveEditSession = async (opening: number, closing: number, notes: string) => {
    if (!currentSupabase) return;

    if (currentSupabase.status === 'OPEN' || currentSupabase.status === 'REOPENED') {
      const diff = opening - currentSupabase.openingAmount;
      if (diff !== 0) {
        await supabase.from('cash_sessions').update({ opening_amount: opening }).eq('id', currentSupabase.id);
        updateBankBalance('caja-principal', -diff);
        toast.success('Base de apertura actualizada');
      }
    } else {
      const difference = closing - expectedCash;
      await supabase.from('cash_sessions').update({
        opening_amount: opening,
        closing_amount: closing,
        difference_amount: difference,
        notes,
      }).eq('id', currentSupabase.id);
      toast.success('Sesión de caja actualizada');
    }
    setIsEditSessionDialog(false);
  };

  // El botón "Reabrir" en EditSessionDialog abre el diálogo con motivo obligatorio
  const handleReopenRequest = () => {
    setIsEditSessionDialog(false);
    setIsReopenDialogOpen(true);
  };

  const handleCancelOrphan = async () => {
    if (!orphanSession) return;
    const ok = await confirm({
      description: `¿Cancelar la sesión huérfana ${orphanSession.sessionNumber} del ${orphanSession.dateKey}? Esto permitirá abrir una nueva caja.`,
      confirmLabel: 'Cancelar sesión',
      destructive: true,
    });
    if (!ok) return;
    await supabase.from('cash_sessions').update({
      status: 'CANCELLED',
      notes: 'Cancelada manualmente — sesión huérfana sin cierre',
    }).eq('id', orphanSession.id);
    toast.success('Sesión cancelada. Ya puedes abrir una nueva caja.');
  };

  const handleConfirmReopen = (reason: string) => {
    if (!currentSupabase) return;
    reopenSession.mutate({
      sessionId: currentSupabase.id,
      reason,
      reopenedByName: userName,
    });
    setIsReopenDialogOpen(false);
  };

  // ── Impresión ──────────────────────────────────────────────────────────────

  const handlePrintClosure = () => {
    const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;
    const opening = currentSession?.openingAmount ?? 0;
    const closing = currentSession?.closingAmount;
    const difference = currentSession?.difference;
    const status = currentSession?.status === 'closed' ? 'Cerrada' : currentSession ? 'Abierta' : 'Sin sesión';

    const methodRows = Object.entries(summary.paymentBreakdown).map(([name, { count, amount }]) =>
      `<tr><td>${name}</td><td style="text-align:right">${count}</td><td style="text-align:right">${fmt(amount)}</td></tr>`
    ).join('');

    const expenseRows = dailyExpenses.map(e =>
      `<tr><td>${e.description}</td><td>${e.advisor}</td><td style="text-align:right">${fmt(e.amount)}</td></tr>`
    ).join('');

    const creditRows = dailyCreditMovements.map(m =>
      `<tr><td>${m.description}</td><td style="text-align:right;color:green">${fmt(m.amount)}</td></tr>`
    ).join('');

    const summaryHtml = `
      <div class="summary">
        <div class="scard"><b>${status}</b><span>Estado</span></div>
        <div class="scard"><b>${fmt(opening)}</b><span>Base apertura</span></div>
        <div class="scard"><b>${fmt(summary.totalSales)}</b><span>Total ventas</span></div>
        ${totalCreditPayments > 0 ? `<div class="scard" style="color:green"><b>${fmt(totalCreditPayments)}</b><span>Abonos créditos</span></div>` : ''}
        <div class="scard"><b>${fmt(totalExpenses)}</b><span>Egresos</span></div>
        <div class="scard"><b>${fmt(estimatedCloseCash)}</b><span>Efectivo estimado</span></div>
        ${closing != null ? `<div class="scard"><b>${fmt(closing)}</b><span>Conteo real</span></div>` : ''}
        ${difference != null ? `<div class="scard" style="color:${difference >= 0 ? 'green' : 'red'}"><b>${fmt(Math.abs(difference))}</b><span>Diferencia</span></div>` : ''}
      </div>`;

    const tableHtml = `
      <h3 style="margin:16px 0 6px">Ventas por método de pago</h3>
      <table><thead><tr><th>Método</th><th>Transacciones</th><th>Monto</th></tr></thead>
      <tbody>${methodRows || '<tr><td colspan="3">Sin ventas</td></tr>'}</tbody></table>
      ${dailyCreditMovements.length > 0 ? `
        <h3 style="margin:16px 0 6px;color:green">Ingresos por Abonos a Créditos</h3>
        <table><thead><tr><th>Concepto</th><th>Monto</th></tr></thead>
        <tbody>${creditRows}</tbody></table>
        <p style="text-align:right;font-weight:bold;color:green">Total: ${fmt(totalCreditPayments)}</p>` : ''}
      ${dailyExpenses.length > 0 ? `
        <h3 style="margin:16px 0 6px">Egresos del día</h3>
        <table><thead><tr><th>Descripción</th><th>Asesor</th><th>Monto</th></tr></thead>
        <tbody>${expenseRows}</tbody></table>` : ''}
      ${dailyTransfers > 0 ? `<p style="margin-top:12px"><b>Traspasos a Caja Fuerte:</b> ${fmt(dailyTransfers)}</p>` : ''}
      ${currentSession?.notes ? `<p style="margin-top:8px"><b>Notas:</b> ${currentSession.notes}</p>` : ''}`;

    printReport(`Cierre de Caja — ${selectedDate}`, tableHtml, summaryHtml);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScrollArea className="h-screen p-6">
      <CashRegisterHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onPrintClosure={handlePrintClosure}
      />

      {orphanSession && (
        <div className="mb-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-300 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-amber-800">
            <p className="font-semibold">Existe una sesión de caja abierta de otro día</p>
            <p className="mt-0.5">
              Sesión <strong>{orphanSession.sessionNumber}</strong> del{' '}
              <strong>{orphanSession.dateKey}</strong> abierta por{' '}
              <strong>{orphanSession.openedByName}</strong> — no fue cerrada correctamente.
              Esto impide abrir una nueva caja.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => {
                closeSession.mutate({
                  sessionId: orphanSession.id,
                  closingAmount: orphanSession.openingAmount,
                  closedByName: userName,
                  notes: 'Cierre automático — sesión huérfana',
                });
              }}
              className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 font-medium"
            >
              Cerrar sesión
            </button>
            {isAdmin() && (
              <button
                onClick={handleCancelOrphan}
                className="px-3 py-1.5 text-xs bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200 font-medium"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      <CashSessionCard
        currentSession={currentSession}
        selectedDate={selectedDate}
        expectedCash={expectedCash}
        estimatedCloseCash={estimatedCloseCash}
        dailyTransfers={dailyTransfers}
        isAdmin={isAdmin()}
        banks={banks}
        onOpen={handleOpenCashRegister}
        onClose={handleCloseCashRegister}
        onTransfer={handleTransferCash}
        onEditSession={() => setIsEditSessionDialog(true)}
      />

      <EditSessionDialog
        open={isEditSessionDialog}
        session={currentSession}
        expectedCash={expectedCash}
        onClose={() => setIsEditSessionDialog(false)}
        onSave={handleSaveEditSession}
        onReopen={handleReopenRequest}
      />

      <ReopenSessionDialog
        open={isReopenDialogOpen}
        session={currentSupabase}
        onClose={() => setIsReopenDialogOpen(false)}
        onConfirm={handleConfirmReopen}
        isLoading={reopenSession.isPending}
      />

      <CreditPaymentsCard
        currentSession={currentSession}
        dailyMovements={dailyCreditMovements}
        reversedIds={reversedCreditIds}
        totalPayments={totalCreditPayments}
        creditPlatforms={paymentMethods.filter(m => m.type === 'credit' && m.isActive)}
        paymentMethods={paymentMethods}
        isAdmin={isAdmin()}
        onAdd={handleAddCreditPayment}
        onReverse={handleReverseCreditPayment}
      />

      <SummaryCards
        totalsWithDeposits={totalsWithDeposits}
        summary={summary}
        depositSummary={depositSummary}
        estimatedCloseCash={estimatedCloseCash}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaymentBreakdownCard
          paymentMethods={paymentMethods}
          summary={summary}
          depositSummary={depositSummary}
        />
        <ExpensesCard
          currentSession={currentSession}
          advisors={advisors}
          dailyExpenses={dailyExpenses}
          totalExpenses={totalExpenses}
          isAdmin={isAdmin()}
          onAddExpense={(advisorId, advisorName, type, amount, description) =>
            addExpense({ advisorId, advisorName, type, amount, description })
          }
          onDeleteExpense={deleteExpense}
        />
      </div>

      {ConfirmDialog}
    </ScrollArea>
  );
}
