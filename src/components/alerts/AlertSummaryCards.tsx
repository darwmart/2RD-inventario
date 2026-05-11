import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Package, Clock, TrendingDown } from 'lucide-react';

interface Props {
  lowCount: number;
  outCount: number;
  quotesCount: number;
  reservationsCount: number;
}

export default function AlertSummaryCards({ lowCount, outCount, quotesCount, reservationsCount }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-yellow-800">Stock Bajo</CardTitle>
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-800">{lowCount}</div>
          <p className="text-xs text-yellow-600">Productos necesitan reposición</p>
        </CardContent>
      </Card>

      <Card className="border-red-200 bg-red-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-red-800">Sin Stock</CardTitle>
          <Package className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-800">{outCount}</div>
          <p className="text-xs text-red-600">Productos agotados</p>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-800">Cotizaciones</CardTitle>
          <Clock className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-800">{quotesCount}</div>
          <p className="text-xs text-blue-600">Pendientes de conversión</p>
        </CardContent>
      </Card>

      <Card className="border-purple-200 bg-purple-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-purple-800">Separados</CardTitle>
          <TrendingDown className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-800">{reservationsCount}</div>
          <p className="text-xs text-purple-600">Productos reservados</p>
        </CardContent>
      </Card>
    </div>
  );
}
