import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Package, Edit, Trash2, ChevronRight, AlertTriangle, ChevronDown, X } from 'lucide-react';
import { Product } from '@/types';
import { VisibleColumns } from './ColumnConfigDialog';
import BarcodeScanInput from '@/components/barcode/BarcodeScanInput';
import { useAuth } from '@/contexts/AuthContext';

interface Category {
  id: string;
  name: string;
}

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

export default function ProductTable({
  products, categories, visibleColumns, selectedProductId,
  searchTerm, selectedCategory, onSearchChange, onCategoryChange, onSelect, onEdit, onDelete,
}: Props) {
  const { isAdmin } = useAuth();
  const [catOpen, setCatOpen] = useState(false);
  const colCount = Object.values(visibleColumns).filter(Boolean).length + (isAdmin() ? 1 : 0);

  const activeCategoryName = selectedCategory === 'all'
    ? null
    : categories.find(c => c.id === selectedCategory)?.name ?? null;

  return (
    <div className="flex-1 flex flex-col border rounded bg-white min-w-0">

      {/* ── Barra de búsqueda + filtro de familia ─────────── */}
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

        {/* Selector de familia */}
        <Popover open={catOpen} onOpenChange={setCatOpen}>
          <PopoverTrigger asChild>
            <button
              className={`shrink-0 h-9 px-2.5 border rounded-md flex items-center gap-1.5 text-sm transition-colors hover:bg-gray-50 ${
                activeCategoryName ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
              }`}
            >
              <span className="max-w-[90px] truncate hidden sm:inline">
                {activeCategoryName ?? 'Familia'}
              </span>
              <span className="sm:hidden">
                {activeCategoryName ? '●' : '▤'}
              </span>
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
              <button
                key={cat.id}
                onClick={() => { onCategoryChange(cat.id); setCatOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm rounded flex items-center gap-2 hover:bg-gray-100 ${
                  selectedCategory === cat.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                }`}
              >
                <span>📦</span>
                <span className="truncate">{cat.name}</span>
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Botón limpiar familia activa */}
        {activeCategoryName && (
          <button
            onClick={() => onCategoryChange('all')}
            className="shrink-0 h-9 w-9 flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors"
            title="Quitar filtro"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── Chip de familia activa (bajo la barra) ─────────── */}
      {activeCategoryName && (
        <div className="px-3 py-1 border-b bg-blue-50 flex items-center gap-2">
          <span className="text-xs text-blue-600">
            Familia: <strong>{activeCategoryName}</strong>
          </span>
          <span className="text-xs text-blue-400">· {products.length} artículo(s)</span>
        </div>
      )}

      {/* ── VISTA MÓVIL: tarjetas ─────────────────────────── */}
      <div className="md:hidden flex-1 overflow-y-auto divide-y">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2 text-gray-400">
            <Package className="h-10 w-10" />
            <p className="text-sm">{searchTerm || activeCategoryName ? 'Sin resultados' : 'No hay artículos'}</p>
          </div>
        ) : (
          products.map(product => {
            const isLowStock = product.stock <= product.minStock;
            const isSelected = selectedProductId === product.id;
            return (
              <div
                key={product.id}
                onClick={() => onSelect(product)}
                className={`flex items-center gap-2.5 px-3 py-2 active:bg-gray-50 cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50' : ''
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
      <div className="hidden md:flex flex-1 overflow-auto flex-col">
        <Table>
          <TableHeader className="sticky top-0 bg-gray-50 z-10">
            <TableRow>
              {visibleColumns.code && <TableHead className="w-[100px]">Código</TableHead>}
              {visibleColumns.description && <TableHead>Descripción</TableHead>}
              {visibleColumns.barcode && <TableHead className="w-[120px]">C.Barras</TableHead>}
              {visibleColumns.category && <TableHead className="w-[150px]">Familia</TableHead>}
              {visibleColumns.stock && <TableHead className="text-right w-[80px]">Stock</TableHead>}
              {visibleColumns.cost && <TableHead className="text-right w-[100px]">Costo</TableHead>}
              {visibleColumns.suggestedPrice && <TableHead className="text-right w-[100px]">P.Sugerido</TableHead>}
              {visibleColumns.currentPrice && <TableHead className="text-right w-[100px]">P.Actual</TableHead>}
              {visibleColumns.discountPrice && <TableHead className="text-right w-[100px]">P.Descuento</TableHead>}
              {visibleColumns.wholesalePrice && <TableHead className="text-right w-[100px]">P.Mayorista</TableHead>}
              {isAdmin() && <TableHead className="w-[100px]">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
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
              products.map(product => {
                const category = categories.find(c => c.id === product.categoryId);
                const isLowStock = product.stock <= product.minStock;
                return (
                  <TableRow
                    key={product.id}
                    className={`cursor-pointer hover:bg-gray-50 ${
                      selectedProductId === product.id ? 'bg-blue-50 hover:bg-blue-50' : ''
                    } ${isLowStock ? 'bg-yellow-50' : ''}`}
                    onClick={() => onSelect(product)}
                    onDoubleClick={isAdmin() ? () => onEdit(product) : undefined}
                  >
                    {visibleColumns.code && (
                      <TableCell className="font-mono text-sm font-medium">{product.reference}</TableCell>
                    )}
                    {visibleColumns.description && <TableCell>{product.name}</TableCell>}
                    {visibleColumns.barcode && (
                      <TableCell className="font-mono text-xs text-gray-600">
                        {product.barcode || <span className="text-gray-400">-</span>}
                      </TableCell>
                    )}
                    {visibleColumns.category && (
                      <TableCell className="text-sm text-gray-600">{category?.name || '-'}</TableCell>
                    )}
                    {visibleColumns.stock && (
                      <TableCell className="text-right font-mono text-sm">
                        <span className={isLowStock ? 'text-red-600 font-bold' : ''}>{product.stock}</span>
                      </TableCell>
                    )}
                    {visibleColumns.cost && (
                      <TableCell className="text-right font-mono text-sm">
                        ${(product.hasIva ? product.cost * 1.19 : product.cost).toLocaleString('es-CO', {
                          minimumFractionDigits: 2, maximumFractionDigits: 2,
                        })}
                      </TableCell>
                    )}
                    {visibleColumns.suggestedPrice && (
                      <TableCell className="text-right font-mono text-sm">
                        ${product.suggestedPrice.toLocaleString('es-CO')}
                      </TableCell>
                    )}
                    {visibleColumns.currentPrice && (
                      <TableCell className="text-right font-mono text-sm font-medium">
                        ${product.currentPrice.toLocaleString('es-CO')}
                      </TableCell>
                    )}
                    {visibleColumns.discountPrice && (
                      <TableCell className="text-right font-mono text-sm">
                        ${product.discountPrice.toLocaleString('es-CO')}
                      </TableCell>
                    )}
                    {visibleColumns.wholesalePrice && (
                      <TableCell className="text-right font-mono text-sm">
                        ${product.wholesalePrice.toLocaleString('es-CO')}
                      </TableCell>
                    )}
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

      <div className="px-3 py-1.5 border-t bg-gray-50 shrink-0">
        <span className="text-xs text-gray-500">
          {products.length} artículo(s)
        </span>
      </div>
    </div>
  );
}
