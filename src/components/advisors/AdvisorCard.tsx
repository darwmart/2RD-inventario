import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Mail, Phone, DollarSign, History } from 'lucide-react';
import { Advisor } from '@/types';

export interface AdvisorStats {
  totalSales: number;
  totalRevenue: number;
  monthlySales: number;
  monthlyRevenue: number;
  loansThisMonth: number;
  totalDebt: number;
  pendingLoanBalance: number;
  salariesPaid: number;
}

interface Props {
  advisor: Advisor;
  stats: AdvisorStats;
  onPaySalary: (advisor: Advisor) => void;
  onViewHistory: (advisor: Advisor) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export default function AdvisorCard({ advisor, stats, onPaySalary, onViewHistory }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{advisor.name}</CardTitle>
              <Badge variant={advisor.isActive ? 'default' : 'secondary'}>
                {advisor.isActive ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" onClick={() => onPaySalary(advisor)} className="bg-green-600 hover:bg-green-700">
              <DollarSign className="h-4 w-4 mr-1" />Pagar
            </Button>
            <Button size="sm" variant="outline" onClick={() => onViewHistory(advisor)} title="Historial de nóminas">
              <History className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1">
          {advisor.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="h-4 w-4" />{advisor.email}
            </div>
          )}
          {advisor.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-4 w-4" />{advisor.phone}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-red-50 rounded border border-red-100">
            <div className="font-bold text-base text-red-600">{fmt(stats.pendingLoanBalance)}</div>
            <div className="text-xs text-gray-600">Deuda pendiente</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded border border-green-100">
            <div className="font-bold text-base text-green-600">{stats.salariesPaid}</div>
            <div className="text-xs text-gray-600">Nóminas pagadas</div>
          </div>
        </div>

        <div className="border-t pt-3">
          <div className="text-xs text-gray-600 mb-2">Este Mes</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="font-bold text-blue-600">{stats.monthlySales}</div>
              <div className="text-xs text-gray-600">Ventas</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="font-bold text-blue-600 text-sm">{fmt(stats.monthlyRevenue)}</div>
              <div className="text-xs text-gray-600">Ingresos</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 border-t pt-2">
          Registrado: {new Date(advisor.createdAt).toLocaleDateString('es-CO')}
        </div>
      </CardContent>
    </Card>
  );
}
