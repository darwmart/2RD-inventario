import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product } from '@/types';

interface Props {
  products: Product[];
}

export default function LowStockList({ products }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-yellow-800">
          <AlertTriangle className="h-5 w-5 mr-2" />
          Productos con Stock Bajo ({products.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-gray-500 text-center py-4">¡Excelente! No hay productos con stock bajo</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {products.map(product => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-gray-600">Ref: {product.reference}</p>
                  <p className="text-xs text-gray-500">Stock mínimo: {product.minStock}</p>
                </div>
                <div className="text-right">
                  <Badge variant="destructive" className="mb-2">{product.stock} unidades</Badge>
                  <div>
                    <Link to="/inventory">
                      <Button size="sm" variant="outline">Ver Producto</Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
