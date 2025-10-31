import { useState } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, Package, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { Product } from '@/types';


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
  const [newCategory, setNewCategory] = useState('');
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contact: '',
    phone: '',
    email: '',
    address: ''
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

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      addCategory(newCategory.trim(), '');
      setNewCategory('');
    }
  };

  const handleAddSupplier = () => {
    if (newSupplier.name.trim()) {
      addSupplier(newSupplier);
      setNewSupplier({
        name: '',
        contact: '',
        phone: '',
        email: '',
        address: ''
      });
    }
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
        <Dialog open={isAddingProduct} onOpenChange={setIsAddingProduct}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Producto</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre del Producto</Label>
                <Input
                  id="name"
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="reference">Referencia</Label>
                <Input
                  id="reference"
                  value={productForm.reference}
                  onChange={(e) => setProductForm({...productForm, reference: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="barcode">Código de Barras</Label>
                <Input
                  id="barcode"
                  value={productForm.barcode}
                  onChange={(e) => setProductForm({...productForm, barcode: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={productForm.description}
                  onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="category">Categoría</Label>
                <div className="flex gap-2">
                  <Select value={productForm.categoryId} onValueChange={(value) => setProductForm({...productForm, categoryId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">+</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nueva Categoría</DialogTitle>
                      </DialogHeader>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nombre de la categoría"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                        />
                        <Button onClick={handleAddCategory}>Agregar</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div>
                <Label htmlFor="supplier">Proveedor</Label>
                <div className="flex gap-2">
                  <Select value={productForm.supplierId} onValueChange={(value) => setProductForm({...productForm, supplierId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">+</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nuevo Proveedor</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          placeholder="Nombre del proveedor"
                          value={newSupplier.name}
                          onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                        />
                        <Input
                          placeholder="Contacto"
                          value={newSupplier.contact}
                          onChange={(e) => setNewSupplier({...newSupplier, contact: e.target.value})}
                        />
                        <Input
                          placeholder="Teléfono"
                          value={newSupplier.phone}
                          onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                        />
                        <Input
                          placeholder="Email"
                          value={newSupplier.email}
                          onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
                        />
                        <Textarea
                          placeholder="Dirección"
                          value={newSupplier.address}
                          onChange={(e) => setNewSupplier({...newSupplier, address: e.target.value})}
                        />
                        <Button onClick={handleAddSupplier}>Agregar Proveedor</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div>
                <Label htmlFor="cost">Costo</Label>
                <Input
                  id="cost"
                  type="number"
                  value={productForm.cost}
                  onChange={(e) => setProductForm({...productForm, cost: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label htmlFor="suggestedPrice">Precio Sugerido</Label>
                <Input
                  id="suggestedPrice"
                  type="number"
                  value={productForm.suggestedPrice}
                  onChange={(e) => setProductForm({...productForm, suggestedPrice: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label htmlFor="discountPrice">Precio con Descuento</Label>
                <Input
                  id="discountPrice"
                  type="number"
                  value={productForm.discountPrice}
                  onChange={(e) => setProductForm({...productForm, discountPrice: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label htmlFor="wholesalePrice">Precio por Mayor</Label>
                <Input
                  id="wholesalePrice"
                  type="number"
                  value={productForm.wholesalePrice}
                  onChange={(e) => setProductForm({...productForm, wholesalePrice: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label htmlFor="currentPrice">Precio Actual</Label>
                <Input
                  id="currentPrice"
                  type="number"
                  value={productForm.currentPrice}
                  onChange={(e) => setProductForm({...productForm, currentPrice: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="col-span-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="font-medium text-sm">Precio incluye IVA</Label>
                    <p className="text-xs text-gray-600">El precio ya tiene el IVA incluido</p>
                  </div>
                  <Switch
                    checked={productForm.hasIva || false}
                    onCheckedChange={(checked) => setProductForm({...productForm, hasIva: checked})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="stock">Stock Actual</Label>
                <Input
                  id="stock"
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({...productForm, stock: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label htmlFor="minStock">Stock Mínimo</Label>
                <Input
                  id="minStock"
                  type="number"
                  value={productForm.minStock}
                  onChange={(e) => setProductForm({...productForm, minStock: parseInt(e.target.value) || 1})}
                />
              </div>
              <div>
                <Label htmlFor="image">URL de Imagen</Label>
                <Input
                  id="image"
                  value={productForm.image}
                  onChange={(e) => setProductForm({...productForm, image: e.target.value})}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsAddingProduct(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddProduct}>Agregar Producto</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Product Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Producto</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-name">Nombre del Producto</Label>
              <Input
                id="edit-name"
                value={productForm.name}
                onChange={(e) => setProductForm({...productForm, name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="edit-reference">Referencia</Label>
              <Input
                id="edit-reference"
                value={productForm.reference}
                onChange={(e) => setProductForm({...productForm, reference: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="edit-barcode">Código de Barras</Label>
              <Input
                id="edit-barcode"
                value={productForm.barcode}
                onChange={(e) => setProductForm({...productForm, barcode: e.target.value})}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={productForm.description}
                onChange={(e) => setProductForm({...productForm, description: e.target.value})}
              />
            </div>
            <div>
              <Label>Categoría</Label>
              <Select value={productForm.categoryId} onValueChange={(value) => setProductForm({...productForm, categoryId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Proveedor</Label>
              <Select value={productForm.supplierId} onValueChange={(value) => setProductForm({...productForm, supplierId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-cost">Costo</Label>
              <Input
                id="edit-cost"
                type="number"
                value={productForm.cost}
                onChange={(e) => setProductForm({...productForm, cost: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label htmlFor="edit-suggestedPrice">Precio Sugerido</Label>
              <Input
                id="edit-suggestedPrice"
                type="number"
                value={productForm.suggestedPrice}
                onChange={(e) => setProductForm({...productForm, suggestedPrice: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label htmlFor="edit-discountPrice">Precio con Descuento</Label>
              <Input
                id="edit-discountPrice"
                type="number"
                value={productForm.discountPrice}
                onChange={(e) => setProductForm({...productForm, discountPrice: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label htmlFor="edit-wholesalePrice">Precio por Mayor</Label>
              <Input
                id="edit-wholesalePrice"
                type="number"
                value={productForm.wholesalePrice}
                onChange={(e) => setProductForm({...productForm, wholesalePrice: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label htmlFor="edit-currentPrice">Precio Actual</Label>
              <Input
                id="edit-currentPrice"
                type="number"
                value={productForm.currentPrice}
                onChange={(e) => setProductForm({...productForm, currentPrice: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="col-span-2">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label className="font-medium text-sm">Precio incluye IVA</Label>
                  <p className="text-xs text-gray-600">El precio ya tiene el IVA incluido</p>
                </div>
                <Switch
                  checked={productForm.hasIva || false}
                  onCheckedChange={(checked) => setProductForm({...productForm, hasIva: checked})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-stock">Stock Actual</Label>
              <Input
                id="edit-stock"
                type="number"
                value={productForm.stock}
                onChange={(e) => setProductForm({...productForm, stock: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label htmlFor="edit-minStock">Stock Mínimo</Label>
              <Input
                id="edit-minStock"
                type="number"
                value={productForm.minStock}
                onChange={(e) => setProductForm({...productForm, minStock: parseInt(e.target.value) || 1})}
              />
            </div>
            <div>
              <Label htmlFor="edit-image">URL de Imagen</Label>
              <Input
                id="edit-image"
                value={productForm.image}
                onChange={(e) => setProductForm({...productForm, image: e.target.value})}
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditingProduct(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEditProduct}>Guardar Cambios</Button>
          </div>
        </DialogContent>
      </Dialog>

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