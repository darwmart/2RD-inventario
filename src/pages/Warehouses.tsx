import { useState, useMemo } from 'react';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useInventory } from '@/hooks/useInventory';
import { useAuth } from '@/contexts/AuthContext';
import { ExternalWarehouse, WarehouseTransactionItem, WarehouseTransactionType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, ArrowDownToLine, ArrowUpFromLine, Warehouse, Package, History, Search, X, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';

// ─── Warehouse form ────────────────────────────────────────────────────────────
interface WarehouseFormState {
  name: string;
  location: string;
  contact: string;
  phone: string;
  description: string;
}

const emptyWarehouseForm: WarehouseFormState = {
  name: '', location: '', contact: '', phone: '', description: '',
};

// ─── Transaction item row ──────────────────────────────────────────────────────
interface TransactionItemRow extends WarehouseTransactionItem {
  key: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(date: Date | string) {
  try {
    const d = new Date(date);
    return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return String(date);
  }
}

function typeBadge(type: WarehouseTransactionType) {
  if (type === 'loan') return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Préstamo</Badge>;
  if (type === 'return') return <Badge className="bg-green-100 text-green-700 border-green-200">Devolución</Badge>;
  return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Ajuste</Badge>;
}

// ══════════════════════════════════════════════════════════════════════════════
export default function Warehouses() {
  const { user, isAdmin } = useAuth();
  const { products, updateStock } = useInventory();
  const {
    warehouses, transactions,
    addWarehouse, updateWarehouse, deleteWarehouse,
    addTransaction, deleteTransaction,
    getWarehouseStock,
  } = useWarehouses();

  // ── Selected warehouse ──
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedWarehouse = warehouses.find(w => w.id === selectedId) ?? null;

  // ── Warehouse CRUD dialog ──
  const [warehouseDialog, setWarehouseDialog] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<ExternalWarehouse | null>(null);
  const [warehouseForm, setWarehouseForm] = useState<WarehouseFormState>(emptyWarehouseForm);

  // ── Transaction dialog ──
  const [txDialog, setTxDialog] = useState(false);
  const [txType, setTxType] = useState<WarehouseTransactionType>('loan');
  const [txItems, setTxItems] = useState<TransactionItemRow[]>([]);
  const [txNotes, setTxNotes] = useState('');
  const [productSearch, setProductSearch] = useState('');

  // ── Tab: stock vs history ──
  const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock');

  // ── Computed ──
  const warehouseStock = useMemo(
    () => (selectedId ? getWarehouseStock(selectedId) : {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedId, transactions]
  );

  const warehouseTransactions = useMemo(
    () => transactions.filter(t => t.warehouseId === selectedId),
    [transactions, selectedId]
  );

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.reference.toLowerCase().includes(q) ||
      p.barcode.includes(q)
    );
  }, [products, productSearch]);

  // ─── Warehouse dialog ────────────────────────────────────────────────────────
  const openCreateWarehouse = () => {
    setEditingWarehouse(null);
    setWarehouseForm(emptyWarehouseForm);
    setWarehouseDialog(true);
  };

  const openEditWarehouse = (w: ExternalWarehouse) => {
    setEditingWarehouse(w);
    setWarehouseForm({
      name: w.name,
      location: w.location || '',
      contact: w.contact || '',
      phone: w.phone || '',
      description: w.description || '',
    });
    setWarehouseDialog(true);
  };

  const handleSaveWarehouse = () => {
    if (!warehouseForm.name.trim()) {
      toast.error('El nombre de la bodega es obligatorio');
      return;
    }
    if (editingWarehouse) {
      updateWarehouse(editingWarehouse.id, {
        name: warehouseForm.name.trim(),
        location: warehouseForm.location.trim() || undefined,
        contact: warehouseForm.contact.trim() || undefined,
        phone: warehouseForm.phone.trim() || undefined,
        description: warehouseForm.description.trim() || undefined,
      });
      toast.success('Bodega actualizada');
    } else {
      addWarehouse({
        name: warehouseForm.name.trim(),
        location: warehouseForm.location.trim() || undefined,
        contact: warehouseForm.contact.trim() || undefined,
        phone: warehouseForm.phone.trim() || undefined,
        description: warehouseForm.description.trim() || undefined,
      });
      toast.success('Bodega creada');
    }
    setWarehouseDialog(false);
  };

  const handleDeleteWarehouse = (w: ExternalWarehouse) => {
    if (!confirm(`¿Eliminar la bodega "${w.name}"? Se eliminarán todos sus movimientos.`)) return;
    deleteWarehouse(w.id);
    if (selectedId === w.id) setSelectedId(null);
    toast.success('Bodega eliminada');
  };

  // ─── Transaction dialog ──────────────────────────────────────────────────────
  const openTxDialog = (type: WarehouseTransactionType) => {
    setTxType(type);
    setTxItems([]);
    setTxNotes('');
    setProductSearch('');
    setTxDialog(true);
  };

  const addItemToTx = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    if (txItems.some(i => i.productId === productId)) {
      toast.error('El producto ya está en la lista');
      return;
    }
    setTxItems(prev => [
      ...prev,
      {
        key: productId,
        productId: product.id,
        productName: product.name,
        barcode: product.barcode,
        reference: product.reference,
        quantity: 1,
      },
    ]);
    setProductSearch('');
  };

  const updateItemQty = (productId: string, qty: number) => {
    setTxItems(prev =>
      prev.map(i => (i.productId === productId ? { ...i, quantity: qty } : i))
    );
  };

  const removeItem = (productId: string) => {
    setTxItems(prev => prev.filter(i => i.productId !== productId));
  };

  const handleSubmitTransaction = () => {
    if (!selectedId) return;
    if (txItems.length === 0) {
      toast.error('Agrega al menos un producto');
      return;
    }
    if (txItems.some(i => i.quantity <= 0)) {
      toast.error('Las cantidades deben ser mayores a 0');
      return;
    }

    // Validate stock for loans
    if (txType === 'loan') {
      for (const item of txItems) {
        const product = products.find(p => p.id === item.productId);
        if (!product) continue;
        if (item.quantity > product.stock) {
          toast.error(`Stock insuficiente para "${item.productName}". Disponible: ${product.stock}`);
          return;
        }
      }
    }

    // Validate return quantities don't exceed what's at the warehouse
    if (txType === 'return') {
      for (const item of txItems) {
        const stockAtWarehouse = warehouseStock[item.productId]?.quantity ?? 0;
        if (item.quantity > stockAtWarehouse) {
          toast.error(`No puedes devolver más de ${stockAtWarehouse} unidades de "${item.productName}"`);
          return;
        }
      }
    }

    // Record the transaction
    addTransaction(selectedId, txType, txItems, txNotes, user?.name || 'Sistema');

    // Update main inventory stock
    txItems.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return;
      if (txType === 'loan') {
        updateStock(product.id, product.stock - item.quantity);
      } else if (txType === 'return') {
        updateStock(product.id, product.stock + item.quantity);
      } else {
        // adjustment: quantity is relative change (signed)
        updateStock(product.id, product.stock + item.quantity);
      }
    });

    const labels: Record<WarehouseTransactionType, string> = {
      loan: 'Préstamo registrado',
      return: 'Devolución registrada',
      adjustment: 'Ajuste registrado',
    };
    toast.success(labels[txType]);
    setTxDialog(false);
  };

  const handleDeleteTransaction = (txId: string) => {
    if (!confirm('¿Eliminar este movimiento? El inventario principal NO se revertirá automáticamente.')) return;
    deleteTransaction(txId);
    toast.success('Movimiento eliminado');
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
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
          <Button onClick={openCreateWarehouse} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Bodega
          </Button>
        )}
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* ── Warehouses list ── */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            Bodegas ({warehouses.length})
          </h2>
          {warehouses.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed rounded-lg">
              <Warehouse className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No hay bodegas registradas
            </div>
          )}
          <div className="flex flex-col gap-2 overflow-y-auto">
            {warehouses.map(w => {
              const stock = getWarehouseStock(w.id);
              const totalUnits = Object.values(stock).reduce((s, v) => s + v.quantity, 0);
              return (
                <div
                  key={w.id}
                  onClick={() => setSelectedId(w.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedId === w.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
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
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => openEditWarehouse(w)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-red-500 hover:text-red-600" onClick={() => handleDeleteWarehouse(w)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Warehouse detail ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedWarehouse ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-lg">
              <div className="text-center">
                <Warehouse className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Selecciona una bodega para ver su detalle</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              {/* Warehouse header */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedWarehouse.name}</h2>
                    <p className="text-sm text-gray-500">{selectedWarehouse.code}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-600">
                      {selectedWarehouse.location && <span>📍 {selectedWarehouse.location}</span>}
                      {selectedWarehouse.contact && <span>👤 {selectedWarehouse.contact}</span>}
                      {selectedWarehouse.phone && <span>📞 {selectedWarehouse.phone}</span>}
                    </div>
                    {selectedWarehouse.description && (
                      <p className="text-xs text-gray-500 mt-1">{selectedWarehouse.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                      onClick={() => openTxDialog('loan')}
                    >
                      <ArrowDownToLine className="h-4 w-4 mr-1" />
                      Préstamo
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-50"
                      onClick={() => openTxDialog('return')}
                    >
                      <ArrowUpFromLine className="h-4 w-4 mr-1" />
                      Devolución
                    </Button>
                    {isAdmin() && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        onClick={() => openTxDialog('adjustment')}
                      >
                        <SlidersHorizontal className="h-4 w-4 mr-1" />
                        Ajuste
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'stock'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('stock')}
                >
                  <Package className="inline h-4 w-4 mr-1" />
                  Stock en Bodega ({Object.keys(warehouseStock).length})
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'history'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('history')}
                >
                  <History className="inline h-4 w-4 mr-1" />
                  Historial ({warehouseTransactions.length})
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-auto">
                {activeTab === 'stock' && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {Object.keys(warehouseStock).length === 0 ? (
                      <div className="text-center py-10 text-gray-400 text-sm">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        No hay productos en esta bodega
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead>Referencia</TableHead>
                            <TableHead>Código de Barras</TableHead>
                            <TableHead className="text-right">Uds. en Bodega</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(warehouseStock).map(([productId, info]) => (
                            <TableRow key={productId}>
                              <TableCell className="font-medium">{info.productName}</TableCell>
                              <TableCell className="text-gray-500 text-sm">{info.reference || '-'}</TableCell>
                              <TableCell className="text-gray-500 text-sm font-mono">{info.barcode || '-'}</TableCell>
                              <TableCell className="text-right">
                                <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                                  {info.quantity}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {warehouseTransactions.length === 0 ? (
                      <div className="text-center py-10 text-gray-400 text-sm">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        Sin movimientos registrados
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Productos</TableHead>
                            <TableHead>Notas</TableHead>
                            <TableHead>Registrado por</TableHead>
                            {isAdmin() && <TableHead className="w-10" />}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {warehouseTransactions.map(tx => (
                            <TableRow key={tx.id}>
                              <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                                {formatDate(tx.createdAt)}
                              </TableCell>
                              <TableCell>{typeBadge(tx.type)}</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-0.5">
                                  {tx.items.map(item => (
                                    <span key={item.productId} className="text-sm">
                                      {item.quantity}× {item.productName}
                                    </span>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-gray-500">{tx.notes || '-'}</TableCell>
                              <TableCell className="text-sm text-gray-500">{tx.createdBy}</TableCell>
                              {isAdmin() && (
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                                    onClick={() => handleDeleteTransaction(tx.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Warehouse CRUD Dialog ── */}
      <Dialog open={warehouseDialog} onOpenChange={setWarehouseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingWarehouse ? 'Editar Bodega' : 'Nueva Bodega'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={warehouseForm.name}
                onChange={e => setWarehouseForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Bodega Norte"
              />
            </div>
            <div>
              <Label>Ubicación</Label>
              <Input
                value={warehouseForm.location}
                onChange={e => setWarehouseForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Dirección o referencia"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Persona de contacto</Label>
                <Input
                  value={warehouseForm.contact}
                  onChange={e => setWarehouseForm(f => ({ ...f, contact: e.target.value }))}
                  placeholder="Nombre"
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input
                  value={warehouseForm.phone}
                  onChange={e => setWarehouseForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Número"
                />
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={warehouseForm.description}
                onChange={e => setWarehouseForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Notas adicionales sobre esta bodega"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarehouseDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveWarehouse}>
              {editingWarehouse ? 'Guardar cambios' : 'Crear bodega'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Transaction Dialog ── */}
      <Dialog open={txDialog} onOpenChange={setTxDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {txType === 'loan' && 'Nuevo Préstamo'}
              {txType === 'return' && 'Devolución de Productos'}
              {txType === 'adjustment' && 'Ajuste de Inventario'}
              {selectedWarehouse && ` — ${selectedWarehouse.name}`}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Product search (for loan and adjustment) */}
            {(txType === 'loan' || txType === 'adjustment') && (
              <div>
                <Label>Buscar producto para agregar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-9"
                    placeholder="Nombre, referencia o código de barras..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                  />
                </div>
                {productSearch && (
                  <div className="mt-1 border border-gray-200 rounded-md shadow-sm max-h-40 overflow-y-auto bg-white">
                    {filteredProducts.length === 0 ? (
                      <p className="text-sm text-gray-400 p-3">Sin resultados</p>
                    ) : (
                      filteredProducts.slice(0, 10).map(p => (
                        <button
                          key={p.id}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex justify-between items-center"
                          onClick={() => addItemToTx(p.id)}
                        >
                          <span>{p.name} <span className="text-gray-400 text-xs">({p.reference})</span></span>
                          <span className="text-gray-500 text-xs">Stock: {p.stock}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* For returns: pick from warehouse stock */}
            {txType === 'return' && (
              <div>
                <Label>Productos en bodega — seleccionar para devolver</Label>
                {Object.keys(warehouseStock).length === 0 ? (
                  <p className="text-sm text-gray-400 mt-1">No hay productos en esta bodega</p>
                ) : (
                  <div className="border border-gray-200 rounded-md overflow-hidden mt-1">
                    {Object.entries(warehouseStock).map(([productId, info]) => {
                      const alreadyAdded = txItems.some(i => i.productId === productId);
                      return (
                        <button
                          key={productId}
                          disabled={alreadyAdded}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex justify-between items-center disabled:opacity-40 disabled:cursor-not-allowed border-b border-gray-100 last:border-0"
                          onClick={() => {
                            if (!alreadyAdded) {
                              setTxItems(prev => [
                                ...prev,
                                {
                                  key: productId,
                                  productId,
                                  productName: info.productName,
                                  barcode: info.barcode,
                                  reference: info.reference,
                                  quantity: 1,
                                },
                              ]);
                            }
                          }}
                        >
                          <span>{info.productName} <span className="text-gray-400 text-xs">({info.reference})</span></span>
                          <span className="text-orange-600 text-xs font-medium">{info.quantity} en bodega</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Items table */}
            {txItems.length > 0 && (
              <div>
                <Label>Productos seleccionados</Label>
                <div className="border border-gray-200 rounded-md overflow-hidden mt-1">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="w-28 text-right">Cantidad</TableHead>
                        <TableHead className="w-8" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {txItems.map(item => {
                        const maxQty = txType === 'return'
                          ? warehouseStock[item.productId]?.quantity ?? 999
                          : txType === 'loan'
                            ? products.find(p => p.id === item.productId)?.stock ?? 999
                            : 9999;
                        return (
                          <TableRow key={item.productId}>
                            <TableCell className="text-sm">{item.productName}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={txType === 'adjustment' ? -9999 : 1}
                                max={maxQty}
                                value={item.quantity}
                                onChange={e => updateItemQty(item.productId, Number(e.target.value))}
                                className="h-7 text-right w-24 ml-auto"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                                onClick={() => removeItem(item.productId)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {txType === 'adjustment' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Para ajuste: use valores positivos para añadir al inventario principal, negativos para descontar.
                  </p>
                )}
              </div>
            )}

            <div>
              <Label>Notas / Motivo</Label>
              <Textarea
                value={txNotes}
                onChange={e => setTxNotes(e.target.value)}
                placeholder="Descripción del movimiento..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTxDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmitTransaction}
              disabled={txItems.length === 0}
              className={
                txType === 'loan'
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : txType === 'return'
                    ? 'bg-green-600 hover:bg-green-700'
                    : ''
              }
            >
              {txType === 'loan' && 'Registrar Préstamo'}
              {txType === 'return' && 'Registrar Devolución'}
              {txType === 'adjustment' && 'Registrar Ajuste'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
