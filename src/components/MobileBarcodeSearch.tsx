import { useState, useCallback, useRef } from 'react';
import { Camera, Search, X, Package, AlertTriangle, CheckCircle, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { db } from '@/offline/db';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import BarcodeScanner from '@/components/barcode/BarcodeScanner';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/types';

// ─── Buscar producto por código de barras o texto ─────────────
async function findProduct(query: string, isOnline: boolean): Promise<Product | null> {
  const q = query.trim();
  if (!q) return null;

  // 1. Intentar Supabase si hay conexión
  if (isOnline && supabase) {
    const { data } = await supabase
      .from('products')
      .select('*')
      .or(`barcode.eq.${q},reference.ilike.${q},name.ilike.%${q}%`)
      .is('deleted_at', null)
      .order('barcode', { ascending: false }) // barcode exacto primero
      .limit(1)
      .single();

    if (data) return mapSupabaseProduct(data);
  }

  // 2. Fallback a IndexedDB local
  const local = await db.products
    .filter(p =>
      !p.deleted_at &&
      (p.barcode === q ||
        (p.reference ?? '').toLowerCase() === q.toLowerCase() ||
        p.name.toLowerCase().includes(q.toLowerCase()))
    )
    .first();

  if (local) {
    return {
      id: local.id,
      name: local.name,
      barcode: local.barcode ?? '',
      reference: local.reference ?? '',
      description: '',
      image: local.image ?? '',
      cost: local.cost,
      suggestedPrice: local.current_price,
      discountPrice: local.current_price,
      wholesalePrice: local.current_price,
      currentPrice: local.current_price,
      stock: local.stock,
      minStock: local.min_stock,
      reservedStock: local.reserved_stock,
      hasIva: local.has_iva,
      categoryId: local.category_id ?? '',
      supplierId: local.supplier_id ?? '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  return null;
}

function mapSupabaseProduct(data: Record<string, unknown>): Product {
  return {
    id:             data.id as string,
    name:           data.name as string,
    barcode:        (data.barcode as string) ?? '',
    reference:      (data.reference as string) ?? '',
    description:    (data.description as string) ?? '',
    image:          (data.image as string) ?? '',
    cost:           Number(data.cost ?? 0),
    suggestedPrice: Number(data.suggested_price ?? 0),
    discountPrice:  Number(data.discount_price ?? 0),
    wholesalePrice: Number(data.wholesale_price ?? 0),
    currentPrice:   Number(data.current_price ?? 0),
    stock:          Number(data.stock ?? 0),
    minStock:       Number(data.min_stock ?? 0),
    reservedStock:  Number(data.reserved_stock ?? 0),
    hasIva:         Boolean(data.has_iva),
    categoryId:     (data.category_id as string) ?? '',
    supplierId:     (data.supplier_id as string) ?? '',
    createdAt:      new Date(data.created_at as string),
    updatedAt:      new Date(data.updated_at as string),
  };
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

// ─── Indicador de stock ───────────────────────────────────────
function StockBadge({ stock, minStock }: { stock: number; minStock: number }) {
  if (stock === 0) {
    return (
      <span className="flex items-center gap-1 text-red-600 font-semibold text-sm">
        <AlertTriangle className="h-4 w-4" /> Agotado
      </span>
    );
  }
  if (stock <= minStock) {
    return (
      <span className="flex items-center gap-1 text-amber-600 font-semibold text-sm">
        <AlertTriangle className="h-4 w-4" /> Stock bajo ({stock})
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-emerald-600 font-semibold text-sm">
      <CheckCircle className="h-4 w-4" /> Disponible ({stock})
    </span>
  );
}

// ─── Vista de producto encontrado ─────────────────────────────
function ProductCard({ product, onClose }: { product: Product; onClose: () => void }) {
  const availableStock = product.stock - (product.reservedStock ?? 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header del sheet */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <h2 className="text-base font-semibold text-gray-900 leading-tight">Resultado del escaneo</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
        {/* Imagen del producto */}
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gray-100 max-h-52">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
              <Package className="h-16 w-16" />
              <span className="text-xs mt-2">Sin imagen</span>
            </div>
          )}
          {/* IVA badge */}
          {product.hasIva && (
            <Badge className="absolute top-2 right-2 bg-amber-100 text-amber-700 border-amber-200 text-xs">
              + IVA
            </Badge>
          )}
        </div>

        {/* Nombre y referencia */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 leading-tight">{product.name}</h3>
          {product.reference && (
            <p className="text-sm text-gray-500 mt-0.5">Ref: {product.reference}</p>
          )}
          {product.barcode && (
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{product.barcode}</p>
          )}
        </div>

        {/* Stock */}
        <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Inventario</p>
          <StockBadge stock={product.stock} minStock={product.minStock} />
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{product.stock}</p>
              <p className="text-xs text-gray-500">Total en stock</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-700">{availableStock}</p>
              <p className="text-xs text-gray-500">Disponible</p>
            </div>
          </div>
          {(product.reservedStock ?? 0) > 0 && (
            <p className="text-xs text-amber-600 text-center">
              {product.reservedStock} reservado(s)
            </p>
          )}
          <div className="flex justify-between text-xs text-gray-400 pt-0.5 border-t border-gray-200 mt-1">
            <span>Stock mínimo: {product.minStock}</span>
          </div>
        </div>

        {/* Precios */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Precios</p>

          {/* Precio principal */}
          <div className="bg-blue-600 rounded-xl p-3 text-white">
            <p className="text-xs opacity-80">Precio sugerido</p>
            <p className="text-3xl font-bold">{fmt(product.suggestedPrice)}</p>
            {product.hasIva && (
              <p className="text-xs opacity-70 mt-0.5">IVA no incluido</p>
            )}
          </div>

          {/* Grilla de precios alternativos */}
          <div className="grid grid-cols-2 gap-2">
            {product.discountPrice > 0 && product.discountPrice !== product.suggestedPrice && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                <div className="flex items-center gap-1 mb-1">
                  <Tag className="h-3 w-3 text-emerald-600" />
                  <p className="text-xs text-emerald-700 font-medium">Descuento</p>
                </div>
                <p className="text-base font-bold text-emerald-700">{fmt(product.discountPrice)}</p>
              </div>
            )}

            {product.wholesalePrice > 0 && product.wholesalePrice !== product.suggestedPrice && (
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                <p className="text-xs text-purple-700 font-medium mb-1">Por mayor</p>
                <p className="text-base font-bold text-purple-700">{fmt(product.wholesalePrice)}</p>
              </div>
            )}

            {product.currentPrice > 0 && product.currentPrice !== product.suggestedPrice && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                <p className="text-xs text-gray-500 font-medium mb-1">P. de venta</p>
                <p className="text-base font-bold text-gray-600">{fmt(product.currentPrice)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Descripción si existe */}
        {product.description && (
          <div className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Descripción</p>
            <p>{product.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Buscador con cámara (header mobile) ─────────────────────
export function MobileBarcodeSearch() {
  const { isOnline } = useNetworkStatus();
  const [scannerOpen, setScannerOpen]     = useState(false);
  const [resultOpen, setResultOpen]       = useState(false);
  const [searchOpen, setSearchOpen]       = useState(false);
  const [query, setQuery]                 = useState('');
  const [product, setProduct]             = useState<Product | null>(null);
  const [loading, setLoading]             = useState(false);
  const [notFound, setNotFound]           = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const lookup = useCallback(async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    setNotFound(false);
    try {
      const found = await findProduct(code, isOnline);
      if (found) {
        setProduct(found);
        setSearchOpen(false);
        setResultOpen(true);
      } else {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  const handleScanDetected = useCallback((code: string) => {
    setQuery(code);
    void lookup(code);
  }, [lookup]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void lookup(query);
  };

  const handleOpenSearch = () => {
    setSearchOpen(true);
    setNotFound(false);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <>
      {/* Botón cámara en el header */}
      <button
        onClick={handleOpenSearch}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95 transition-all text-sm font-medium"
        aria-label="Buscar producto o escanear código"
      >
        <Camera className="h-5 w-5" />
        <span className="hidden xs:inline">Escanear</span>
      </button>

      {/* ── Sheet de búsqueda ─────────────────────────────── */}
      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent side="top" className="h-auto p-0 rounded-b-2xl shadow-xl">
          <div className="px-4 pt-4 pb-5 space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 flex-1">Buscar producto</h3>
              <button
                onClick={() => setSearchOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Campo de búsqueda + botón cámara */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={e => { setQuery(e.target.value); setNotFound(false); }}
                  placeholder="Código de barras, referencia o nombre..."
                  className="pl-9 h-11 text-base rounded-xl border-gray-200"
                  inputMode="text"
                  autoComplete="off"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => { setQuery(''); setNotFound(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Botón buscar */}
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="h-11 px-4 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
              >
                {loading ? (
                  <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Buscar</span>
              </button>

              {/* Botón cámara */}
              <button
                type="button"
                onClick={() => { setSearchOpen(false); setScannerOpen(true); }}
                className="h-11 w-11 bg-gray-900 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shrink-0"
                aria-label="Abrir cámara"
              >
                <Camera className="h-5 w-5" />
              </button>
            </form>

            {/* Mensaje no encontrado */}
            {notFound && (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                No se encontró ningún producto con ese código o nombre
              </div>
            )}

            {/* Sugerencia rápida */}
            {!query && !loading && (
              <p className="text-xs text-gray-400 text-center">
                Escribe el código, referencia o nombre — o usa{' '}
                <button
                  className="text-blue-500 font-medium underline-offset-2 underline"
                  onClick={() => { setSearchOpen(false); setScannerOpen(true); }}
                >
                  la cámara
                </button>
                {' '}para escanear
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Scanner de cámara ─────────────────────────────── */}
      <BarcodeScanner
        open={scannerOpen}
        onDetected={handleScanDetected}
        onClose={() => setScannerOpen(false)}
      />

      {/* ── Resultado del producto ─────────────────────────── */}
      <Sheet open={resultOpen} onOpenChange={setResultOpen}>
        <SheetContent
          side="bottom"
          className="h-[92dvh] p-0 rounded-t-2xl overflow-hidden flex flex-col"
        >
          {product && (
            <ProductCard product={product} onClose={() => setResultOpen(false)} />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
