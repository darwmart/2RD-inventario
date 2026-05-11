import { useState } from 'react';
import { useProducts } from '@/hooks/queries/useProducts';
import { useStockCount } from '@/hooks/useStockCount';
import { StockCount, StockCountItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import CountsList from '@/components/stockConciliation/CountsList';
import NewCountDialog from '@/components/stockConciliation/NewCountDialog';
import CountDetailDialog from '@/components/stockConciliation/CountDetailDialog';

export default function StockConciliation() {
  const { products, updateStock } = useProducts();
  const { stockCounts, createCount, completeCount, deleteCount } = useStockCount();

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCount, setSelectedCount] = useState<StockCount | null>(null);

  const handleSaveCount = (items: StockCountItem[], notes?: string) => {
    const newCount = createCount(items, notes);
    toast.success(`Conteo ${newCount.countNumber} creado`);
    setIsNewOpen(false);
  };

  const handleApplyCount = (count: StockCount) => {
    if (!confirm('¿Aplicar este conteo? El stock del sistema se ajustará a las cantidades contadas.')) return;
    count.items.forEach(item => {
      if (item.difference !== 0) updateStock(item.productId, item.countedStock);
    });
    completeCount(count.id);
    toast.success('Conteo aplicado. Stock actualizado.');
    setIsDetailOpen(false);
    setSelectedCount(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar este conteo?')) return;
    deleteCount(id);
    toast.success('Conteo eliminado');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Conciliación de Stock</h1>
          <p className="text-gray-500 mt-1">Conteo físico de inventario vs sistema</p>
        </div>
        <Button onClick={() => setIsNewOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Nuevo Conteo
        </Button>
      </div>

      <CountsList
        stockCounts={stockCounts}
        onDetail={count => { setSelectedCount(count); setIsDetailOpen(true); }}
        onApply={handleApplyCount}
        onDelete={handleDelete}
      />

      <NewCountDialog
        open={isNewOpen}
        products={products}
        onClose={() => setIsNewOpen(false)}
        onSave={handleSaveCount}
      />

      <CountDetailDialog
        open={isDetailOpen}
        count={selectedCount}
        onClose={() => setIsDetailOpen(false)}
        onApply={handleApplyCount}
      />
    </div>
  );
}
