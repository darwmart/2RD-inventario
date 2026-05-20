import { useMemo } from 'react';
import { Sale, CashRegisterSession, AccountingRecord, PaymentMethod } from '@/types';

const toKey = (d: Date | string): string => {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export function useCashRegisterSummary(
  sales: Sale[],
  selectedDate: string,
  accountingRecords: AccountingRecord[],
  currentSession: CashRegisterSession | undefined,
  totalExpenses: number,
  getSalesByDate: (date: string) => Sale[]
) {
  const dailySales = useMemo(
    () => getSalesByDate(selectedDate).filter(s => s.status === 'completed'),
    [selectedDate, getSalesByDate]
  );

  const depositRecordsOfDay = useMemo(() => {
    const records: { amount: number; method: PaymentMethod }[] = [];
    sales.forEach(sale => {
      if (sale.type !== 'reserved') return;
      if (sale.deposits && sale.deposits.length > 0) {
        sale.deposits.forEach(d => {
          if (toKey(new Date(d.createdAt)) === selectedDate) records.push({ amount: d.amount, method: d.method });
        });
      } else {
        const amount = sale.deposit ?? 0;
        if (amount > 0 && toKey(new Date(sale.createdAt)) === selectedDate)
          records.push({ amount, method: sale.paymentMethod });
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
    depositRecordsOfDay.forEach(({ amount, method }) => {
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

  const dailyTransfers = useMemo(() =>
    accountingRecords
      .filter(r => r.tipo === 'traspaso' && r.banco !== 'caja-principal' && toKey(r.fecha) === selectedDate)
      .reduce((sum, r) => sum + r.monto, 0),
  [accountingRecords, selectedDate]);

  const estimatedCloseCash = useMemo(() => {
    const opening = currentSession?.openingAmount ?? 0;
    return opening + totalsWithDeposits.cash - totalExpenses - dailyTransfers;
  }, [currentSession, totalsWithDeposits, totalExpenses, dailyTransfers]);

  const expectedCash = useMemo(() => {
    const initial = currentSession?.openingAmount || 0;
    const cashSaleAmt = dailySales.filter(s => s.paymentMethod.type === 'cash').reduce((sum, s) => sum + s.total, 0);
    const cashDepAmt = depositRecordsOfDay.filter(r => r.method.type === 'cash').reduce((sum, r) => sum + r.amount, 0);
    return initial + cashSaleAmt + cashDepAmt - totalExpenses - dailyTransfers;
  }, [currentSession, dailySales, depositRecordsOfDay, totalExpenses, dailyTransfers]);

  return { dailySales, depositRecordsOfDay, summary, depositSummary, totalsWithDeposits, dailyTransfers, estimatedCloseCash, expectedCash };
}
