import { useState, useMemo } from 'react';
import { useSales } from '@/hooks/useSales';
import CommissionFilters, { Period } from '@/components/commissions/CommissionFilters';
import CommissionStatsCards, { CommissionTotals } from '@/components/commissions/CommissionStatsCards';
import CommissionTable, { AdvisorCommission } from '@/components/commissions/CommissionTable';

export default function AdvisorCommissions() {
  const { sales } = useSales();
  const [period, setPeriod] = useState<Period>('month');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [commissionRate, setCommissionRate] = useState(3);

  const toKey = (d: Date | string, p: Period) => {
    const date = new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    if (p === 'day') return `${y}-${m}-${dd}`;
    if (p === 'month') return `${y}-${m}`;
    return `${y}`;
  };

  const periodLabel = (p: Period) => (p === 'year' ? selectedDate.slice(0, 4) : selectedDate);

  const filteredSales = useMemo(() =>
    sales.filter(s =>
      s.type === 'sale' &&
      s.status !== 'cancelled' &&
      toKey(s.createdAt, period) === periodLabel(period)
    ),
  [sales, period, selectedDate]);

  const commissionsByAdvisor = useMemo<AdvisorCommission[]>(() => {
    const map = new Map<string, AdvisorCommission>();
    filteredSales.forEach(sale => {
      const cost = sale.items.reduce((sum, item) => sum + (item.cost || 0) * item.quantity, 0);
      const profit = sale.total - cost;
      if (!map.has(sale.advisorId)) {
        map.set(sale.advisorId, {
          advisorId: sale.advisorId,
          advisorName: sale.advisorName,
          salesCount: 0,
          totalSales: 0,
          totalCost: 0,
          totalProfit: 0,
          commissionAmount: 0,
          byPaymentType: { cash: 0, electronic: 0, credit: 0 },
        });
      }
      const entry = map.get(sale.advisorId)!;
      entry.salesCount += 1;
      entry.totalSales += sale.total;
      entry.totalCost += cost;
      entry.totalProfit += profit;
      entry.commissionAmount = Math.round(entry.totalSales * commissionRate / 100);
      const type = sale.paymentMethod?.type || 'cash';
      if (type === 'cash') entry.byPaymentType.cash += sale.total;
      else if (type === 'electronic') entry.byPaymentType.electronic += sale.total;
      else entry.byPaymentType.credit += sale.total;
    });
    return Array.from(map.values()).sort((a, b) => b.totalSales - a.totalSales);
  }, [filteredSales, commissionRate]);

  const totals = useMemo<CommissionTotals>(() => ({
    salesCount: commissionsByAdvisor.reduce((s, a) => s + a.salesCount, 0),
    totalSales: commissionsByAdvisor.reduce((s, a) => s + a.totalSales, 0),
    totalProfit: commissionsByAdvisor.reduce((s, a) => s + a.totalProfit, 0),
    totalCommissions: commissionsByAdvisor.reduce((s, a) => s + a.commissionAmount, 0),
  }), [commissionsByAdvisor]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Comisiones por Asesor</h1>
        <p className="text-gray-500 mt-1">Resumen de ventas y comisiones calculadas por periodo</p>
      </div>

      <CommissionFilters
        period={period}
        selectedDate={selectedDate}
        commissionRate={commissionRate}
        onPeriodChange={setPeriod}
        onDateChange={setSelectedDate}
        onRateChange={setCommissionRate}
      />

      <CommissionStatsCards totals={totals} commissionRate={commissionRate} />

      <CommissionTable advisors={commissionsByAdvisor} totals={totals} commissionRate={commissionRate} />
    </div>
  );
}
