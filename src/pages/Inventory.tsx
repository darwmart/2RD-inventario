import { useState } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Package, Edit, Trash2, FolderPlus, Settings2, Edit2, Tag, Printer } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Product, LabelDesign, LabelField } from '@/types';
import ProductFormDialog from '@/components/ProductFormDialog';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// EAN-13 barcode bit-string generator (module-level, no React needed)
function ean13Bars(code: string): string {
  if (!/^\d{13}$/.test(code)) return '';
  const L = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
  const G = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
  const R = ['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
  const P = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
  const p = P[parseInt(code[0])];
  let bits = '101';
  for (let i = 0; i < 6; i++) bits += p[i] === 'L' ? L[parseInt(code[i+1])] : G[parseInt(code[i+1])];
  bits += '01010';
  for (let i = 0; i < 6; i++) bits += R[parseInt(code[i+7])];
  return bits + '101';
}


export default function Inventory() {
  const {
    products,
    categories,
    suppliers,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    addSupplier,
    getLowStockProducts
  } = useInventory();

  const { labelDesigns } = useSettings();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Estados para modal de categoría
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; description: string } | null>(null);

  // Estados para impresión de etiquetas
  const [isPrintLabelsOpen, setIsPrintLabelsOpen] = useState(false);
  const [printDesignId, setPrintDesignId] = useState('');
  const [printItems, setPrintItems] = useState<{ productId: string; qty: number }[]>([]);
  const [printSearch, setPrintSearch] = useState('');

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

  const openNewCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDescription('');
    setIsCategoryModalOpen(true);
  };

  const openEditCategory = (cat: { id: string; name: string; description: string }) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryDescription(cat.description || '');
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = () => {
    if (!categoryName.trim()) {
      toast.error('El nombre de la categoría es obligatorio');
      return;
    }

    // Nombre duplicado
    const dup = categories.find(c =>
      c.name.trim().toLowerCase() === categoryName.trim().toLowerCase() &&
      c.id !== editingCategory?.id
    );
    if (dup) { toast.error('Ya existe una categoría con ese nombre'); return; }

    if (editingCategory) {
      updateCategory(editingCategory.id, categoryName.trim(), categoryDescription.trim());
      toast.success('Categoría actualizada');
    } else {
      addCategory(categoryName.trim(), categoryDescription.trim());
      toast.success('Categoría creada correctamente');
    }
    setCategoryName('');
    setCategoryDescription('');
    setEditingCategory(null);
    setIsCategoryModalOpen(false);
  };

  const handleDeleteCategory = (cat: { id: string; name: string }) => {
    const inUse = products.some(p => p.categoryId === cat.id);
    if (inUse) { toast.error(`No puedes eliminar "${cat.name}" porque tiene artículos asignados`); return; }
    if (!confirm(`¿Eliminar la categoría "${cat.name}"?`)) return;
    deleteCategory(cat.id);
    if (selectedCategory === cat.id) setSelectedCategory('all');
    toast.success('Categoría eliminada');
  };

  // ── Impresión de etiquetas ──────────────────────────────────────────────────
  const openPrintLabels = () => {
    // Pre-cargar con el producto seleccionado (si existe)
    if (selectedProduct) {
      setPrintItems([{ productId: selectedProduct.id, qty: 1 }]);
    } else {
      setPrintItems([]);
    }
    const defaultDesign = labelDesigns.find(d => d.documentType === 'Etiquetas de artículos') || labelDesigns[0];
    setPrintDesignId(defaultDesign?.id || '');
    setPrintSearch('');
    setIsPrintLabelsOpen(true);
  };

  const togglePrintItem = (productId: string, checked: boolean) => {
    if (checked) {
      setPrintItems(prev => prev.some(i => i.productId === productId)
        ? prev
        : [...prev, { productId, qty: 1 }]);
    } else {
      setPrintItems(prev => prev.filter(i => i.productId !== productId));
    }
  };

  const updatePrintQty = (productId: string, qty: number) => {
    setPrintItems(prev => prev.map(i => i.productId === productId ? { ...i, qty: Math.max(1, qty) } : i));
  };

  const generatePrintHtml = (design: LabelDesign, items: { product: Product; qty: number }[]): string => {
    const lw = parseFloat(design.labelWidth.replace(',', '.')) || 75;
    const lh = parseFloat(design.labelHeight.replace(',', '.')) || 25;
    const cols = parseInt(design.labelsPerRow) || 3;
    const topM = parseFloat(design.topMargin.replace(',', '.')) || 12;
    const leftM = parseFloat(design.leftMargin.replace(',', '.')) || 5.6;
    const hGap = parseFloat(design.horizontalSpacing.replace(',', '.')) || 1;
    const vGap = parseFloat(design.verticalSpacing.replace(',', '.')) || 2;
    const fields: LabelField[] = design.fields || [];

    const labelHtml = (p: Product): string => {
      const fieldsHtml = fields.filter(f => f.visible).map(f => {
        const baseStyle = `position:absolute;left:${f.x}mm;top:${f.y}mm;width:${f.width}mm;height:${f.height}mm;`
          + `font-size:${f.fontSize}pt;font-weight:${f.bold ? 'bold' : 'normal'};`
          + `font-style:${f.italic ? 'italic' : 'normal'};`
          + `text-decoration:${f.underline ? 'underline' : 'none'};`
          + `text-align:${f.align};overflow:hidden;`;

        if (f.key === 'ean-barras') {
          const bits = ean13Bars(p.barcode);
          if (!bits) {
            return `<div style="${baseStyle}display:flex;align-items:center;justify-content:center;">
              <span style="font-size:5pt;font-family:monospace">${p.barcode || 'Sin EAN'}</span></div>`;
          }
          const bh = f.height * 0.72;
          const mw = f.width / 95;
          let rects = '';
          for (let i = 0; i < bits.length; i++) {
            if (bits[i] === '1') {
              rects += `<rect x="${(i * mw).toFixed(4)}" y="0" width="${(mw + 0.01).toFixed(4)}" height="${bh.toFixed(3)}" fill="black"/>`;
            }
          }
          const fs = Math.max(f.height * 0.2, 1.5);
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${f.width}mm" height="${f.height}mm" viewBox="0 0 ${f.width} ${f.height}">`
            + rects
            + `<text x="${(f.width / 2).toFixed(2)}" y="${(bh + fs * 1.1).toFixed(2)}" text-anchor="middle" font-family="monospace" font-size="${fs.toFixed(2)}">${p.barcode}</text>`
            + `</svg>`;
          return `<div style="${baseStyle}">${svg}</div>`;
        }

        let content = '';
        if (f.key === 'nombre') content = p.name;
        else if (f.key === 'referencia' || f.key === 'codigo') content = p.reference;
        else if (f.key === 'ean-texto') content = p.barcode || '';
        else if (f.key === 'precio1') content = `$${p.currentPrice.toLocaleString('es-CO')}`;
        else if (f.key === 'precio2') content = `$${p.suggestedPrice.toLocaleString('es-CO')}`;
        else if (f.key === 'precio3') content = `$${p.discountPrice.toLocaleString('es-CO')}`;
        else if (f.key === 'precio4') content = `$${p.wholesalePrice.toLocaleString('es-CO')}`;
        else if (f.key === 'categoria') content = categories.find(c => c.id === p.categoryId)?.name || '';
        else if (f.key === 'marca') content = '';
        else if (f.key === 'stock') content = String(p.stock);

        return `<div style="${baseStyle}display:flex;align-items:center;padding:0 0.3mm;">${content}</div>`;
      }).join('');
      return `<div style="position:relative;width:${lw}mm;height:${lh}mm;overflow:hidden;">${fieldsHtml}</div>`;
    };

    const allLabels: Product[] = [];
    items.forEach(({ product, qty }) => { for (let i = 0; i < qty; i++) allLabels.push(product); });

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Etiquetas</title>
<style>
  @page { size: A4 portrait; margin: ${topM}mm ${leftM}mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; }
  .grid { display: grid; grid-template-columns: repeat(${cols}, ${lw}mm); column-gap: ${hGap}mm; row-gap: ${vGap}mm; }
</style></head><body>
<div class="grid">${allLabels.map(labelHtml).join('')}</div>
</body></html>`;
  };

  const handlePrintLabels = () => {
    const design = labelDesigns.find(d => d.id === printDesignId);
    if (!design) { toast.error('Selecciona un diseño de etiqueta'); return; }
    const items = printItems.filter(i => i.qty > 0).map(i => ({
      product: products.find(p => p.id === i.productId)!,
      qty: i.qty,
    })).filter(i => !!i.product);
    if (!items.length) { toast.error('Selecciona al menos un artículo'); return; }
    const html = generatePrintHtml(design, items);
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 400); }
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
              <Button variant="outline" size="sm" onClick={openNewCategory}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Nueva Categoría
              </Button>
              <Button variant="outline" size="sm" onClick={openPrintLabels}>
                <Tag className="h-4 w-4 mr-2" />
                Imprimir Etiquetas
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
                  className={`group flex items-center justify-between px-3 py-2 text-sm rounded cursor-pointer ${
                    selectedCategory === category.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <span>📦 {category.name}</span>
                  <div className="hidden group-hover:flex gap-1">
                    <button
                      className="p-0.5 rounded hover:bg-blue-200 text-blue-600"
                      onClick={(e) => { e.stopPropagation(); openEditCategory(category); }}
                      title="Editar"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      className="p-0.5 rounded hover:bg-red-200 text-red-600"
                      onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category); }}
                      title="Eliminar"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
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
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
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
              {editingCategory ? (
                <><Edit2 className="h-4 w-4 mr-2" />Guardar cambios</>
              ) : (
                <><Plus className="h-4 w-4 mr-2" />Crear Categoría</>
              )}
            </Button>
          </div>
        </DialogContent>
        </Dialog>

        {/* Modal de Impresión de Etiquetas */}
        <Dialog open={isPrintLabelsOpen} onOpenChange={setIsPrintLabelsOpen}>
          <DialogContent className="max-w-[950px] w-[95vw] p-0 flex flex-col" style={{ height: '85vh', maxHeight: '85vh' }}>
            <DialogHeader className="px-4 pt-4 pb-2 border-b shrink-0">
              <DialogTitle className="flex items-center gap-2 text-base">
                <Tag className="h-4 w-4" />
                Imprimir Etiquetas
              </DialogTitle>
            </DialogHeader>

            {/* Selector de diseño */}
            <div className="px-4 py-2 border-b bg-gray-50 shrink-0 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-gray-600 whitespace-nowrap">Diseño de etiqueta:</Label>
                <Select value={printDesignId} onValueChange={setPrintDesignId}>
                  <SelectTrigger className="h-7 text-xs w-64">
                    <SelectValue placeholder="Selecciona un diseño..." />
                  </SelectTrigger>
                  <SelectContent>
                    {labelDesigns.map(d => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">
                        [{d.code}] {d.name} — {d.labelWidth}×{d.labelHeight}mm
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {printDesignId && (() => {
                const d = labelDesigns.find(x => x.id === printDesignId);
                return d ? (
                  <span className="text-xs text-gray-500">
                    {d.labelWidth}×{d.labelHeight}mm · {d.labelsPerRow}×{d.labelsPerColumn} por hoja
                  </span>
                ) : null;
              })()}
            </div>

            {/* Cuerpo: lista + vista previa */}
            <div className="flex flex-1 overflow-hidden">

              {/* Columna izquierda: lista de productos */}
              <div className="flex-1 flex flex-col overflow-hidden border-r">
                {/* Buscador dentro del diálogo */}
                <div className="px-3 py-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      className="pl-7 h-7 text-xs"
                      placeholder="Buscar artículo..."
                      value={printSearch}
                      onChange={e => setPrintSearch(e.target.value)}
                    />
                  </div>
                </div>

                {/* Acciones rápidas */}
                <div className="px-3 py-1 border-b flex gap-2 bg-gray-50">
                  <button
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() => {
                      const filtered = products.filter(p =>
                        !printSearch ||
                        p.name.toLowerCase().includes(printSearch.toLowerCase()) ||
                        p.reference.toLowerCase().includes(printSearch.toLowerCase())
                      );
                      setPrintItems(prev => {
                        const newItems = [...prev];
                        filtered.forEach(p => {
                          if (!newItems.some(i => i.productId === p.id)) {
                            newItems.push({ productId: p.id, qty: 1 });
                          }
                        });
                        return newItems;
                      });
                    }}
                  >Seleccionar todos</button>
                  <span className="text-gray-300">|</span>
                  <button
                    className="text-xs text-red-500 hover:underline"
                    onClick={() => setPrintItems([])}
                  >Limpiar selección</button>
                </div>

                {/* Tabla de productos */}
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-50 border-b">
                      <tr>
                        <th className="w-8 px-2 py-1"></th>
                        <th className="text-left px-2 py-1 font-medium text-gray-600">Artículo</th>
                        <th className="text-left px-2 py-1 font-medium text-gray-600 w-24">Ref / EAN</th>
                        <th className="text-right px-2 py-1 font-medium text-gray-600 w-20">Precio</th>
                        <th className="text-center px-2 py-1 font-medium text-gray-600 w-16">Cant.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {products
                        .filter(p => {
                          if (!printSearch) return true;
                          const s = printSearch.toLowerCase();
                          return p.name.toLowerCase().includes(s) ||
                            p.reference.toLowerCase().includes(s) ||
                            p.barcode.includes(printSearch);
                        })
                        .map(p => {
                          const item = printItems.find(i => i.productId === p.id);
                          const isChecked = !!item;
                          return (
                            <tr key={p.id} className={`hover:bg-gray-50 cursor-pointer ${isChecked ? 'bg-blue-50' : ''}`}
                              onClick={() => togglePrintItem(p.id, !isChecked)}>
                              <td className="px-2 py-1">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={v => togglePrintItem(p.id, !!v)}
                                  onClick={e => e.stopPropagation()}
                                />
                              </td>
                              <td className="px-2 py-1 font-medium max-w-[200px]">
                                <p className="truncate">{p.name}</p>
                              </td>
                              <td className="px-2 py-1 font-mono text-gray-500">
                                <p className="truncate">{p.reference}</p>
                                {p.barcode && <p className="text-[10px] text-gray-400 truncate">{p.barcode}</p>}
                              </td>
                              <td className="px-2 py-1 text-right text-gray-700">
                                ${p.currentPrice.toLocaleString('es-CO')}
                              </td>
                              <td className="px-2 py-1 text-center" onClick={e => e.stopPropagation()}>
                                {isChecked ? (
                                  <Input
                                    type="number" min="1" max="999"
                                    className="h-6 w-14 text-xs text-center px-1"
                                    value={item.qty}
                                    onChange={e => updatePrintQty(p.id, parseInt(e.target.value) || 1)}
                                  />
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Footer de la lista */}
                <div className="px-3 py-1.5 border-t bg-gray-50 text-xs text-gray-500 flex gap-4">
                  <span>{printItems.length} artículo{printItems.length !== 1 ? 's' : ''} seleccionado{printItems.length !== 1 ? 's' : ''}</span>
                  <span>Total etiquetas: <strong>{printItems.reduce((s, i) => s + i.qty, 0)}</strong></span>
                </div>
              </div>

              {/* Columna derecha: vista previa de etiqueta */}
              <div className="w-72 shrink-0 flex flex-col bg-gray-100">
                <div className="px-3 py-2 border-b bg-white">
                  <p className="text-xs font-medium text-gray-700">Vista previa</p>
                  <p className="text-[10px] text-gray-400">
                    {printItems.length > 0
                      ? products.find(p => p.id === printItems[0].productId)?.name || ''
                      : 'Selecciona un artículo'}
                  </p>
                </div>
                <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                  {(() => {
                    const design = labelDesigns.find(d => d.id === printDesignId);
                    const previewProduct = printItems.length > 0
                      ? products.find(p => p.id === printItems[0].productId)
                      : null;

                    if (!design) return (
                      <p className="text-xs text-gray-400 text-center">
                        Selecciona un diseño de etiqueta
                      </p>
                    );

                    const lw = parseFloat(design.labelWidth.replace(',', '.')) || 75;
                    const lh = parseFloat(design.labelHeight.replace(',', '.')) || 25;
                    const maxW = 230;
                    const maxH = 200;
                    const sc = Math.min(maxW / lw, maxH / lh, 10);
                    const fields: LabelField[] = design.fields || [];

                    const getFieldValue = (key: string, p: Product | null | undefined): string => {
                      if (!p) return key === 'nombre' ? 'Nombre artículo' : key === 'referencia' ? 'REF-001' : '—';
                      if (key === 'nombre') return p.name;
                      if (key === 'referencia' || key === 'codigo') return p.reference;
                      if (key === 'ean-texto') return p.barcode || '';
                      if (key === 'precio1') return `$${p.currentPrice.toLocaleString('es-CO')}`;
                      if (key === 'precio2') return `$${p.suggestedPrice.toLocaleString('es-CO')}`;
                      if (key === 'precio3') return `$${p.discountPrice.toLocaleString('es-CO')}`;
                      if (key === 'precio4') return `$${p.wholesalePrice.toLocaleString('es-CO')}`;
                      if (key === 'categoria') return categories.find(c => c.id === p.categoryId)?.name || '';
                      if (key === 'stock') return String(p.stock);
                      return '';
                    };

                    return (
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className="relative bg-white shadow"
                          style={{ width: lw * sc, height: lh * sc, border: '1.5px solid #444' }}
                        >
                          {fields.filter(f => f.visible).map(f => (
                            <div
                              key={f.key}
                              className="absolute overflow-hidden"
                              style={{
                                left: f.x * sc, top: f.y * sc,
                                width: f.width * sc, height: f.height * sc,
                                fontSize: Math.max(f.fontSize * sc / 6, 5),
                                fontWeight: f.bold ? 'bold' : 'normal',
                                fontStyle: f.italic ? 'italic' : 'normal',
                                textDecoration: f.underline ? 'underline' : 'none',
                                textAlign: f.align,
                                display: 'flex', alignItems: 'center',
                                padding: '0 1px',
                              }}
                            >
                              {f.key === 'ean-barras' ? (
                                <svg width="100%" height="100%">
                                  {previewProduct?.barcode && ean13Bars(previewProduct.barcode) ? (
                                    ean13Bars(previewProduct.barcode).split('').map((bit, i, arr) =>
                                      bit === '1' ? (
                                        <rect key={i}
                                          x={`${(i / arr.length * 100).toFixed(2)}%`}
                                          y="0" width={`${(1 / arr.length * 100).toFixed(2)}%`} height="75%"
                                          fill="black" />
                                      ) : null
                                    )
                                  ) : (
                                    [0,4,7,11,14,18,21,26,29,33].map((x, i) => (
                                      <rect key={i} x={`${(x/85*100).toFixed(1)}%`} width="1.5%" height="75%" fill="black"/>
                                    ))
                                  )}
                                  <text x="50%" y="92%" textAnchor="middle"
                                    fontSize={Math.max(f.fontSize * sc / 8, 4)}
                                    fontFamily="monospace">
                                    {previewProduct?.barcode || '0000000000000'}
                                  </text>
                                </svg>
                              ) : (
                                <span className="truncate w-full">
                                  {getFieldValue(f.key, previewProduct)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-400">{lw}×{lh}mm</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center border-t px-4 py-3 shrink-0 bg-gray-50">
              <p className="text-xs text-gray-500">
                Total: <strong>{printItems.reduce((s, i) => s + i.qty, 0)}</strong> etiqueta{printItems.reduce((s, i) => s + i.qty, 0) !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsPrintLabelsOpen(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handlePrintLabels}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              </div>
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