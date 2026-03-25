import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Product, Category } from '@/types';
import { Search, Package } from 'lucide-react';

type ProductSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  categories: Category[];
  onSelect: (product: Product) => void;
  onNewProduct: () => void;
};

// Modal de búsqueda de artículos - estilo de software de gestión comercial
export default function ProductSearchDialog({
  open,
  onOpenChange,
  products,
  categories,
  onSelect,
  onNewProduct
}: ProductSearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Filtrar productos
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filtrar por categoría
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.categoryId === selectedCategory);
    }

    // Filtrar por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.reference.toLowerCase().includes(term) ||
        product.name.toLowerCase().includes(term) ||
        product.barcode.includes(term) ||
        product.description.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [products, selectedCategory, searchTerm]);

  const handleSelect = () => {
    if (selectedProduct) {
      onSelect(selectedProduct);
      onOpenChange(false);
      setSearchTerm('');
      setSelectedProduct(null);
      setSelectedCategory('all');
    }
  };

  const handleDoubleClick = (product: Product) => {
    onSelect(product);
    onOpenChange(false);
    setSearchTerm('');
    setSelectedProduct(null);
    setSelectedCategory('all');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-4 pb-3 border-b">
          <DialogTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Archivo de artículos
          </DialogTitle>
          <p className="text-sm text-gray-600">Administre los artículos de su empresa.</p>
        </DialogHeader>

        <div className="flex h-[calc(85vh-120px)]">
          {/* Panel izquierdo - Categorías */}
          <div className="w-64 border-r bg-gray-50 p-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Sección/familia</h3>
            <div className="space-y-1">
              <div
                className={`px-3 py-2 text-sm rounded cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setSelectedCategory('all')}
              >
                📋 Todas las categorías
              </div>
              {categories.map(category => (
                <div
                  key={category.id}
                  className={`px-3 py-2 text-sm rounded cursor-pointer ${
                    selectedCategory === category.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  📦 {category.name}
                </div>
              ))}
            </div>
          </div>

          {/* Panel derecho - Lista de productos */}
          <div className="flex-1 flex flex-col">
            {/* Buscador */}
            <div className="px-6 pt-4 pb-3 border-b">
              <div className="flex gap-3">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Familia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por código, descripción, referencia..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                </div>
              </div>
            </div>

            {/* Tabla de productos */}
            <div className="flex-1 overflow-y-auto px-6">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-[100px]">Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Familia</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="h-12 w-12 text-gray-300" />
                          <p className="text-gray-500">
                            {searchTerm || selectedCategory !== 'all'
                              ? 'No se encontraron artículos'
                              : 'No hay artículos registrados'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => {
                      const category = categories.find(c => c.id === product.categoryId);
                      return (
                        <TableRow
                          key={product.id}
                          className={`cursor-pointer hover:bg-gray-50 ${
                            selectedProduct?.id === product.id ? 'bg-blue-50 hover:bg-blue-50' : ''
                          }`}
                          onClick={() => setSelectedProduct(product)}
                          onDoubleClick={() => handleDoubleClick(product)}
                        >
                          <TableCell className="font-mono text-sm font-medium">
                            {product.reference}
                          </TableCell>
                          <TableCell>{product.name}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {category?.name || '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {product.stock}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            ${product.cost.toLocaleString('es-CO')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-medium">
                            ${product.currentPrice.toLocaleString('es-CO')}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center px-6 py-3 border-t bg-gray-50">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onNewProduct}>
                  Nuevo
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  N° de artículos mostrados: <strong>{filteredProducts.length}</strong>
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cerrar
                  </Button>
                  <Button onClick={handleSelect} disabled={!selectedProduct}>
                    Seleccionar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
