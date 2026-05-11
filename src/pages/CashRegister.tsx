import { useMemo, useState } from 'react';
import { useSales } from '@/hooks/useSales';
import { useExpenses } from '@/hooks/useExpenses';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { CashRegisterSession, AccountingRecord, PaymentMethod } from '@/types';
import { toast } from 'sonner';
import CashSessionCard from '@/components/cashRegister/CashSessionCard';
import EditSessionDialog from '@/components/cashRegister/EditSessionDialog';
import SummaryCards from '@/components/cashRegister/SummaryCards';
import PaymentBreakdownCard from '@/components/cashRegister/PaymentBreakdownCard';
import ExpensesCard from '@/components/cashRegister/ExpensesCard';

export default function CashRegister() {
  const { isAdmin } = useAuth();
  const { sales, paymentMethods, getSalesByDate, advisors } = useSales();
  const { addExpense, getExpensesByDate } = useExpenses();
  const { banks, updateBankBalance } = useSettings();

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [cashSessions, setCashSessions] = useLocalStorage<CashRegisterSession[]>('cashSessions', []);
  const [accountingRecords, setAccountingRecords] = useLocalStorage<AccountingRecord[]>('accountingRecords', []);
  const [isEditSessionDialog, setIsEditSessionDialog] = useState(false);

  const currentSession = cashSessions.find(s => s.date === selectedDate);
  const dailyExpenses = getExpensesByDate(selectedDate);
  const totalExpenses = dailyExpenses.reduce((sum, e) => sum + e.amount, 0);

  const dailySales = useMemo(() =>
    getSalesByDate(selectedDate).filter(s => s.status === 'completed'),
  [selectedDate, getSalesByDate]);

  const depositRecordsOfDay = useMemo(() => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const toKey = (date: Date) => {
      const d = new Date(date);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    const records: { amount: number; method: PaymentMethod }[] = [];
    sales.forEach(sale => {
      if (sale.type !== 'reserved') return;
      if (sale.deposits && sale.deposits.length > 0) {
        sale.deposits.forEach(d => {
          if (toKey(new Date(d.createdAt)) === selectedDate) records.push({ amount: d.amount, method: d.method });
        });
      } else {
        const amount = sale.deposit ?? 0;
        if (amount > 0 && toKey(new Date(sale.createdAt)) === selectedDate) {
          records.push({ amount, method: sale.paymentMethod });
        }
      }
    });
    return records;
  }, [selectedDate, sales]);

  const summary = useMemo(() => {
    let cashSales = 0; let electronicSales = 0; let creditSales = 0; let totalSales = 0;
    const paymentBreakdown: { [k: string]: { count: number; amount: number } } = {};
    dailySales.forEach(sale => {
      totalSales += sale.total;
      if (!paymentBreakdown[sale.paymentMethod.name]) paymentBreakdown[sale.paymentMethod.name] = { count: 0, amount: 0 };
      paymentBreakdown[sale.paymentMethod.name].count++;
      paymentBreakdown[sale.paymentMethod.name].amount += sale.total;
      if (sale.paymentMethod.type === 'cash') cashSales += sale.total;
      else if (sale.paymentMethod.type === 'electronic') electronicSales += sale.total;
      else if (sale.paymentMethod.type === 'credit') creditSales += sale.total;
    });
    return { cashSales, electronicSales, creditSales, totalSales, totalTransactions: dailySales.length, paymentBreakdown };
  }, [dailySales]);

  const depositSummary = useMemo(() => {
    let depositCash = 0; let depositElectronic = 0; let depositCredit = 0; let totalDeposits = 0;
    const depositBreakdown: { [k: string]: { count: number; amount: number } } = {};
    depositRecordsOfDay.forEach(rec => {
      const { amount, method } = rec;
      totalDeposits += amount;
      if (!depositBreakdown[method.name]) depositBreakdown[method.name] = { count: 0, amount: 0 };
      depositBreakdown[method.name].count++;
      depositBreakdown[method.name].amount += amount;
      if (method.type === 'cash') depositCash += amount;
      else if (method.type === 'electronic') depositElectronic += amount;
      else if (method.type === 'credit') depositCredit += amount;
    });
    return { depositCash, depositElectronic, depositCredit, totalDeposits, totalTransactions: depositRecordsOfDay.length, depositBreakdown };
  }, [depositRecordsOfDay]);

  const totalsWithDeposits = useMemo(() => ({
    total: summary.totalSales + depositSummary.totalDeposits,
    cash: summary.cashSales + depositSummary.depositCash,
    electronic: summary.electronicSales + depositSummary.depositElectronic,
    credit: summary.creditSales + depositSummary.depositCredit,
  }), [summary, depositSummary]);

  const dailyTransfers = useMemo(() => {
    const toKey = (iso: string) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    return accountingRecords
      .filter(r => r.tipo === 'traspaso' && toKey(r.fecha) === selectedDate)
      .reduce((sum, r) => sum + r.monto, 0);
  }, [accountingRecords, selectedDate]);

  const estimatedCloseCash = useMemo(() => {
    const opening = currentSession?.openingAmount ?? 0;
    return opening + totalsWithDeposits.cash - totalExpenses - dailyTransfers;
  }, [currentSession, totalsWithDeposits, totalExpenses, dailyTransfers]);

  // expectedCash = same formula but computed directly from filtered arrays (used for session close/edit dialogs)
  const expectedCash = useMemo(() => {
    const initial = currentSession?.openingAmount || 0;
    const cashSaleAmt = dailySales.filter(s => s.paymentMethod.type === 'cash').reduce((sum, s) => sum + s.total, 0);
    const cashDepAmt = depositRecordsOfDay.filter(r => r.method.type === 'cash').reduce((sum, r) => sum + r.amount, 0);
    return initial + cashSaleAmt + cashDepAmt - totalExpenses - dailyTransfers;
  }, [currentSession, dailySales, depositRecordsOfDay, totalExpenses, dailyTransfers]);

  const handleOpenCashRegister = (amount: number) => {
    const cajaFuerte = banks.find(b => b.id === 'caja-principal');
    if (amount > (cajaFuerte?.balance ?? 0)) {
      toast.error(`Saldo insuficiente en Caja Fuerte. Disponible: $${(cajaFuerte?.balance ?? 0).toLocaleString('es-CO')}`);
      return;
    }
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Arqueo de Caja</h1>
          <p className="mt-2 text-gray-600">Resumen diario de ventas y métodos de pago</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-auto" />
        </div>
      </div>

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
