import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Package, Edit, Trash2 } from 'lucide-react';
import { Product } from '@/types';
import { VisibleColumns } from './ColumnConfigDialog';
import BarcodeScanInput from '@/components/barcode/BarcodeScanInput';

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
  onSearchChange: (v: string) => void;
  onSelect: (p: Product) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}

export default function ProductTable({
  products, categories, visibleColumns, selectedProductId,
  searchTerm, onSearchChange, onSelect, onEdit, onDelete,
}: Props) {
  const colCount = Object.values(visibleColumns).filter(Boolean).length + 1;

  return (
    <div className="flex-1 flex flex-col border rounded bg-white">
      <div className="px-4 py-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <BarcodeScanInput
            placeholder="Buscar por código, descripción, código de barras..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.currentTarget.value)}
            onScan={(code) => onSearchChange(code)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
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
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-12 w-12 text-gray-300" />
                    <p className="text-gray-500">
                      {searchTerm ? 'No se encontraron artículos' : 'No hay artículos registrados'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const category = categories.find(c => c.id === product.categoryId);
                const isLowStock = product.stock <= product.minStock;
                return (
                  <TableRow
                    key={product.id}
                    className={`cursor-pointer hover:bg-gray-50 ${
                      selectedProductId === product.id ? 'bg-blue-50 hover:bg-blue-50' : ''
                    } ${isLowStock ? 'bg-yellow-50' : ''}`}
                    onClick={() => onSelect(product)}
                    onDoubleClick={() => onEdit(product)}
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
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                          onClick={(e) => { e.stopPropagation(); onEdit(product); }}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                          onClick={(e) => { e.stopPropagation(); onDelete(product); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="px-4 py-2 border-t bg-gray-50">
        <span className="text-sm text-gray-600">
          N° de artículos mostrados: <strong>{products.length}</strong>
        </span>
      </div>
    </div>
  );
}
