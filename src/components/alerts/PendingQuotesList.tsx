import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Sale } from '@/types';

interface Props {
  quotes: Sale[];
}

export default function PendingQuotesList({ quotes }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-blue-800">
          <Clock className="h-5 w-5 mr-2" />
          Cotizaciones Pendientes ({quotes.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {quotes.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No hay cotizaciones pendientes</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {quotes.slice(0, 5).map(quote => {
              const daysDiff = Math.floor((Date.now() - new Date(quote.createdAt).getTime()) / (1000 * 60 * 60 * 24));
              const isOld = daysDiff > 7;
              return (
                <div key={quote.id} className={`flex items-center justify-between p-3 rounded-lg border ${isOld ? 'bg-orange-50 border-orange-200' : 'bg-blue-50'}`}>
                  <div>
                    <p className="font-medium">{quote.saleNumber}</p>
                    <p className="text-sm text-gray-600">Asesor: {quote.advisorName}</p>
                    <p className="text-sm">${quote.total.toLocaleString('es-CO')}</p>
                    {isOld && (
                      <Badge variant="destructive" className="text-xs mt-1">{daysDiff} días pendiente</Badge>
                    )}
                  </div>
                  <div>
                    <Link to="/quotes">
                      <Button size="sm" variant="outline">Ver Cotización</Button>
                    </Link>
                  </div>
                </div>
              );
            })}
            {quotes.length > 5 && (
              <div className="text-center pt-2">
                <Link to="/quotes">
                  <Button variant="link" size="sm">Ver todas las cotizaciones</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
