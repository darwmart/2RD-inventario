import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sale } from '@/types';

interface Props {
  sales: Sale[];
}

export default function RecentSalesWidget({ sales }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas Recientes</CardTitle>
      </CardHeader>
      <CardContent>
        {sales.length === 0 ? (
          <p className="text-gray-500">No hay ventas hoy</p>
        ) : (
          <div className="space-y-2">
            {sales.slice(-5).reverse().map(sale => (
              <div key={sale.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                <div>
                  <p className="font-medium">{sale.saleNumber}</p>
                  <p className="text-sm text-gray-600">{sale.advisorName} - {sale.paymentMethod.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">${sale.total.toLocaleString('es-CO')}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(sale.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
