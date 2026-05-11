import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Users, DollarSign, ShoppingCart } from 'lucide-react';

export interface CommissionTotals {
  salesCount: number;
  totalSales: number;
  totalProfit: number;
  totalCommissions: number;
}

interface Props {
  totals: CommissionTotals;
  commissionRate: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export default function CommissionStatsCards({ totals, commissionRate }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><ShoppingCart className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Ventas del periodo</p>
              <p className="text-2xl font-bold">{totals.salesCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><DollarSign className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Total vendido</p>
              <p className="text-xl font-bold">{fmt(totals.totalSales)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg"><TrendingUp className="h-5 w-5 text-purple-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Utilidad bruta</p>
              <p className="text-xl font-bold">{fmt(totals.totalProfit)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg"><Users className="h-5 w-5 text-orange-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Total comisiones ({commissionRate}%)</p>
              <p className="text-xl font-bold">{fmt(totals.totalCommissions)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
