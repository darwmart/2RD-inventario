import { useMemo } from 'react';
import { useProducts, useSalesData } from '@/hooks/queries';
import { useBankSettings } from '@/hooks/queries/useBankSettings';
import { useCompanySettings } from '@/hooks/queries/useCompanySettings';
import { usePurchasesData } from '@/hooks/queries/usePurchasesData';
import { costWithIva } from '@/utils/ivaUtils';
import DashboardStatsCards from '@/components/dashboard/DashboardStatsCards';
import LowStockWidget from '@/components/dashboard/LowStockWidget';
import RecentSalesWidget from '@/components/dashboard/RecentSalesWidget';
import SalesLineChart from '@/components/dashboard/SalesLineChart';
import BankBalancesWidget from '@/components/dashboard/BankBalancesWidget';
import TopProductsWidget from '@/components/dashboard/TopProductsWidget';
import OperationalAlertsWidget from '@/components/dashboard/OperationalAlertsWidget';

export default function Dashboard() {
  const { products, getLowStockProducts } = useProducts();
  const { sales } = useSalesData();
  const { banks } = useBankSettings();
  const { taxSettings } = useCompanySettings();
  const { purchases } = usePurchasesData();

  const lowStockProducts = getLowStockProducts();

  const todaySales = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return sales.filter(s => {
      if (s.status !== 'completed' || s.type !== 'sale') return false;
      const sd = new Date(s.createdAt); sd.setHours(0, 0, 0, 0);
      return sd.getTime() === today.getTime();
    });
  }, [sales]);

  const { todayRevenue, todayUtilidad } = useMemo(() => {
    const revenue = todaySales.reduce((sum, s) => sum + s.total, 0);
    const costo = todaySales.reduce((sum, s) =>
      sum + s.items.reduce((si, it) => si + costWithIva(it.cost, it.hasIva, taxSettings) * it.quantity, 0), 0);
    return { todayRevenue: revenue, todayUtilidad: revenue - costo };
  }, [todaySales, taxSettings]);

  const { ventasMes, ventasMesAnterior } = useMemo(() => {
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMth = now.getMonth();
    const prevYear = thisMth === 0 ? thisYear - 1 : thisYear;
    const prevMth = thisMth === 0 ? 11 : thisMth - 1;

    const completedSales = sales.filter(s => s.status === 'completed' && s.type === 'sale');
    const mes = completedSales
      .filter(s => { const d = new Date(s.createdAt); return d.getFullYear() === thisYear && d.getMonth() === thisMth; })
      .reduce((sum, s) => sum + s.total, 0);
    const ant = completedSales
      .filter(s => { const d = new Date(s.createdAt); return d.getFullYear() === prevYear && d.getMonth() === prevMth; })
      .reduce((sum, s) => sum + s.total, 0);

    return { ventasMes: mes, ventasMesAnterior: ant };
  }, [sales]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-600">Resumen general de tu negocio</p>
      </div>

      <DashboardStatsCards
        totalProducts={products.length}
        totalStock={products.reduce((sum, p) => sum + p.stock, 0)}
        todaySalesCount={todaySales.length}
        todayRevenue={todayRevenue}
        todayUtilidad={todayUtilidad}
        ventasMes={ventasMes}
        ventasMesAnterior={ventasMesAnterior}
      />

      <SalesLineChart sales={sales} taxSettings={taxSettings} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BankBalancesWidget banks={banks} />
        <TopProductsWidget sales={sales} />
        <OperationalAlertsWidget products={products} purchases={purchases} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LowStockWidget products={lowStockProducts} />
        <RecentSalesWidget sales={todaySales} />
      </div>
    </div>
  );
}
