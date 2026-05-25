import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Package, Edit, Trash2, ChevronRight, AlertTriangle, ChevronDown, X, ChevronLeft } from 'lucide-react';
import { Product } from '@/types';
import { VisibleColumns } from './ColumnConfigDialog';
import BarcodeScanInput from '@/components/barcode/BarcodeScanInput';
import { useAuth } from '@/contexts/AuthContext';

const PAGE_SIZE = 20;

interface Category { id: string; name: string }

interface Props {
  products: Product[];
  categories: Category[];
  visibleColumns: VisibleColumns;
  selectedProductId: string | null;
  searchTerm: string;
  selectedCategory: string;
  onSearchChange: (v: string) => void;
  onCategoryChange: (id: string) => void;
  onSelect: (p: Product) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}

const fmt = (n: number) =>
  n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ─── Paginación ───────────────────────────────────────────────
function Pagination({
  page, total, pageSize, onChange,
}: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  // Genera el rango de botones visibles: siempre muestra hasta 5 páginas centradas en la actual
  const pages: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  return (
    <div className="px-3 py-1.5 border-t bg-gray-50 shrink-0 flex items-center justify-between gap-2">
      {/* Contador */}
      <span className="text-xs text-gray-500 hidden sm:inline">
        {from}–{to} de {total}
      </span>
      <span className="text-xs text-gray-500 sm:hidden">{from}–{to}/{total}</span>

      {/* Botones */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="h-7 w-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="w-7 text-center text-xs text-gray-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onChange(p as number)}
                className={`h-7 w-7 rounded border text-xs font-medium transition-colors ${
                  p === page
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* En móvil solo muestra "X / Y" */}
        <span className="sm:hidden text-xs text-gray-600 px-2">{page}/{totalPages}</span>

        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="h-7 w-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Tabla de productos ───────────────────────────────────────
export default function ProductTable({
  products, categories, visibleColumns, selectedProductId,
  searchTerm, selectedCategory, onSearchChange, onCategoryChange, onSelect, onEdit, onDelete,
}: Props) {
  const { isAdmin } = useAuth();
  const [catOpen, setCatOpen]   = useState(false);
  const [page, setPage]         = useState(1);
  const colCount = Object.values(visibleColumns).filter(Boolean).length + (isAdmin() ? 1 : 0);

  // Resetear a página 1 cuando cambie el filtro
  useEffect(() => { setPage(1); }, [products.length, searchTerm, selectedCategory]);

  const activeCategoryName = selectedCategory === 'all'
    ? null
    : categories.find(c => c.id === selectedCategory)?.name ?? null;

  const paginated = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex-1 flex flex-col border rounded bg-white min-w-0 overflow-hidden">

      {/* ── Barra búsqueda + filtro familia ───────────────── */}
      <div className="px-3 py-2 border-b shrink-0 flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <BarcodeScanInput
            placeholder="Código, descripción, código de barras..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.currentTarget.value)}
            onScan={(code) => onSearchChange(code)}
            className="pl-9"
          />
        </div>

        <Popover open={catOpen} onOpenChange={setCatOpen}>
          <PopoverTrigger asChild>
            <button className={`shrink-0 h-9 px-2.5 border rounded-md flex items-center gap-1.5 text-sm transition-colors hover:bg-gray-50 ${
              activeCategoryName ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
            }`}>
              <span className="max-w-[90px] truncate hidden sm:inline">
                {activeCategoryName ?? 'Familia'}
              </span>
              <span className="sm:hidden">{activeCategoryName ? '●' : '▤'}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={4} className="w-52 p-1 max-h-72 overflow-y-auto">
            <button
              onClick={() => { onCategoryChange('all'); setCatOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm rounded flex items-center gap-2 hover:bg-gray-100 ${
                selectedCategory === 'all' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
              }`}
            >
              <span>📋</span> Todas las familias
            </button>
            {categories.map(cat => (
              <button key={cat.id}
                onClick={() => { onCategoryChange(cat.id); setCatOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm rounded flex items-center gap-2 hover:bg-gray-100 ${
                  selectedCategory === cat.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                }`}
              >
                <span>📦</span><span className="truncate">{cat.name}</span>
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {activeCategoryName && (
          <button onClick={() => onCategoryChange('all')}
            className="shrink-0 h-9 w-9 flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors"
            title="Quitar filtro">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Chip familia activa */}
      {activeCategoryName && (
        <div className="px-3 py-1 border-b bg-blue-50 shrink-0 flex items-center gap-2">
          <span className="text-xs text-blue-600">
            Familia: <strong>{activeCategoryName}</strong>
          </span>
          <span className="text-xs text-blue-400">· {products.length} artículo(s)</span>
        </div>
      )}

      {/* ── VISTA MÓVIL: tarjetas ─────────────────────────── */}
      <div className="md:hidden flex-1 divide-y overflow-hidden">
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2 text-gray-400">
            <Package className="h-10 w-10" />
            <p className="text-sm">{searchTerm || activeCategoryName ? 'Sin resultados' : 'No hay artículos'}</p>
          </div>
        ) : (
          paginated.map(product => {
            const isLowStock = product.stock <= product.minStock;
            return (
              <div key={product.id}
                onClick={() => onSelect(product)}
                className={`flex items-center gap-2.5 px-3 py-2 active:bg-gray-50 cursor-pointer transition-colors ${
                  selectedProductId === product.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="shrink-0 h-10 w-10 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                  {product.image
                    ? <img src={product.image} alt={product.name} className="h-full w-full object-contain" />
                    : <Package className="h-5 w-5 text-gray-300" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{product.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{product.reference || product.barcode || '—'}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-gray-900">${fmt(product.currentPrice)}</p>
                  <div className={`flex items-center justify-end gap-0.5 text-xs font-medium ${
                    product.stock === 0 ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {isLowStock && <AlertTriangle className="h-3 w-3" />}
                    <span>{product.stock} uds</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
              </div>
            );
          })
        )}
      </div>

      {/* ── VISTA DESKTOP: tabla ──────────────────────────── */}
      <div className="hidden md:block flex-1 overflow-hidden">
        <Table>
          <TableHeader className="sticky top-0 bg-gray-50 z-10">
            <TableRow>
              {visibleColumns.code          && <TableHead className="w-[100px]">Código</TableHead>}
              {visibleColumns.description   && <TableHead>Descripción</TableHead>}
              {visibleColumns.barcode       && <TableHead className="w-[120px]">C.Barras</TableHead>}
              {visibleColumns.category      && <TableHead className="w-[150px]">Familia</TableHead>}
              {visibleColumns.stock         && <TableHead className="text-right w-[80px]">Stock</TableHead>}
              {visibleColumns.cost          && <TableHead className="text-right w-[100px]">Costo</TableHead>}
              {visibleColumns.wholesalePrice && <TableHead className="text-right w-[100px]">P.Mayorista</TableHead>}
              {visibleColumns.suggestedPrice && <TableHead className="text-right w-[100px]">P.Sugerido</TableHead>}
              {visibleColumns.currentPrice  && <TableHead className="text-right w-[100px]">P.Venta</TableHead>}
              {visibleColumns.discountPrice && <TableHead className="text-right w-[100px]">P.Descuento</TableHead>}
              {isAdmin()                    && <TableHead className="w-[100px]">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-12 w-12 text-gray-300" />
                    <p className="text-gray-500">
                      {searchTerm || activeCategoryName ? 'Sin resultados' : 'No hay artículos registrados'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map(product => {
                const category   = categories.find(c => c.id === product.categoryId);
                const isLowStock = product.stock <= product.minStock;
                return (
                  <TableRow key={product.id}
                    className={`cursor-pointer hover:bg-gray-50 ${
                      selectedProductId === product.id ? 'bg-blue-50 hover:bg-blue-50' : ''
                    } ${isLowStock ? 'bg-yellow-50' : ''}`}
                    onClick={() => onSelect(product)}
                    onDoubleClick={isAdmin() ? () => onEdit(product) : undefined}
                  >
                    {visibleColumns.code          && <TableCell className="font-mono text-sm font-medium">{product.reference}</TableCell>}
                    {visibleColumns.description   && <TableCell>{product.name}</TableCell>}
                    {visibleColumns.barcode       && <TableCell className="font-mono text-xs text-gray-600">{product.barcode || <span className="text-gray-400">-</span>}</TableCell>}
                    {visibleColumns.category      && <TableCell className="text-sm text-gray-600">{category?.name || '-'}</TableCell>}
                    {visibleColumns.stock         && (
                      <TableCell className="text-right font-mono text-sm">
                        <span className={isLowStock ? 'text-red-600 font-bold' : ''}>{product.stock}</span>
                      </TableCell>
                    )}
                    {visibleColumns.cost          && (
                      <TableCell className="text-right font-mono text-sm">
                        ${(product.hasIva ? product.cost * 1.19 : product.cost).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    )}
                    {visibleColumns.wholesalePrice && <TableCell className="text-right font-mono text-sm">${product.wholesalePrice.toLocaleString('es-CO')}</TableCell>}
                    {visibleColumns.suggestedPrice && <TableCell className="text-right font-mono text-sm">${product.suggestedPrice.toLocaleString('es-CO')}</TableCell>}
                    {visibleColumns.currentPrice  && <TableCell className="text-right font-mono text-sm font-medium">${product.currentPrice.toLocaleString('es-CO')}</TableCell>}
                    {visibleColumns.discountPrice && <TableCell className="text-right font-mono text-sm">${product.discountPrice.toLocaleString('es-CO')}</TableCell>}
                    {isAdmin() && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                            onClick={e => { e.stopPropagation(); onEdit(product); }}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                            onClick={e => { e.stopPropagation(); onDelete(product); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Paginación ────────────────────────────────────── */}
      <Pagination
        page={page}
        total={products.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />
    </div>
  );
}
