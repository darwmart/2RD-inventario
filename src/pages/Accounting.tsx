import { useMemo, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useSalesData } from '@/hooks/queries/useSalesData';
import { useBankSettings } from '@/hooks/queries/useBankSettings';
import { useCompanySettings } from '@/hooks/queries/useCompanySettings';
import { useExpenses } from '@/hooks/useExpenses';
import { usePurchases } from '@/hooks/usePurchases';
import { AccountingRecord } from '@/types';
import { formatDateToKey } from '@/hooks/useExpenses';
import BankBalancesGrid from '@/components/accounting/BankBalancesGrid';
import AccountingFilters from '@/components/accounting/AccountingFilters';
import PeriodSummaryCards from '@/components/accounting/PeriodSummaryCards';
import MovementsTable, { Movement } from '@/components/accounting/MovementsTable';

export default function Accounting() {
  const { sales } = useSalesData();
  const { banks } = useBankSettings();
  const { cardSettings } = useCompanySettings();
  const { expenses } = useExpenses();
  const { purchases } = usePurchases();
  const [accountingRecords] = useLocalStorage<AccountingRecord[]>('accountingRecords', []);

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterBank, setFilterBank] = useState('all');

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const getBankLabel = (bankId: string) =>
    bankId === 'efectivo' ? 'Efectivo' : (banks.find(b => b.id === bankId)?.name ?? bankId);

  const mapPaymentToBank = (paymentName: string, paymentType: string, bankId?: string): string => {
    if (paymentType === 'cash') return 'efectivo';
    if (bankId && banks.find(b => b.id === bankId && b.isActive)) return bankId;
    const name = paymentName.toLowerCase();
    const matched = banks.find(b => b.isActive && b.id !== 'efectivo' && name.includes(b.name.toLowerCase()));
    if (matched) return matched.id;
    return banks.find(b => b.isActive && b.id !== 'efectivo' && b.id !== 'caja-principal')?.id ?? 'caja-principal';
  };

  const netAmount = (amount: number, paymentName: string, platformCommission?: number): number => {
    const name = paymentName.toLowerCase();
    let net = amount;
    if (platformCommission && platformCommission > 0) {
      net -= amount * platformCommission / 100;
    } else if (cardSettings.commissionsEnabled) {
      if (name.includes('débito')) net -= amount * cardSettings.debitCommission / 100;
      else if (name.includes('crédito')) net -= amount * cardSettings.creditCommission / 100;
    }
    if (cardSettings.reteivaEnabled && (name.includes('débito') || name.includes('crédito')))
      net -= amount * cardSettings.reteiva / 100;
    return Math.round(net);
  };

  const addDays = (date: Date, days: number): Date => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  const getExpectedPaymentDate = (saleDate: Date, pm: { paymentDays?: number; paymentPeriod?: string }): Date | undefined => {
    const days = pm.paymentDays ?? 0;
    if (!pm.paymentPeriod || pm.paymentPeriod === 'immediate')
      return days > 0 ? addDays(saleDate, days) : undefined;
    if (pm.paymentPeriod === 'weekly') {
      const d = new Date(saleDate);
      const endOfWeek = addDays(d, d.getDay() === 0 ? 0 : 7 - d.getDay());
      return addDays(endOfWeek, days);
    }
    if (pm.paymentPeriod === 'monthly') {
      const d = new Date(saleDate);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return addDays(endOfMonth, days);
    }
    return undefined;
  };

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // ─── Movimientos unificados ──────────────────────────────────────────────────
  const allMovements = useMemo((): Movement[] => {
    const list: Movement[] = [];

    sales.filter(s => s.status === 'completed' && s.type === 'sale').forEach(s => {
      const pm = s.paymentMethod;
      const bank = mapPaymentToBank(pm.name, pm.type, pm.bankId);
      const saleDate = new Date(s.createdAt);
      const commission = pm.type === 'credit' ? pm.commission : undefined;
      const gross = s.total;
      const net = netAmount(gross, pm.name, commission);
      const expectedDate = pm.type === 'credit' ? getExpectedPaymentDate(saleDate, pm) : undefined;
      list.push({
        id: `sale-${s.id}`, date: saleDate, type: 'venta',
        description: `Venta #${s.saleNumber ?? ''} — ${s.items.map(i => i.productName).join(', ')}`,
        amount: net, grossAmount: commission ? gross : undefined,
        commissionAmt: commission ? Math.round(gross * commission / 100) : undefined,
        bank, bankLabel: getBankLabel(bank), direction: 'in',
        settled: !expectedDate || expectedDate <= today, expectedDate,
      });
    });

    sales.filter(s => s.type === 'reserved').forEach(s => {
      if (s.deposits && s.deposits.length > 0) {
        s.deposits.forEach(d => {
          const pmName = d.method?.name ?? s.paymentMethod.name;
          const pmType = d.method?.type ?? s.paymentMethod.type;
          const pmBankId = d.method?.bankId ?? s.paymentMethod.bankId;
          const bank = mapPaymentToBank(pmName, pmType, pmBankId);
          list.push({
            id: `deposit-${s.id}-${d.createdAt}`, date: new Date(d.createdAt), type: 'abono',
            description: `Abono separado — ${s.items?.map(i => i.productName).join(', ') ?? ''}`,
            amount: netAmount(d.amount, pmName), bank, bankLabel: getBankLabel(bank),
            direction: 'in', settled: true,
          });
        });
      } else if (s.deposit && s.deposit > 0) {
        const bank = mapPaymentToBank(s.paymentMethod.name, s.paymentMethod.type, s.paymentMethod.bankId);
        list.push({
          id: `deposit-${s.id}`, date: new Date(s.createdAt), type: 'abono',
          description: `Abono separado — ${s.items?.map(i => i.productName).join(', ') ?? ''}`,
          amount: netAmount(s.deposit, s.paymentMethod.name), bank, bankLabel: getBankLabel(bank),
          direction: 'in', settled: true,
        });
      }
    });

    expenses.forEach(e => {
      list.push({
        id: `expense-${e.id}`, date: new Date(e.createdAt), type: 'gasto',
        description: `${e.type === 'prestamo' ? 'Préstamo' : 'Gasto'} — ${e.description} (${e.advisor})`,
        amount: e.amount, bank: 'efectivo', bankLabel: 'Efectivo', direction: 'out', settled: true,
      });
    });

    purchases.filter(p => p.status !== 'cancelled').forEach(p => {
      const isUnpaidCredit = !!(p.paymentDetails?.dueDate && !p.paymentDetails?.bankId
        && !(p.payments && p.payments.length > 0));
      if (isUnpaidCredit) return;

      const supplierLabel = p.supplierName || 'Sin proveedor';
      const docLabel = p.supplierInvoiceNumber ?? p.documentNumber ?? '—';

      if (p.payments && p.payments.length > 0) {
        p.payments.forEach((pay, idx) => {
          list.push({
            id: `purchase-${p.id}-pay${idx}`, date: new Date(pay.date), type: 'compra',
            description: `Compra — ${supplierLabel} | Factura: ${docLabel}`,
            amount: pay.amount, bank: pay.bankId || 'efectivo',
            bankLabel: getBankLabel(pay.bankId || 'efectivo'), direction: 'out', settled: true,
          });
        });
      } else {
        const isPaidCredit = !!(p.paymentDetails?.dueDate && p.paymentDetails?.bankId);
        const explicitBankId = p.paymentDetails?.bankId;
        const isCash = !explicitBankId && (p.paymentDetails?.isCashPayment || p.paymentMethod?.type === 'cash');
        const bank = isCash ? 'efectivo' : (explicitBankId ?? 'efectivo');
        const movDate = isPaidCredit && p.paymentDetails?.paidAt
          ? new Date(p.paymentDetails.paidAt) : new Date(p.createdAt);
        list.push({
          id: `purchase-${p.id}`, date: movDate, type: 'compra',
          description: `Compra — ${supplierLabel} | Factura: ${docLabel}`,
          amount: p.total, bank, bankLabel: getBankLabel(bank), direction: 'out', settled: true,
        });
      }
    });

    accountingRecords.forEach(r => {
      if (r.tipo !== 'traspaso') return;
      if (r.banco === 'caja-principal') {
        list.push({
          id: `apertura-${r.id}`, date: new Date(r.fecha), type: 'apertura',
          description: r.descripcion || 'Apertura de caja',
          amount: r.monto, bank: 'caja-principal', bankLabel: getBankLabel('caja-principal'),
          direction: 'out', settled: true,
        });
      } else {
        list.push({
          id: `transfer-out-${r.id}`, date: new Date(r.fecha), type: 'traspaso',
          description: r.descripcion || 'Traspaso a Caja Fuerte',
          amount: r.monto, bank: 'efectivo', bankLabel: 'Efectivo',
          direction: 'out', settled: true,
        });
        list.push({
          id: `transfer-in-${r.id}`, date: new Date(r.fecha), type: 'traspaso',
          description: r.descripcion || 'Traspaso a Caja Fuerte',
          amount: r.monto, bank: 'caja-principal', bankLabel: getBankLabel('caja-principal'),
          direction: 'in', settled: true,
        });
      }
    });

    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [sales, expenses, purchases, accountingRecords, banks, cardSettings]);

  const filtered = useMemo(() => allMovements.filter(m => {
    const key = formatDateToKey(m.date);
    if (fechaInicio && key < fechaInicio) return false;
    if (fechaFin && key > fechaFin) return false;
    if (filterType !== 'all' && m.type !== filterType) return false;
    if (filterBank !== 'all' && m.bank !== filterBank) return false;
    return true;
  }), [allMovements, fechaInicio, fechaFin, filterType, filterBank]);

  const bankBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    banks.filter(b => b.isActive).forEach(b => { balances[b.id] = 0; });
    allMovements.forEach(m => {
      if (balances[m.bank] === undefined) balances[m.bank] = 0;
      if (m.direction === 'out') balances[m.bank] -= m.amount;
      else if (m.settled) balances[m.bank] += m.amount;
    });
    return balances;
  }, [allMovements, banks]);

  const pendingByBank = useMemo(() => {
    const pending: Record<string, number> = {};
    allMovements.filter(m => m.direction === 'in' && !m.settled).forEach(m => {
      pending[m.bank] = (pending[m.bank] ?? 0) + m.amount;
    });
    return pending;
  }, [allMovements]);

  const summary = useMemo(() => {
    const ventasSettled = filtered.filter(m => m.type === 'venta' && m.settled).reduce((s, m) => s + m.amount, 0);
    const ventasPending = filtered.filter(m => m.type === 'venta' && !m.settled).reduce((s, m) => s + m.amount, 0);
    const abonos        = filtered.filter(m => m.type === 'abono').reduce((s, m) => s + m.amount, 0);
    const gastos        = filtered.filter(m => m.type === 'gasto').reduce((s, m) => s + m.amount, 0);
    const compras       = filtered.filter(m => m.type === 'compra').reduce((s, m) => s + m.amount, 0);
    const traspasos     = filtered.filter(m => m.type === 'traspaso').reduce((s, m) => s + m.amount, 0);
    const comisiones    = filtered.filter(m => m.type === 'venta' && m.commissionAmt).reduce((s, m) => s + (m.commissionAmt ?? 0), 0);
    const ventas = ventasSettled + ventasPending;
    return { ventas, ventasSettled, ventasPending, abonos, gastos, compras, traspasos, comisiones, utilidad: ventas + abonos - gastos - compras };
  }, [filtered]);

  return (
    <ScrollArea className="h-screen p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contabilidad</h1>
          <p className="text-gray-500 mt-1">Todos los movimientos de dinero en un solo lugar</p>
        </div>

        <BankBalancesGrid banks={banks} bankBalances={bankBalances} pendingByBank={pendingByBank} />

        <AccountingFilters
          fechaInicio={fechaInicio} fechaFin={fechaFin}
          filterType={filterType} filterBank={filterBank} banks={banks}
          onFechaInicio={setFechaInicio} onFechaFin={setFechaFin}
          onFilterType={setFilterType} onFilterBank={setFilterBank}
          onClear={() => { setFechaInicio(''); setFechaFin(''); setFilterType('all'); setFilterBank('all'); }}
        />

        <PeriodSummaryCards summary={summary} />

        <MovementsTable movements={filtered} />
      </div>
    </ScrollArea>
  );
}
