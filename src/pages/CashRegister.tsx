import { useState } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import { useSalesData } from '@/hooks/queries/useSalesData';
import { useAdvisors } from '@/hooks/queries/useAdvisors';
import { usePaymentMethods } from '@/hooks/queries/usePaymentMethods';
import { useExpenses } from '@/hooks/useExpenses';
import { useBankSettings } from '@/hooks/queries/useBankSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useCashRegisterSummary } from '@/hooks/useCashRegisterSummary';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CashRegisterSession, AccountingRecord } from '@/types';
import { toast } from 'sonner';
import { printReport } from '@/utils/reportPrint';
import CashRegisterHeader from '@/components/cashRegister/CashRegisterHeader';
import CashSessionCard from '@/components/cashRegister/CashSessionCard';
import EditSessionDialog from '@/components/cashRegister/EditSessionDialog';
import SummaryCards from '@/components/cashRegister/SummaryCards';
import PaymentBreakdownCard from '@/components/cashRegister/PaymentBreakdownCard';
import ExpensesCard from '@/components/cashRegister/ExpensesCard';

const toDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function CashRegister() {
  const { isAdmin } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const { sales, getSalesByDate } = useSalesData();
  const { advisors } = useAdvisors();
  const { paymentMethods } = usePaymentMethods();
  const { addExpense, getExpensesByDate } = useExpenses();
  const { banks, updateBankBalance } = useBankSettings();

  const [selectedDate, setSelectedDate] = useState(() => toDateKey());
  const [cashSessions, setCashSessions] = useLocalStorage<CashRegisterSession[]>('cashSessions', []);
  const [accountingRecords, setAccountingRecords] = useLocalStorage<AccountingRecord[]>('accountingRecords', []);
  const [isEditSessionDialog, setIsEditSessionDialog] = useState(false);

  const currentSession = cashSessions.find(s => s.date === selectedDate);
  const dailyExpenses = getExpensesByDate(selectedDate);
  const totalExpenses = dailyExpenses.reduce((sum, e) => sum + e.amount, 0);

  const { dailySales, summary, depositSummary, totalsWithDeposits, dailyTransfers, estimatedCloseCash, expectedCash } =
    useCashRegisterSummary(sales, selectedDate, accountingRecords, currentSession, totalExpenses, getSalesByDate);

  const handleOpenCashRegister = (amount: number) => {
    const newSession: CashRegisterSession = {
      id: crypto.randomUUID(), date: selectedDate,
      openingAmount: amount, openingTime: new Date().toISOString(), status: 'open',
    };
    setCashSessions([...cashSessions, newSession]);
    updateBankBalance('caja-principal', -amount);
    setAccountingRecords([...accountingRecords, {
      id: Date.now(), tipo: 'traspaso',
      descripcion: `Apertura de caja - ${selectedDate}`, monto: amount,
      banco: 'caja-principal', fecha: new Date().toISOString(),
    }]);
    toast.success(`Caja abierta con $${amount.toLocaleString('es-CO')} — debitado de Caja Fuerte`);
  };

  const handleCloseCashRegister = (amount: number, notes: string) => {
    if (!currentSession || currentSession.status === 'closed') { toast.error('No hay una caja abierta para cerrar'); return; }
    const difference = amount - expectedCash;
    setCashSessions(cashSessions.map(s => s.id === currentSession.id
      ? { ...s, closingAmount: amount, closingTime: new Date().toISOString(), status: 'closed', difference, notes }
      : s
    ));
    toast.success(difference === 0
      ? 'Caja cerrada correctamente. Cuadre exacto.'
      : `Caja cerrada. Diferencia: $${Math.abs(difference).toLocaleString('es-CO')} ${difference > 0 ? 'a favor' : 'en contra'}`
    );
  };

  const handleTransferCash = (amount: number, description: string) => {
    if (!currentSession || currentSession.status === 'closed') { toast.error('Debe haber una caja abierta para hacer traspasos'); return; }
    setAccountingRecords([...accountingRecords, {
      id: Date.now(), tipo: 'traspaso',
      descripcion: description || 'Traspaso de efectivo a Caja Fuerte', monto: amount,
      banco: 'efectivo', fecha: new Date().toISOString(),
    }]);
    updateBankBalance('caja-principal', amount);
    updateBankBalance('efectivo', -amount);
    toast.success(`Traspaso de $${amount.toLocaleString('es-CO')} a Caja Fuerte realizado exitosamente`);
  };

  const handleSaveEditSession = (opening: number, closing: number, notes: string) => {
    if (!currentSession) return;

    // Si cambió la base de apertura, ajustar Caja Fuerte por la diferencia
    const openingDiff = opening - currentSession.openingAmount;
    if (openingDiff !== 0) {
      // La apertura debita de Caja Fuerte: si sube la base, debita más; si baja, devuelve
      updateBankBalance('caja-principal', -openingDiff);
    }

    if (currentSession.status === 'open') {
      // Solo actualizar la apertura, no tocar cierre ni diferencia
      setCashSessions(cashSessions.map(s => s.id === currentSession.id
        ? { ...s, openingAmount: opening }
        : s
      ));
      toast.success('Base de apertura actualizada');
    } else {
      const difference = closing - expectedCash;
      setCashSessions(cashSessions.map(s => s.id === currentSession.id
        ? { ...s, openingAmount: opening, closingAmount: closing, difference, notes }
        : s
      ));
      toast.success('Sesión de caja actualizada');
    }
    setIsEditSessionDialog(false);
  };

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

    const summaryHtml = `
      <div class="summary">
        <div class="scard"><b>${status}</b><span>Estado</span></div>
        <div class="scard"><b>${fmt(opening)}</b><span>Base apertura</span></div>
        <div class="scard"><b>${fmt(summary.totalSales)}</b><span>Total ventas</span></div>
        <div class="scard"><b>${fmt(totalExpenses)}</b><span>Egresos</span></div>
        <div class="scard"><b>${fmt(estimatedCloseCash)}</b><span>Efectivo estimado</span></div>
        ${closing != null ? `<div class="scard"><b>${fmt(closing)}</b><span>Conteo real</span></div>` : ''}
        ${difference != null ? `<div class="scard" style="color:${difference >= 0 ? 'green' : 'red'}"><b>${fmt(difference)}</b><span>Diferencia</span></div>` : ''}
      </div>`;

    const tableHtml = `
      <h3 style="margin:16px 0 6px">Ventas por método de pago</h3>
      <table><thead><tr><th>Método</th><th>Transacciones</th><th>Monto</th></tr></thead><tbody>${methodRows || '<tr><td colspan="3">Sin ventas</td></tr>'}</tbody></table>
      ${dailyExpenses.length > 0 ? `<h3 style="margin:16px 0 6px">Egresos del día</h3><table><thead><tr><th>Descripción</th><th>Asesor</th><th>Monto</th></tr></thead><tbody>${expenseRows}</tbody></table>` : ''}
      ${dailyTransfers > 0 ? `<p style="margin-top:12px"><b>Traspasos a Caja Fuerte:</b> ${fmt(dailyTransfers)}</p>` : ''}
      ${currentSession?.notes ? `<p style="margin-top:8px"><b>Notas:</b> ${currentSession.notes}</p>` : ''}`;

    printReport(`Cierre de Caja — ${selectedDate}`, tableHtml, summaryHtml);
  };

  const handleReopenSession = async () => {
    if (!currentSession) return;
    if (!await confirm({ description: '¿Estás seguro de reabrir esta caja? Se podrán registrar nuevos egresos.', confirmLabel: 'Reabrir', destructive: false })) return;
    setCashSessions(cashSessions.map(s => s.id === currentSession.id
      ? { ...s, status: 'open', closingAmount: undefined, closingTime: undefined, difference: undefined, notes: undefined }
      : s
    ));
    setIsEditSessionDialog(false);
    toast.success('Caja reabierta correctamente');
  };

  return (
    <ScrollArea className="h-screen p-6">
      <CashRegisterHeader selectedDate={selectedDate} onDateChange={setSelectedDate} onPrintClosure={handlePrintClosure} />

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
        onReopen={handleReopenSession}
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
          onAddExpense={(advisorId, advisorName, type, amount, description) =>
            addExpense(advisorId, advisorName, type, amount, description)
          }
        />
      </div>

      {ConfirmDialog}
    </ScrollArea>
  );
}
