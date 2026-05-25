import { Package, Tag } from 'lucide-react';
import { Product } from '@/types';

interface Props {
  product: Product;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export default function ProductPreview({ product }: Props) {
  const availableStock = product.stock - (product.reservedStock ?? 0);
  const isLowStock = product.stock <= product.minStock;

  return (
    <div className="w-full md:w-80 bg-white px-3 py-2 space-y-2">

      {/* Imagen */}
      <div className="relative rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center h-56 md:h-48">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-300">
            <Package className="h-10 w-10" />
            <span className="text-xs mt-1">Sin imagen</span>
          </div>
        )}
        {product.hasIva && (
          <span className="absolute top-1.5 right-1.5 bg-amber-100 text-amber-700 text-xs font-medium px-1.5 py-0.5 rounded-full border border-amber-200">
            + IVA
          </span>
        )}
      </div>

      {/* Nombre + referencia */}
      <div>
        <div className="inline-block px-1.5 py-0.5 bg-red-600 text-white text-xs font-mono rounded mb-0.5">
          {product.reference || '—'}
        </div>
        <p className="font-semibold text-sm text-gray-900 leading-tight">{product.name}</p>
        {product.barcode && (
          <p className="text-xs text-gray-400 font-mono">{product.barcode}</p>
        )}
      </div>

      {/* Stock */}
      <div className="bg-gray-50 rounded-lg px-3 py-2 space-y-1.5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Inventario</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center">
            <p className={`text-xl font-bold ${product.stock === 0 ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-gray-900'}`}>
              {product.stock}
            </p>
            <p className="text-xs text-gray-500">En stock</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-700">{availableStock}</p>
            <p className="text-xs text-gray-500">Disponible</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 border-t border-gray-200 pt-1">
          Mínimo: {product.minStock}
          {(product.reservedStock ?? 0) > 0 && (
            <span className="ml-2 text-amber-600">· {product.reservedStock} reservado(s)</span>
          )}
        </p>
      </div>

      {/* Precios */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Precios</p>
        <div className="bg-blue-600 rounded-lg px-3 py-2 text-white">
          <p className="text-xs opacity-80">Precio sugerido</p>
          <p className="text-xl font-bold">{fmt(product.suggestedPrice)}</p>
          {product.hasIva && <p className="text-xs opacity-70">IVA no incluido</p>}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {product.discountPrice > 0 && product.discountPrice !== product.suggestedPrice && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1.5">
              <div className="flex items-center gap-1 mb-0.5">
                <Tag className="h-3 w-3 text-emerald-600" />
                <p className="text-xs text-emerald-700 font-medium">Descuento</p>
              </div>
              <p className="text-sm font-bold text-emerald-700">{fmt(product.discountPrice)}</p>
            </div>
          )}
          {product.wholesalePrice > 0 && product.wholesalePrice !== product.suggestedPrice && (
            <div className="bg-purple-50 border border-purple-100 rounded-lg px-2 py-1.5">
              <p className="text-xs text-purple-700 font-medium mb-0.5">Por mayor</p>
              <p className="text-sm font-bold text-purple-700">{fmt(product.wholesalePrice)}</p>
            </div>
          )}
          {product.currentPrice > 0 && product.currentPrice !== product.suggestedPrice && (
            <div className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5">
              <p className="text-xs text-gray-500 font-medium mb-0.5">P. de venta</p>
              <p className="text-sm font-bold text-gray-600">{fmt(product.currentPrice)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
