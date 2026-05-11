import { useState } from 'react';
import { useSales } from '@/hooks/useSales';
import { useExpenses } from '@/hooks/useExpenses';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useCashRegisterSummary } from '@/hooks/useCashRegisterSummary';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CashRegisterSession, AccountingRecord } from '@/types';
import { toast } from 'sonner';
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
  const { sales, paymentMethods, getSalesByDate, advisors } = useSales();
  const { addExpense, getExpensesByDate } = useExpenses();
  const { banks, updateBankBalance } = useSettings();

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
    const difference = closing - expectedCash;
    setCashSessions(cashSessions.map(s => s.id === currentSession.id
      ? { ...s, openingAmount: opening, closingAmount: closing, difference, notes }
      : s
    ));
    toast.success('Sesión de caja actualizada');
    setIsEditSessionDialog(false);
  };

  const handleReopenSession = () => {
    if (!currentSession) return;
    if (!confirm('¿Estás seguro de reabrir esta caja? Se podrán registrar nuevos egresos.')) return;
    setCashSessions(cashSessions.map(s => s.id === currentSession.id
      ? { ...s, status: 'open', closingAmount: undefined, closingTime: undefined, difference: undefined, notes: undefined }
      : s
    ));
    setIsEditSessionDialog(false);
    toast.success('Caja reabierta correctamente');
  };

  return (
    <ScrollArea className="h-screen p-6">
      <CashRegisterHeader selectedDate={selectedDate} onDateChange={setSelectedDate} />

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
    </ScrollArea>
  );
}
