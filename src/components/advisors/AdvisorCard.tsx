import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Mail, Phone } from 'lucide-react';
import { Advisor } from '@/types';

export interface AdvisorStats {
  totalSales: number;
  totalRevenue: number;
  monthlySales: number;
  monthlyRevenue: number;
  loansThisMonth: number;
  totalDebt: number;
}

interface Props {
  advisor: Advisor;
  stats: AdvisorStats;
}

export default function AdvisorCard({ advisor, stats }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
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
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
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
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="font-bold text-lg text-blue-600">{stats.loansThisMonth}</div>
            <div className="text-xs text-gray-600">Préstamos del Mes</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="font-bold text-lg text-red-600">${stats.totalDebt.toLocaleString('es-CO')}</div>
            <div className="text-xs text-gray-600">Deuda Total</div>
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
              <div className="font-bold text-blue-600">${stats.monthlyRevenue.toLocaleString('es-CO')}</div>
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
