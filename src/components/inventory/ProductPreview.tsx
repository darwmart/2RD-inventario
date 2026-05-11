import { Package } from 'lucide-react';
import { Product } from '@/types';

interface Props {
  product: Product;
}

export default function ProductPreview({ product }: Props) {
  return (
    <div className="w-80 border rounded bg-white p-4">
      <h3 className="text-sm font-semibold mb-3 text-gray-700">Vista Previa</h3>
      <div className="space-y-3">
        <div className="text-center">
          <div className="inline-block px-3 py-1 bg-red-600 text-white text-xs font-mono rounded">
            {product.reference}
          </div>
        </div>
        <div className="border rounded-lg overflow-hidden bg-gray-50">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-64 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x300?text=Sin+Imagen';
              }}
            />
          ) : (
            <div className="w-full h-64 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Package className="h-16 w-16 mx-auto mb-2" />
                <p className="text-sm">Sin imagen</p>
              </div>
            </div>
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-800">{product.name}</p>
        </div>
        <div className="pt-2 border-t space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Stock:</span>
            <span className="font-medium">{product.stock} unidades</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Precio actual:</span>
            <span className="font-medium">${product.currentPrice.toLocaleString('es-CO')}</span>
          </div>
          {product.barcode && (
            <div className="flex justify-between">
              <span className="text-gray-600">Código de barras:</span>
              <span className="font-mono text-xs">{product.barcode}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
