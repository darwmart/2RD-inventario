import { useInventory } from '@/hooks/useInventory';
import { useSales } from '@/hooks/useSales';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Package, Clock, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Alerts() {
  const { products, getLowStockProducts } = useInventory();
  const { sales } = useSales();

  const lowStockProducts = getLowStockProducts();
  
  // Productos sin stock
  const outOfStockProducts = products.filter(product => product.stock === 0);
  
  // Cotizaciones y separados pendientes
  const pendingQuotes = sales.filter(sale => 
    sale.type === 'quote' && sale.status === 'pending'
  );
  const pendingReservations = sales.filter(sale => 
    sale.type === 'reserved' && sale.status === 'pending'
  );
  
  // Cotizaciones antiguas (más de 7 días)
  const oldQuotes = pendingQuotes.filter(quote => {
    const daysDiff = Math.floor((Date.now() - new Date(quote.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff > 7;
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Centro de Alertas</h1>
        <p className="mt-2 text-gray-600">
          Mantente informado sobre el estado de tu inventario y ventas
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800">
              Stock Bajo
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-800">
              {lowStockProducts.length}
            </div>
            <p className="text-xs text-yellow-600">
              Productos necesitan reposición
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">
              Sin Stock
            </CardTitle>
            <Package className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-800">
              {outOfStockProducts.length}
            </div>
            <p className="text-xs text-red-600">
              Productos agotados
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              Cotizaciones
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">
              {pendingQuotes.length}
            </div>
            <p className="text-xs text-blue-600">
              Pendientes de conversión
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">
              Separados
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-800">
              {pendingReservations.length}
            </div>
            <p className="text-xs text-purple-600">
              Productos reservados
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productos con stock bajo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Productos con Stock Bajo ({lowStockProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                ¡Excelente! No hay productos con stock bajo
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {lowStockProducts.map(product => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-600">Ref: {product.reference}</p>
                      <p className="text-xs text-gray-500">Stock mínimo: {product.minStock}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive" className="mb-2">
                        {product.stock} unidades
                      </Badge>
                      <div>
                        <Link to="/inventory">
                          <Button size="sm" variant="outline">
                            Ver Producto
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Productos sin stock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <Package className="h-5 w-5 mr-2" />
              Productos Agotados ({outOfStockProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {outOfStockProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No hay productos agotados
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {outOfStockProducts.map(product => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-600">Ref: {product.reference}</p>
                      <p className="text-xs text-red-600 font-medium">AGOTADO</p>
                    </div>
                    <div>
                      <Link to="/inventory">
                        <Button size="sm" variant="outline">
                          Reponer Stock
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cotizaciones pendientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <Clock className="h-5 w-5 mr-2" />
              Cotizaciones Pendientes ({pendingQuotes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingQuotes.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No hay cotizaciones pendientes
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {pendingQuotes.slice(0, 5).map(quote => {
                  const daysDiff = Math.floor((Date.now() - new Date(quote.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                  const isOld = daysDiff > 7;
                  
                  return (
                    <div key={quote.id} className={`flex items-center justify-between p-3 rounded-lg border ${isOld ? 'bg-orange-50 border-orange-200' : 'bg-blue-50'}`}>
                      <div>
                        <p className="font-medium">{quote.saleNumber}</p>
                        <p className="text-sm text-gray-600">Asesor: {quote.advisorName}</p>
                        <p className="text-sm">${quote.total.toLocaleString('es-CO')}</p>
                        {isOld && (
                          <Badge variant="destructive" className="text-xs mt-1">
                            {daysDiff} días pendiente
                          </Badge>
                        )}
                      </div>
                      <div>
                        <Link to="/quotes">
                          <Button size="sm" variant="outline">
                            Ver Cotización
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
                {pendingQuotes.length > 5 && (
                  <div className="text-center pt-2">
                    <Link to="/quotes">
                      <Button variant="link" size="sm">
                        Ver todas las cotizaciones
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Productos separados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-purple-800">
              <TrendingDown className="h-5 w-5 mr-2" />
              Productos Separados ({pendingReservations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingReservations.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No hay productos separados
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {pendingReservations.slice(0, 5).map(reservation => {
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
                          <Button size="sm" variant="outline">
                            Ver Separado
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
                {pendingReservations.length > 5 && (
                  <div className="text-center pt-2">
                    <Link to="/quotes">
                      <Button variant="link" size="sm">
                        Ver todos los separados
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumen de alertas antiguas */}
      {oldQuotes.length > 0 && (
        <Card className="mt-6 border-orange-200 bg-orange-50">
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