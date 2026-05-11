import { useMemo, useState } from 'react';
import { useProducts, useCategories, useSuppliers } from '@/hooks/queries';
import { useSettings } from '@/hooks/useSettings';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Product } from '@/types';
import ProductFormDialog from '@/components/ProductFormDialog';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import CategorySidebar from '@/components/inventory/CategorySidebar';
import ProductTable from '@/components/inventory/ProductTable';
import ProductPreview from '@/components/inventory/ProductPreview';
import CategoryFormDialog from '@/components/inventory/CategoryFormDialog';
import PrintLabelsDialog from '@/components/inventory/PrintLabelsDialog';
import ColumnConfigDialog, { VisibleColumns } from '@/components/inventory/ColumnConfigDialog';
import InventoryToolbar from '@/components/inventory/InventoryToolbar';
import type { CreateProductInput } from '@/domain/inventory';

const DEFAULT_COLUMNS: VisibleColumns = {
  code: true, description: true, barcode: true, category: true, stock: true,
  cost: true, suggestedPrice: true, currentPrice: true, discountPrice: true, wholesalePrice: true,
};

export default function Inventory() {
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const { suppliers, addSupplier } = useSuppliers();
  const { labelDesigns } = useSettings();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; description: string } | null>(null);
  const [isPrintLabelsOpen, setIsPrintLabelsOpen] = useState(false);
  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);
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

  const handleDeleteCategory = (cat: { id: string; name: string }) => {
    if (products.some(p => p.categoryId === cat.id)) {
      toast.error(`No puedes eliminar "${cat.name}" porque tiene artículos asignados`); return;
    }
    if (!confirm(`¿Eliminar la categoría "${cat.name}"?`)) return;
    deleteCategory(cat.id);
    if (selectedCategory === cat.id) setSelectedCategory('all');
  };

  return (
    <ScrollArea className="h-screen">
      <div className="p-6 max-w-[1400px] mx-auto">
        <InventoryToolbar
          onNewProduct={() => setIsAddingProduct(true)}
          onNewCategory={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }}
          onPrintLabels={() => setIsPrintLabelsOpen(true)}
          onColumnConfig={() => setIsColumnConfigOpen(true)}
        />

        <div className="flex h-[calc(100vh-140px)] gap-4">
          <CategorySidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
            onEdit={cat => { setEditingCategory(cat); setIsCategoryModalOpen(true); }}
            onDelete={handleDeleteCategory}
          />
          <div className="flex-1 flex gap-4">
            <ProductTable
              products={filteredProducts}
              categories={categories}
              visibleColumns={visibleColumns}
              selectedProductId={selectedProduct?.id ?? null}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onSelect={setSelectedProduct}
              onEdit={setEditingProduct}
              onDelete={p => { if (confirm('¿Estás seguro de eliminar este artículo?')) deleteProduct(p.id); }}
            />
            {selectedProduct && <ProductPreview product={selectedProduct} />}
          </div>
        </div>

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
            if (editingProduct) {
              updateProduct(editingProduct.id, data);
              setEditingProduct(null);
            }
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
      </div>
    </ScrollArea>
  );
}
