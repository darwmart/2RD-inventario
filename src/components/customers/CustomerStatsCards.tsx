import { Card, CardContent } from '@/components/ui/card';
import { User, CreditCard } from 'lucide-react';

interface Props {
  totalCustomers: number;
  activeCustomers: number;
  totalBalance: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export default function CustomerStatsCards({ totalCustomers, activeCustomers, totalBalance }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><User className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Total clientes</p>
              <p className="text-2xl font-bold">{totalCustomers}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><User className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Activos</p>
              <p className="text-2xl font-bold">{activeCustomers}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg"><CreditCard className="h-5 w-5 text-purple-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Saldo a favor total</p>
              <p className="text-2xl font-bold">{fmt(totalBalance)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
