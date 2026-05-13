import { useMemo, useState } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useProducts } from '@/hooks/queries/useProducts';
import { useAuth } from '@/contexts/AuthContext';
import { ExternalWarehouse, WarehouseTransactionType } from '@/types';
import { Button } from '@/components/ui/button';
import { Plus, Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import { exportToExcel, exportToPDF } from '@/utils/warehouseExports';
import WarehouseFormDialog, { WarehouseFormData } from '@/components/warehouses/WarehouseFormDialog';
import TransactionDialog, { TransactionItemRow } from '@/components/warehouses/TransactionDialog';
import WarehouseDetail from '@/components/warehouses/WarehouseDetail';
import WarehouseList from '@/components/warehouses/WarehouseList';

export default function Warehouses() {
  const { user, isAdmin } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const { products, updateStock } = useProducts();
  const { warehouses, transactions, addWarehouse, updateWarehouse, deleteWarehouse, addTransaction, deleteTransaction, getWarehouseStock } = useWarehouses();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedWarehouse = warehouses.find(w => w.id === selectedId) ?? null;

  const [warehouseFormOpen, setWarehouseFormOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<ExternalWarehouse | null>(null);

  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [txType, setTxType] = useState<WarehouseTransactionType>('loan');
  const [txPreloadedInItems, setTxPreloadedInItems] = useState<TransactionItemRow[] | undefined>();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const warehouseStock = useMemo(() => (selectedId ? getWarehouseStock(selectedId) : {}), [selectedId, transactions]);
  const warehouseTransactions = useMemo(() => transactions.filter(t => t.warehouseId === selectedId), [transactions, selectedId]);

  const handleSaveWarehouse = (data: WarehouseFormData) => {
    if (!data.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    const payload = {
      name: data.name.trim(),
      location: data.location.trim() || undefined,
      contact: data.contact.trim() || undefined,
      phone: data.phone.trim() || undefined,
      description: data.description.trim() || undefined,
    };
    if (editingWarehouse) {
      updateWarehouse(editingWarehouse.id, payload);
      toast.success('Bodega actualizada');
    } else {
      addWarehouse(payload);
      toast.success('Bodega creada');
    }
    setWarehouseFormOpen(false);
  };

  const handleDeleteWarehouse = async (w: ExternalWarehouse) => {
    if (!await confirm({ description: `¿Eliminar la bodega "${w.name}"? Se eliminarán todos sus movimientos.`, confirmLabel: 'Eliminar' })) return;
    deleteWarehouse(w.id);
    if (selectedId === w.id) setSelectedId(null);
    toast.success('Bodega eliminada');
  };

  const openTxDialog = (type: WarehouseTransactionType, preloadedInItems?: TransactionItemRow[]) => {
    setTxType(type);
    setTxPreloadedInItems(preloadedInItems);
    setTxDialogOpen(true);
  };

  const openExchangeFromStock = (productId: string) => {
    const info = warehouseStock[productId];
    if (!info) return;
    openTxDialog('exchange', [{
      key: productId + 'in', productId, productName: info.productName,
      barcode: info.barcode, reference: info.reference, quantity: 1,
      color: '', brand: '', size: '', direction: 'in',
    }]);
  };

  const handleSubmitTransaction = (items: TransactionItemRow[], inItems: TransactionItemRow[], notes: string, images: string[]) => {
    if (!selectedId) return;
    const allOut = txType === 'exchange' ? items.map(i => ({ ...i, direction: 'out' as const })) : items;
    const allIn = txType === 'exchange' ? inItems : [];
    if (allOut.length === 0 && allIn.length === 0) { toast.error('Agrega al menos un producto'); return; }
    if ([...allOut, ...allIn].some(i => i.quantity <= 0)) { toast.error('Las cantidades deben ser mayores a 0'); return; }
    if (txType === 'loan') {
      for (const item of allOut) {
        const product = products.find(p => p.id === item.productId);
        if (product && item.quantity > product.stock) {
          toast.error(`Stock insuficiente para "${item.productName}". Disponible: ${product.stock}`); return;
        }
      }
    }
    if (txType === 'return') {
      for (const item of allOut) {
        const stockQty = warehouseStock[item.productId]?.quantity ?? 0;
        if (item.quantity > stockQty) { toast.error(`No puedes devolver más de ${stockQty} uds. de "${item.productName}"`); return; }
      }
    }
    if (txType === 'exchange') {
      for (const item of allIn) {
        const stockQty = warehouseStock[item.productId]?.quantity ?? 0;
        if (item.quantity > stockQty) { toast.error(`"${item.productName}" no tiene ${item.quantity} uds. en esta bodega`); return; }
      }
    }
    const allItems = [...allOut, ...allIn];
    addTransaction(selectedId, txType, allItems, notes, user?.name || 'Sistema', images.length > 0 ? images : undefined);
    allOut.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return;
      if (txType === 'loan') updateStock(product.id, product.stock - item.quantity);
      else updateStock(product.id, product.stock + item.quantity);
    });
    const labels: Record<WarehouseTransactionType, string> = {
      loan: 'Préstamo registrado', return: 'Devolución registrada',
      adjustment: 'Ajuste registrado', exchange: 'Cambio registrado',
    };
    toast.success(labels[txType]);
    setTxDialogOpen(false);
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!await confirm({ description: '¿Eliminar este movimiento? El inventario principal NO se revertirá automáticamente.', confirmLabel: 'Eliminar' })) return;
    deleteTransaction(txId);
    toast.success('Movimiento eliminado');
  };

  return (
    <div className="p-6 h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Warehouse className="h-7 w-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bodegas Externas</h1>
            <p className="text-sm text-gray-500">Préstamos y cruces de inventario</p>
          </div>
        </div>
        {isAdmin() && (
          <Button onClick={() => { setEditingWarehouse(null); setWarehouseFormOpen(true); }} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />Nueva Bodega
          </Button>
        )}
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        <WarehouseList
          warehouses={warehouses}
          selectedId={selectedId}
          isAdmin={isAdmin()}
          getWarehouseStock={getWarehouseStock}
          onSelect={setSelectedId}
          onEdit={w => { setEditingWarehouse(w); setWarehouseFormOpen(true); }}
          onDelete={handleDeleteWarehouse}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {!selectedWarehouse ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-lg">
              <div className="text-center">
                <Warehouse className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Selecciona una bodega para ver su detalle</p>
              </div>
            </div>
          ) : (
            <WarehouseDetail
              warehouse={selectedWarehouse}
              warehouseStock={warehouseStock}
              warehouseTransactions={warehouseTransactions}
              isAdmin={isAdmin()}
              onOpenTxDialog={openTxDialog}
              onDeleteTransaction={handleDeleteTransaction}
              onExchangeFromStock={openExchangeFromStock}
              onExportExcel={() => exportToExcel(warehouseTransactions, selectedWarehouse.name)}
              onExportPDF={() => exportToPDF(warehouseTransactions, selectedWarehouse.name)}
            />
          )}
        </div>
      </div>

      <WarehouseFormDialog
        open={warehouseFormOpen}
        editingWarehouse={editingWarehouse}
        onClose={() => setWarehouseFormOpen(false)}
        onSave={handleSaveWarehouse}
      />

      {selectedWarehouse && (
        <TransactionDialog
          open={txDialogOpen}
          txType={txType}
          warehouseName={selectedWarehouse.name}
          warehouseStock={warehouseStock}
          products={products}
          preloadedInItems={txPreloadedInItems}
          onClose={() => setTxDialogOpen(false)}
          onSubmit={handleSubmitTransaction}
        />
      )}
      {ConfirmDialog}
    </div>
  );
}
