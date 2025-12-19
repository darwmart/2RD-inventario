import { useState } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, Package, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { Product } from '@/types';
import { ProductFormDialog } from '@/components/ProductFormDialog';


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
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
    const matchesSupplier = selectedSupplier === 'all' || product.supplierId === selectedSupplier;
    
    return matchesSearch && matchesCategory && matchesSupplier;
  });

  const lowStockProducts = getLowStockProducts();

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

  return (
    <ScrollArea className="h-screen p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
          <p className="mt-2 text-gray-600">
            Gestiona tus productos, categorías y proveedores
          </p>
        </div>
        <Button onClick={() => setIsAddingProduct(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar Producto
        </Button>
        <ProductFormDialog
          open={isAddingProduct}
          onOpenChange={setIsAddingProduct}
          formData={productForm}
          onFormChange={setProductForm}
          onSubmit={handleAddProduct}
          categories={categories}
          suppliers={suppliers}
          title="Agregar Nuevo Producto"
          submitLabel="Agregar Producto"
          onAddCategory={handleAddCategory}
          onAddSupplier={handleAddSupplier}
          showCategoryCreate={true}
          showSupplierCreate={true}
        />
      </div>

      {/* Edit Product Dialog */}
      <ProductFormDialog
        open={!!editingProduct}
        onOpenChange={(open) => !open && setEditingProduct(null)}
        formData={productForm}
        onFormChange={setProductForm}
        onSubmit={handleEditProduct}
        categories={categories}
        suppliers={suppliers}
        title="Editar Producto"
        submitLabel="Guardar Cambios"
        onAddCategory={handleAddCategory}
        onAddSupplier={handleAddSupplier}
        showCategoryCreate={true}
        showSupplierCreate={true}
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre, referencia o código de barras..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Todos los proveedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proveedores</SelectItem>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Productos con Stock Bajo ({lowStockProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {lowStockProducts.slice(0, 6).map(product => (
                <div key={product.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="font-medium">{product.name}</span>
                  <Badge variant="destructive">{product.stock} unidades</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => {
          const category = categories.find(c => c.id === product.categoryId);
          const supplier = suppliers.find(s => s.id === product.supplierId);
          const isLowStock = product.stock <= product.minStock;

          return (
            <Card key={product.id} className={`relative ${isLowStock ? 'border-yellow-300' : ''}`}>
              {isLowStock && (
                <div className="absolute top-2 right-2 z-10">
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Stock Bajo
                  </Badge>
                </div>
              )}
              
              <CardHeader className="pb-2">
                <div className="aspect-square bg-gray-100 rounded-md mb-2 flex items-center justify-center overflow-hidden">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Package className="h-12 w-12 text-gray-400" />
                  )}
                </div>
                <CardTitle className="text-lg">{product.name}</CardTitle>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Ref: {product.reference}</p>
                  {product.barcode && <p>Código: {product.barcode}</p>}
                  <p>Categoría: {category?.name || 'Sin categoría'}</p>
                  <p>Proveedor: {supplier?.name || 'Sin proveedor'}</p>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Stock:</span>
                    <Badge variant={isLowStock ? "destructive" : "secondary"}>
                      {product.stock} unidades
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Costo:</span>
                      <span>${product.cost.toLocaleString('es-CO')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Precio actual:</span>
                      <span className="font-bold text-green-600">
                        ${product.currentPrice.toLocaleString('es-CO')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>P. sugerido:</span>
                      <span>${product.suggestedPrice.toLocaleString('es-CO')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>P. mayorista:</span>
                      <span>${product.wholesalePrice.toLocaleString('es-CO')}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => openEditDialog(product)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700"
                      onClick={() => deleteProduct(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No se encontraron productos
          </h3>
          <p className="text-gray-500">
            {searchTerm || selectedCategory !== 'all' || selectedSupplier !== 'all'
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Comienza agregando tu primer producto al inventario'
            }
          </p>
        </div>
      )}
    </ScrollArea>
  );
}