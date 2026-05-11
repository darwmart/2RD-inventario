import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Sale } from '@/types';

interface Props {
  reservations: Sale[];
}

export default function PendingReservationsList({ reservations }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-purple-800">
          <TrendingDown className="h-5 w-5 mr-2" />
          Productos Separados ({reservations.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reservations.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No hay productos separados</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {reservations.slice(0, 5).map(reservation => {
              const daysDiff = Math.floor((Date.now() - new Date(reservation.createdAt).getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={reservation.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border">
                  <div>
                    <p className="font-medium">{reservation.saleNumber}</p>
                    <p className="text-sm text-gray-600">Asesor: {reservation.advisorName}</p>
                    <p className="text-sm">${reservation.total.toLocaleString('es-CO')}</p>
                    <p className="text-xs text-gray-500">{daysDiff} días separado</p>
                  </div>
                  <div>
                    <Link to="/quotes">
                      <Button size="sm" variant="outline">Ver Separado</Button>
                    </Link>
                  </div>
                </div>
              );
            })}
            {reservations.length > 5 && (
              <div className="text-center pt-2">
                <Link to="/quotes">
                  <Button variant="link" size="sm">Ver todos los separados</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
