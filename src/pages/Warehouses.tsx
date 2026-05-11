import { useMemo, useState } from 'react';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useInventory } from '@/hooks/useInventory';
import { useAuth } from '@/contexts/AuthContext';
import { ExternalWarehouse, WarehouseTransactionType } from '@/types';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import { exportToExcel, exportToPDF } from '@/utils/warehouseExports';
import WarehouseFormDialog, { WarehouseFormData } from '@/components/warehouses/WarehouseFormDialog';
import TransactionDialog, { TransactionItemRow } from '@/components/warehouses/TransactionDialog';
import WarehouseDetail from '@/components/warehouses/WarehouseDetail';

export default function Warehouses() {
  const { user, isAdmin } = useAuth();
  const { products, updateStock } = useInventory();
  const { warehouses, transactions, addWarehouse, updateWarehouse, deleteWarehouse, addTransaction, deleteTransaction, getWarehouseStock } = useWarehouses();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedWarehouse = warehouses.find(w => w.id === selectedId) ?? null;

  // Warehouse form dialog
  const [warehouseFormOpen, setWarehouseFormOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<ExternalWarehouse | null>(null);

  // Transaction dialog
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [txType, setTxType] = useState<WarehouseTransactionType>('loan');
  const [txPreloadedInItems, setTxPreloadedInItems] = useState<TransactionItemRow[] | undefined>();

  const warehouseStock = useMemo(
    () => (selectedId ? getWarehouseStock(selectedId) : {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedId, transactions]
  );

  const warehouseTransactions = useMemo(
    () => transactions.filter(t => t.warehouseId === selectedId),
    [transactions, selectedId]
  );

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

  const handleDeleteWarehouse = (w: ExternalWarehouse) => {
    if (!confirm(`¿Eliminar la bodega "${w.name}"? Se eliminarán todos sus movimientos.`)) return;
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
      else if (txType === 'exchange') updateStock(product.id, product.stock + item.quantity);
      else if (txType === 'return') updateStock(product.id, product.stock + item.quantity);
      else updateStock(product.id, product.stock + item.quantity);
    });

    const labels: Record<WarehouseTransactionType, string> = {
      loan: 'Préstamo registrado', return: 'Devolución registrada',
      adjustment: 'Ajuste registrado', exchange: 'Cambio registrado',
    };
    toast.success(labels[txType]);
    setTxDialogOpen(false);
  };

  const handleDeleteTransaction = (txId: string) => {
    if (!confirm('¿Eliminar este movimiento? El inventario principal NO se revertirá automáticamente.')) return;
    deleteTransaction(txId);
    toast.success('Movimiento eliminado');
  };

  return (
    <div className="p-6 h-full flex flex-col gap-6">
      {/* Header */}
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
        {/* Lista de bodegas */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Bodegas ({warehouses.length})</h2>
          {warehouses.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed rounded-lg">
              <Warehouse className="h-8 w-8 mx-auto mb-2 opacity-40" />No hay bodegas registradas
            </div>
          )}
          <div className="flex flex-col gap-2 overflow-y-auto">
            {warehouses.map(w => {
              const stock = getWarehouseStock(w.id);
              const totalUnits = Object.values(stock).reduce((s, v) => s + v.quantity, 0);
              return (
                <div key={w.id} onClick={() => setSelectedId(w.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedId === w.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'}`}>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{w.name}</p>
                      <p className="text-xs text-gray-400">{w.code}</p>
                      {w.location && <p className="text-xs text-gray-500 truncate">{w.location}</p>}
                    </div>
                    <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium ml-2 flex-shrink-0">
                      {totalUnits} uds
                    </span>
                  </div>
                  {isAdmin() && (
                    <div className="flex gap-1 mt-2" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs"
                        onClick={() => { setEditingWarehouse(w); setWarehouseFormOpen(true); }}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-red-500 hover:text-red-600"
                        onClick={() => handleDeleteWarehouse(w)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Detalle de bodega */}
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
    </div>
  );
}
