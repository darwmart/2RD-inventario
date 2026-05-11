import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { Product } from '@/types';

interface Props {
  products: Product[];
}

export default function LowStockWidget({ products }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
          Productos con Stock Bajo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-gray-500">No hay productos con stock bajo</p>
        ) : (
          <div className="space-y-2">
            {products.slice(0, 5).map(product => (
              <div key={product.id} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-gray-600">Ref: {product.reference}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-600">{product.stock} unidades</p>
                  <p className="text-xs text-gray-500">Mín: {product.minStock}</p>
                </div>
              </div>
            ))}
            {products.length > 5 && (
              <p className="text-sm text-gray-500 text-center">Y {products.length - 5} productos más...</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
