import { useEffect, useMemo } from 'react';
import { Sale } from '@/types';
import { DepositEntry } from '@/components/sales/SalesTable';
import { useCompanySettings } from '@/hooks/queries/useCompanySettings';
import { costWithIva } from '@/utils/ivaUtils';

const toKey = (d: Date | string) => {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

export function useDailyDeposits(
  sales: Sale[],
  selectedDate: string,
  updateSale: (id: string, data: Partial<Sale>) => void
) {
  const { taxSettings } = useCompanySettings();
  const depositsGroupedForDay = useMemo<DepositEntry[]>(() => {
    const map = new Map<string, DepositEntry>();

    sales.forEach(sale => {
      const saleDescription = (sale.items || []).map(i => i.productName).join(', ');
      const saleTotal = sale.total ?? 0;
      const totalPaidAllTime = (sale.deposits ?? []).reduce((sum, d) => sum + (d.amount ?? 0), 0) || sale.deposit || 0;

      (sale.deposits ?? []).forEach(dep => {
        if (toKey(dep.createdAt) !== selectedDate) return;
        const methodId = dep.method?.id ?? sale.paymentMethod?.id ?? 'unknown';
        const key = `${sale.id}::${methodId}`;
        const existing = map.get(key);
        if (existing) {
          existing.dayDepositSum += dep.amount ?? 0;
        } else {
          map.set(key, {
            key, saleId: sale.id, saleNumber: sale.saleNumber, advisorName: sale.advisorName,
            description: saleDescription, paymentMethodId: methodId,
            paymentMethodName: dep.method?.name ?? sale.paymentMethod?.name ?? '-',
            dayDepositSum: dep.amount ?? 0, totalPaidAllTime, saleTotal, initialDeposit: sale.deposit ?? 0,
          });
        }
      });

      if ((sale.deposits ?? []).length === 0 && (sale.deposit ?? 0) > 0 && toKey(sale.createdAt) === selectedDate) {
        const methodId = sale.paymentMethod?.id ?? 'unknown';
        const key = `${sale.id}::${methodId}`;
        const existing = map.get(key);
        if (existing) {
          existing.dayDepositSum += sale.deposit ?? 0;
        } else {
          map.set(key, {
            key, saleId: sale.id, saleNumber: sale.saleNumber, advisorName: sale.advisorName,
            description: saleDescription, paymentMethodId: methodId,
            paymentMethodName: sale.paymentMethod?.name ?? '-',
            dayDepositSum: sale.deposit ?? 0, totalPaidAllTime: sale.deposit ?? 0,
            saleTotal, initialDeposit: sale.deposit ?? 0,
          });
        }
      }
    });

    return Array.from(map.values());
  }, [sales, selectedDate]);

  // Auto-completa ventas totalmente pagadas
  useEffect(() => {
    depositsGroupedForDay.forEach(entry => {
      if ((entry.totalPaidAllTime ?? 0) >= (entry.saleTotal ?? 0)) {
        try { updateSale(entry.saleId, { status: 'completed' }); } catch { /* ignored */ }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositsGroupedForDay]);

  const salesOfDay = useMemo(
    () => sales.filter(s => toKey(s.createdAt) === selectedDate && s.type === 'sale'),
    [sales, selectedDate]
  );

  const dailyTotals = useMemo(() => {
    const salesTotal = salesOfDay.reduce((sum, s) => sum + s.items.reduce((si, i) => si + (i.total ?? 0), 0), 0);
    const costsTotal = salesOfDay.reduce((sum, s) => sum + s.items.reduce((si, i) =>
      si + costWithIva(i.cost ?? 0, i.hasIva, taxSettings) * (i.quantity ?? 0), 0), 0);
    const depositsTotal = depositsGroupedForDay.reduce((sum, e) => sum + (e.dayDepositSum ?? 0), 0);
    const totalVentas = salesTotal + depositsTotal;
    return { totalVentas, totalCostos: costsTotal, utilidad: totalVentas - costsTotal };
  }, [salesOfDay, depositsGroupedForDay, taxSettings]);

  return { depositsGroupedForDay, salesOfDay, dailyTotals };
}
