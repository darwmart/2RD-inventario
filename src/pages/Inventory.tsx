import { useMemo, useState } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import { useProducts, useCategories, useSuppliers } from '@/hooks/queries';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Product } from '@/types';
import ProductFormDialog from '@/components/ProductFormDialog';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import TableSkeleton from '@/components/ui/TableSkeleton';
import ProductTable from '@/components/inventory/ProductTable';
import ProductPreview from '@/components/inventory/ProductPreview';
import CategoryFormDialog from '@/components/inventory/CategoryFormDialog';
import PrintLabelsDialog from '@/components/inventory/PrintLabelsDialog';
import ColumnConfigDialog, { VisibleColumns } from '@/components/inventory/ColumnConfigDialog';
import InventoryToolbar from '@/components/inventory/InventoryToolbar';
import ImportProductsDialog from '@/components/inventory/ImportProductsDialog';
import type { CreateProductInput } from '@/domain/inventory';
import { Edit, Trash2 } from 'lucide-react';

const DEFAULT_COLUMNS: VisibleColumns = {
  code: true, description: true, barcode: true, category: true, stock: true,
  cost: true, suggestedPrice: true, currentPrice: true, discountPrice: true, wholesalePrice: true,
};

export default function Inventory() {
  const { products, addProduct, updateProduct, deleteProduct, isLoading: productsLoading } = useProducts();
  const { confirm, ConfirmDialog } = useConfirm();
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const { suppliers, addSupplier } = useSuppliers();
  const { labelDesigns } = useSettings();
  const { isAdmin } = useAuth();

  const [searchTerm, setSearchTerm]       = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddingProduct, setIsAddingProduct]   = useState(false);
  const [editingProduct, setEditingProduct]     = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct]   = useState<Product | null>(null);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory]   = useState<{ id: string; name: string; description: string } | null>(null);
  const [isPrintLabelsOpen, setIsPrintLabelsOpen] = useState(false);
  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useLocalStorage('inventoryVisibleColumns', DEFAULT_COLUMNS);

  const filteredProducts = useMemo(() => products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm);
    return matchesSearch && (selectedCategory === 'all' || p.categoryId === selectedCategory);
  }), [products, searchTerm, selectedCategory]);

  const handleSaveCategory = (name: string, description: string) => {
    if (editingCategory) {
      updateCategory(editingCategory.id, name, description);
    } else {
      addCategory(name, description);
    }
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
  };

  const handleDeleteCategory = async (cat: { id: string; name: string }) => {
    if (products.some(p => p.categoryId === cat.id)) {
      toast.error(`No puedes eliminar "${cat.name}" porque tiene artículos asignados`); return;
    }
    if (!await confirm({ description: `¿Eliminar la categoría "${cat.name}"?`, confirmLabel: 'Eliminar' })) return;
    deleteCategory(cat.id);
    if (selectedCategory === cat.id) setSelectedCategory('all');
  };

  const handleDeleteProduct = async (p: { id: string }) => {
    if (!await confirm({ description: '¿Estás seguro de eliminar este artículo?', confirmLabel: 'Eliminar' })) return;
    deleteProduct(p.id);
  };

  const handleSelectProduct = (p: Product) => {
    setSelectedProduct(p);
    if (window.innerWidth < 768) setMobilePreviewOpen(true);
  };

  // Props compartidos para ProductTable en ambos layouts
  const tableProps = {
    categories,
    visibleColumns,
    selectedCategory,
    onCategoryChange: setSelectedCategory,
    searchTerm,
    onSearchChange: setSearchTerm,
    onSelect: handleSelectProduct,
    onEdit: setEditingProduct,
    onDelete: handleDeleteProduct,
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex flex-col flex-1 min-h-0 p-2 md:pt-4 md:pr-6 md:pb-6 md:pl-px w-full max-w-[1600px] mx-auto">
        <InventoryToolbar
          onNewProduct={() => setIsAddingProduct(true)}
          onNewCategory={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }}
          onPrintLabels={() => setIsPrintLabelsOpen(true)}
          onColumnConfig={() => setIsColumnConfigOpen(true)}
          onImport={() => setIsImportOpen(true)}
        />

        {/* ── LAYOUT MÓVIL ─────────────────────────────────── */}
        <div className="md:hidden flex-1 min-h-0 flex flex-col overflow-hidden">
          {productsLoading
            ? <div className="p-4"><TableSkeleton rows={8} cols={2} /></div>
            : <ProductTable
                {...tableProps}
                products={filteredProducts}
                selectedProductId={selectedProduct?.id ?? null}
              />
          }
        </div>

        {/* ── LAYOUT DESKTOP ───────────────────────────────── */}
        <div className="hidden md:flex flex-1 min-h-0 gap-4">
          <div className="flex-1 flex gap-4 min-w-0 min-h-0">
            {productsLoading
              ? <div className="flex-1"><TableSkeleton rows={10} cols={7} /></div>
              : <ProductTable
                  {...tableProps}
                  products={filteredProducts}
                  selectedProductId={selectedProduct?.id ?? null}
                />
            }
            {selectedProduct && (
              <div className="w-73 border rounded bg-white shrink-0 flex flex-col">
                <div className="px-3 pt-2.5 pb-1.5 border-b shrink-0 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vista previa</p>
                  {isAdmin() && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                        onClick={() => setEditingProduct(selectedProduct)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                        onClick={() => handleDeleteProduct(selectedProduct)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <ProductPreview product={selectedProduct} />
              </div>
            )}
          </div>
        </div>

        {/* ── SHEET MÓVIL: detalle ─────────────────────────── */}
        <Sheet open={mobilePreviewOpen} onOpenChange={setMobilePreviewOpen}>
          <SheetContent side="bottom" className="h-[88dvh] p-0 rounded-t-2xl flex flex-col overflow-hidden">
            {selectedProduct && (
              <>
                <div className="px-3 pt-3 pb-2 border-b shrink-0 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate text-sm">{selectedProduct.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{selectedProduct.reference}</p>
                  </div>
                  {isAdmin() && (
                    <div className="flex gap-2 ml-3 shrink-0">
                      <Button size="sm" variant="outline" className="h-8"
                        onClick={() => { setMobilePreviewOpen(false); setEditingProduct(selectedProduct); }}>
                        <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                      </Button>
                      <Button size="sm" variant="ghost"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => { setMobilePreviewOpen(false); handleDeleteProduct(selectedProduct); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  <ProductPreview product={selectedProduct} />
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* ── DIÁLOGOS ─────────────────────────────────────── */}
        <ProductFormDialog
          open={isAddingProduct}
          onOpenChange={setIsAddingProduct}
          product={null}
          categories={categories}
          suppliers={suppliers}
          existingProducts={products}
          onSave={(data: CreateProductInput) => addProduct(data)}
          onAddCategory={(name, description) => addCategory(name, description)}
        />

        <ProductFormDialog
          open={!!editingProduct}
          onOpenChange={open => { if (!open) setEditingProduct(null); }}
          product={editingProduct}
          categories={categories}
          suppliers={suppliers}
          existingProducts={products}
          onSave={(data: CreateProductInput) => {
            if (editingProduct) { updateProduct(editingProduct.id, data); setEditingProduct(null); }
          }}
          onAddCategory={(name, description) => addCategory(name, description)}
        />

        <CategoryFormDialog
          open={isCategoryModalOpen}
          editingCategory={editingCategory}
          categories={categories}
          onClose={() => { setIsCategoryModalOpen(false); setEditingCategory(null); }}
          onSave={handleSaveCategory}
        />

        <PrintLabelsDialog
          open={isPrintLabelsOpen}
          products={products}
          categories={categories}
          labelDesigns={labelDesigns}
          initialProductId={selectedProduct?.id}
          onClose={() => setIsPrintLabelsOpen(false)}
        />

        <ColumnConfigDialog
          open={isColumnConfigOpen}
          visibleColumns={visibleColumns}
          onClose={() => setIsColumnConfigOpen(false)}
          onChange={setVisibleColumns}
        />

        <ImportProductsDialog
          open={isImportOpen}
          onOpenChange={setIsImportOpen}
        />

        {ConfirmDialog}
      </div>
    </div>
  );
}
