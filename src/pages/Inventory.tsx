import { useState } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Package, Edit, Trash2, FolderPlus, Settings2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Product } from '@/types';
import ProductFormDialog from '@/components/ProductFormDialog';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/useLocalStorage';


export default function Inventory() {
  const {
    products,
    categories,
    suppliers,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    addSupplier,
    getLowStockProducts
  } = useInventory();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Estados para modal de categoría
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');

  // Estados para configuración de columnas
  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useLocalStorage('inventoryVisibleColumns', {
    code: true,
    description: true,
    barcode: true,
    category: true,
    stock: true,
    cost: true,
    suggestedPrice: true,
    currentPrice: true,
    discountPrice: true,
    wholesalePrice: true
  });

  const [productForm, setProductForm] = useState({
    name: '',
    barcode: '',
    reference: '',
    description: '',
    image: '',
    cost: 0,
    suggestedPrice: 0,
    discountPrice: 0,
    wholesalePrice: 0,
    currentPrice: 0,
    stock: 0,
    minStock: 1,
    categoryId: '',
    supplierId: '',
    hasIva: false
  });

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode.includes(searchTerm);
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleAddProduct = () => {
    if (productForm.name && productForm.reference) {
      addProduct(productForm);
      setProductForm({
        name: '',
        barcode: '',
        reference: '',
        description: '',
        image: '',
        cost: 0,
        suggestedPrice: 0,
        discountPrice: 0,
        wholesalePrice: 0,
        currentPrice: 0,
        stock: 0,
        minStock: 1,
        categoryId: '',
        supplierId: '',
        hasIva: false
      });
      setIsAddingProduct(false);
    }
  };

  const handleEditProduct = () => {
    if (editingProduct) {
      updateProduct(editingProduct.id, productForm);
      setEditingProduct(null);
      setProductForm({
        name: '',
        barcode: '',
        reference: '',
        description: '',
        image: '',
        cost: 0,
        suggestedPrice: 0,
        discountPrice: 0,
        wholesalePrice: 0,
        currentPrice: 0,
        stock: 0,
        minStock: 1,
        categoryId: '',
        supplierId: '',
        hasIva: false
      });
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      barcode: product.barcode,
      reference: product.reference,
      description: product.description,
      image: product.image,
      cost: product.cost,
      suggestedPrice: product.suggestedPrice,
      discountPrice: product.discountPrice,
      wholesalePrice: product.wholesalePrice,
      currentPrice: product.currentPrice,
      stock: product.stock,
      minStock: product.minStock,
      categoryId: product.categoryId,
      supplierId: product.supplierId,
      hasIva: product.hasIva || false
    });
  };

  const handleAddCategory = (categoryName: string) => {
    addCategory(categoryName, '');
  };

  const handleAddSupplier = (supplierData: { name: string; contact: string; phone: string; email: string; address: string }) => {
    addSupplier(supplierData);
  };

  const handleSaveCategory = () => {
    if (!categoryName.trim()) {
      toast.error('El nombre de la categoría es obligatorio');
      return;
    }

    addCategory(categoryName.trim(), categoryDescription.trim());
    toast.success('Categoría creada correctamente');
    setCategoryName('');
    setCategoryDescription('');
    setIsCategoryModalOpen(false);
  };

  return (
    <ScrollArea className="h-screen">
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Barra Superior */}
        <div className="mb-4 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Archivo de artículos</h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsColumnConfigOpen(true)}
                title="Configurar columnas"
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Columnas
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsCategoryModalOpen(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Nueva Categoría
              </Button>
              <Button size="sm" onClick={() => setIsAddingProduct(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Artículo
              </Button>
            </div>
          </div>
        </div>
        {/* Vista tipo FactuSOL */}
        <div className="flex h-[calc(100vh-140px)] gap-4">
          {/* Panel Izquierdo - Categorías */}
          <div className="w-64 border rounded bg-white p-4">
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

          {/* Panel Derecho - Tabla de Artículos y Vista Previa */}
          <div className="flex-1 flex gap-4">
            {/* Tabla de Artículos */}
            <div className="flex-1 flex flex-col border rounded bg-white">
              {/* Buscador */}
              <div className="px-4 py-3 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por código, descripción, código de barras..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Tabla de Artículos */}
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
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="text-center py-12">
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
                        const isLowStock = product.stock <= product.minStock;

                        return (
                          <TableRow
                            key={product.id}
                            className={`cursor-pointer hover:bg-gray-50 ${
                              selectedProduct?.id === product.id ? 'bg-blue-50 hover:bg-blue-50' : ''
                            } ${isLowStock ? 'bg-yellow-50' : ''}`}
                            onClick={() => setSelectedProduct(product)}
                            onDoubleClick={() => openEditDialog(product)}
                          >
                            {visibleColumns.code && (
                              <TableCell className="font-mono text-sm font-medium">
                                {product.reference}
                              </TableCell>
                            )}
                            {visibleColumns.description && (
                              <TableCell>{product.name}</TableCell>
                            )}
                            {visibleColumns.barcode && (
                              <TableCell className="font-mono text-xs text-gray-600">
                                {product.barcode || <span className="text-gray-400">-</span>}
                              </TableCell>
                            )}
                            {visibleColumns.category && (
                              <TableCell className="text-sm text-gray-600">
                                {category?.name || '-'}
                              </TableCell>
                            )}
                            {visibleColumns.stock && (
                              <TableCell className="text-right font-mono text-sm">
                                <span className={isLowStock ? 'text-red-600 font-bold' : ''}>
                                  {product.stock}
                                </span>
                              </TableCell>
                            )}
                            {visibleColumns.cost && (
                              <TableCell className="text-right font-mono text-sm">
                                ${(product.hasIva ? product.cost * 1.19 : product.cost).toLocaleString('es-CO', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditDialog(product);
                                  }}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('¿Estás seguro de eliminar este artículo?')) {
                                      deleteProduct(product.id);
                                    }
                                  }}
                                >
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

              {/* Footer */}
              <div className="px-4 py-2 border-t bg-gray-50">
                <span className="text-sm text-gray-600">
                  N° de artículos mostrados: <strong>{filteredProducts.length}</strong>
                </span>
              </div>
            </div>

            {/* Panel de Vista Previa de Imagen */}
            {selectedProduct && (
              <div className="w-80 border rounded bg-white p-4">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">Vista Previa</h3>
                <div className="space-y-3">
                  {/* Código del producto */}
                  <div className="text-center">
                    <div className="inline-block px-3 py-1 bg-red-600 text-white text-xs font-mono rounded">
                      {selectedProduct.reference}
                    </div>
                  </div>

                  {/* Imagen del producto */}
                  <div className="border rounded-lg overflow-hidden bg-gray-50">
                    {selectedProduct.image ? (
                      <img
                        src={selectedProduct.image}
                        alt={selectedProduct.name}
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

                  {/* Nombre del producto */}
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-800">{selectedProduct.name}</p>
                  </div>

                  {/* Información adicional */}
                  <div className="pt-2 border-t space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stock:</span>
                      <span className="font-medium">{selectedProduct.stock} unidades</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Precio actual:</span>
                      <span className="font-medium">${selectedProduct.currentPrice.toLocaleString('es-CO')}</span>
                    </div>
                    {selectedProduct.barcode && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Código de barras:</span>
                        <span className="font-mono text-xs">{selectedProduct.barcode}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modales */}
        <ProductFormDialog
          open={isAddingProduct}
          onOpenChange={setIsAddingProduct}
          product={null}
          categories={categories}
          suppliers={suppliers}
          existingProducts={products}
          onSave={(productData) => {
            addProduct(productData);
            toast.success('Artículo creado correctamente');
          }}
          onAddCategory={(name, description) => {
            addCategory(name, description);
          }}
        />

        <ProductFormDialog
          open={!!editingProduct}
          onOpenChange={(open) => !open && setEditingProduct(null)}
          product={editingProduct}
          categories={categories}
          suppliers={suppliers}
          existingProducts={products}
          onSave={(productData) => {
            if (editingProduct) {
              updateProduct(editingProduct.id, productData);
              toast.success('Artículo actualizado correctamente');
              setEditingProduct(null);
            }
          }}
          onAddCategory={(name, description) => {
            addCategory(name, description);
          }}
        />

        {/* Modal de Crear Categoría */}
        <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5" />
              Nueva Categoría
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">Nombre *</Label>
              <Input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Ej: Accesorios, Ropa deportiva..."
                className="mt-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveCategory();
                  }
                }}
                autoFocus
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Descripción (opcional)</Label>
              <Textarea
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                placeholder="Describe brevemente esta categoría..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCategoryModalOpen(false);
                setCategoryName('');
                setCategoryDescription('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveCategory}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Categoría
            </Button>
          </div>
        </DialogContent>
        </Dialog>

        {/* Modal de Configuración de Columnas */}
        <Dialog open={isColumnConfigOpen} onOpenChange={setIsColumnConfigOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Configuración de columnas
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <div className="flex items-center justify-between mb-2 pb-2 border-b">
                <span className="text-sm font-medium text-gray-700">Selecciona las columnas a mostrar:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleColumns({
                    code: true,
                    description: true,
                    barcode: true,
                    category: true,
                    stock: true,
                    cost: true,
                    suggestedPrice: true,
                    currentPrice: true,
                    discountPrice: true,
                    wholesalePrice: true
                  })}
                >
                  Mostrar todas
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="col-code"
                  checked={visibleColumns.code}
                  onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, code: !!checked})}
                />
                <label htmlFor="col-code" className="text-sm cursor-pointer">Código</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="col-description"
                  checked={visibleColumns.description}
                  onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, description: !!checked})}
                />
                <label htmlFor="col-description" className="text-sm cursor-pointer">Descripción</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="col-barcode"
                  checked={visibleColumns.barcode}
                  onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, barcode: !!checked})}
                />
                <label htmlFor="col-barcode" className="text-sm cursor-pointer">C.Barras</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="col-category"
                  checked={visibleColumns.category}
                  onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, category: !!checked})}
                />
                <label htmlFor="col-category" className="text-sm cursor-pointer">Familia</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="col-stock"
                  checked={visibleColumns.stock}
                  onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, stock: !!checked})}
                />
                <label htmlFor="col-stock" className="text-sm cursor-pointer">Stock</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="col-cost"
                  checked={visibleColumns.cost}
                  onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, cost: !!checked})}
                />
                <label htmlFor="col-cost" className="text-sm cursor-pointer">Costo</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="col-suggestedPrice"
                  checked={visibleColumns.suggestedPrice}
                  onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, suggestedPrice: !!checked})}
                />
                <label htmlFor="col-suggestedPrice" className="text-sm cursor-pointer">P.Sugerido</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="col-currentPrice"
                  checked={visibleColumns.currentPrice}
                  onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, currentPrice: !!checked})}
                />
                <label htmlFor="col-currentPrice" className="text-sm cursor-pointer">P.Actual</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="col-discountPrice"
                  checked={visibleColumns.discountPrice}
                  onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, discountPrice: !!checked})}
                />
                <label htmlFor="col-discountPrice" className="text-sm cursor-pointer">P.Descuento</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="col-wholesalePrice"
                  checked={visibleColumns.wholesalePrice}
                  onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, wholesalePrice: !!checked})}
                />
                <label htmlFor="col-wholesalePrice" className="text-sm cursor-pointer">P.Mayorista</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button onClick={() => setIsColumnConfigOpen(false)}>
                Aceptar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}