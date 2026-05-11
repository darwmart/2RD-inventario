import { useProducts, useSalesData } from '@/hooks/queries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import AlertSummaryCards from '@/components/alerts/AlertSummaryCards';
import LowStockList from '@/components/alerts/LowStockList';
import OutOfStockList from '@/components/alerts/OutOfStockList';
import PendingQuotesList from '@/components/alerts/PendingQuotesList';
import PendingReservationsList from '@/components/alerts/PendingReservationsList';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export default function Alerts() {
  const { products, getLowStockProducts } = useProducts();
  const { sales } = useSalesData();

  const lowStockProducts   = getLowStockProducts();
  const outOfStockProducts = products.filter(p => p.stock === 0);
  const pendingQuotes      = sales.filter(s => s.type === 'quote'    && s.status === 'pending');
  const pendingReservations= sales.filter(s => s.type === 'reserved' && s.status === 'pending');
  const oldQuotes          = pendingQuotes.filter(q =>
    Math.floor((Date.now() - new Date(q.createdAt).getTime()) / MS_PER_DAY) > 7
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Centro de Alertas</h1>
        <p className="mt-2 text-gray-600">Mantente informado sobre el estado de tu inventario y ventas</p>
      </div>

      <AlertSummaryCards
        lowCount={lowStockProducts.length}
        outCount={outOfStockProducts.length}
        quotesCount={pendingQuotes.length}
        reservationsCount={pendingReservations.length}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LowStockList products={lowStockProducts} />
        <OutOfStockList products={outOfStockProducts} />
        <PendingQuotesList quotes={pendingQuotes} />
        <PendingReservationsList reservations={pendingReservations} />
      </div>

      {oldQuotes.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Atención: Cotizaciones Antiguas ({oldQuotes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 mb-4">
              Hay {oldQuotes.length} cotizaciones con más de 7 días sin conversión.
              Considera hacer seguimiento con los clientes.
            </p>
            <Link to="/quotes">
              <Button variant="outline" className="border-orange-300 text-orange-800">
                Revisar Cotizaciones
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
