import { useInventory } from '@/hooks/useInventory';
import { useSales } from '@/hooks/useSales';
import DashboardStatsCards from '@/components/dashboard/DashboardStatsCards';
import LowStockWidget from '@/components/dashboard/LowStockWidget';
import RecentSalesWidget from '@/components/dashboard/RecentSalesWidget';

export default function Dashboard() {
  const { products, getLowStockProducts } = useInventory();
  const { sales } = useSales();

  const lowStockProducts = getLowStockProducts();
  const todaySales = sales.filter(sale => {
    const today = new Date().toDateString();
    return new Date(sale.createdAt).toDateString() === today && sale.status === 'completed';
  });

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Resumen general de tu negocio</p>
      </div>

      <DashboardStatsCards
        totalProducts={products.length}
        totalStock={products.reduce((sum, p) => sum + p.stock, 0)}
        todaySalesCount={todaySales.length}
        todayRevenue={todaySales.reduce((sum, s) => sum + s.total, 0)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LowStockWidget products={lowStockProducts} />
        <RecentSalesWidget sales={todaySales} />
      </div>
    </div>
  );
}
