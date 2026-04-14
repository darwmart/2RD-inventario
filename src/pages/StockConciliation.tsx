import { useState, useMemo } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { useStockCount } from '@/hooks/useStockCount';
import { StockCount, StockCountItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Plus, Search, CheckCircle, Trash2, ClipboardList, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from 'sonner';

export default function StockConciliation() {
  const { products, updateStock } = useInventory();
  const { stockCounts, createCount, updateCountItems, completeCount, deleteCount } = useStockCount();

  const [searchTerm, setSearchTerm] = useState('');
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCount, setSelectedCount] = useState<StockCount | null>(null);
  const [countNotes, setCountNotes] = useState('');
  const [draftItems, setDraftItems] = useState<StockCountItem[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) ||
      p.reference.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  const openNew = () => {
    setDraftItems(products.map(p => ({
      productId: p.id,
      productName: p.name,
      barcode: p.barcode,
      reference: p.reference,
      systemStock: p.stock,
      countedStock: p.stock, // starts equal so difference = 0
      difference: 0,
    })));
    setCountNotes('');
    setProductSearch('');
    setIsNewOpen(true);
  };

  const openDetail = (count: StockCount) => {
    setSelectedCount(count);
    setIsDetailOpen(true);
  };

  const updateCounted = (productId: string, value: number) => {
    setDraftItems(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      const countedStock = Math.max(0, value);
      return { ...item, countedStock, difference: countedStock - item.systemStock };
    }));
  };

  const handleCreateCount = () => {
    const newCount = createCount(draftItems, countNotes || undefined);
    toast.success(`Conteo ${newCount.countNumber} creado`);
    setIsNewOpen(false);
  };

  const handleApplyCount = (count: StockCount) => {
    if (!confirm('¿Aplicar este conteo? El stock del sistema se ajustará a las cantidades contadas.')) return;
    count.items.forEach(item => {
      if (item.difference !== 0) {
        updateStock(item.productId, item.countedStock);
      }
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

  const fmt = (n: number) => n.toLocaleString('es-CO');
  const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString('es-CO');

  const diffItems = draftItems.filter(i => i.difference !== 0);
  const positiveItems = draftItems.filter(i => i.difference > 0);
  const negativeItems = draftItems.filter(i => i.difference < 0);

  const displayItems = useMemo(() => {
    if (!productSearch) return draftItems;
    const q = productSearch.toLowerCase();
    return draftItems.filter(i =>
      i.productName.toLowerCase().includes(q) ||
      (i.barcode || '').toLowerCase().includes(q) ||
      (i.reference || '').toLowerCase().includes(q)
    );
  }, [draftItems, productSearch]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Conciliación de Stock</h1>
          <p className="text-gray-500 mt-1">Conteo físico de inventario vs sistema</p>
        </div>
        <Button onClick={openNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Nuevo Conteo
        </Button>
      </div>

      {/* Lista de conteos */}
      {stockCounts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No hay conteos registrados</p>
            <p className="text-sm">Crea un nuevo conteo para comparar el inventario físico con el sistema</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {stockCounts.map(count => {
            const positives = count.items.filter(i => i.difference > 0).length;
            const negatives = count.items.filter(i => i.difference < 0).length;
            const zeros = count.items.filter(i => i.difference === 0).length;
            return (
              <Card key={count.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-bold font-mono">{count.countNumber}</p>
                        <p className="text-sm text-gray-500">{fmtDate(count.createdAt)}</p>
                      </div>
                      <Badge className={count.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {count.status === 'completed' ? 'Aplicado' : 'Borrador'}
                      </Badge>
                      <div className="flex gap-3 text-sm">
                        <span className="text-green-600 flex items-center gap-1"><TrendingUp className="h-3 w-3" />{positives} sobrantes</span>
                        <span className="text-red-600 flex items-center gap-1"><TrendingDown className="h-3 w-3" />{negatives} faltantes</span>
                        <span className="text-gray-500 flex items-center gap-1"><Minus className="h-3 w-3" />{zeros} iguales</span>
                      </div>
                      {count.notes && <p className="text-sm text-gray-400 italic">"{count.notes}"</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openDetail(count)}>
                        Ver detalle
                      </Button>
                      {count.status === 'draft' && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApplyCount(count)}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Aplicar
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(count.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal nuevo conteo */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Nuevo Conteo de Inventario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50 rounded p-3">
                <p className="text-xl font-bold text-blue-700">{draftItems.length}</p>
                <p className="text-xs text-gray-500">Artículos</p>
              </div>
              <div className="bg-green-50 rounded p-3">
                <p className="text-xl font-bold text-green-700">{positiveItems.length}</p>
                <p className="text-xs text-gray-500">Sobrantes</p>
              </div>
              <div className="bg-red-50 rounded p-3">
                <p className="text-xl font-bold text-red-700">{negativeItems.length}</p>
                <p className="text-xs text-gray-500">Faltantes</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar producto..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Notas del conteo..."
                  value={countNotes}
                  onChange={e => setCountNotes(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Ref.</TableHead>
                    <TableHead className="text-center">Sistema</TableHead>
                    <TableHead className="text-center">Contado</TableHead>
                    <TableHead className="text-center">Diferencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayItems.map(item => (
                    <TableRow key={item.productId} className={item.difference !== 0 ? 'bg-yellow-50' : ''}>
                      <TableCell className="font-medium text-sm">{item.productName}</TableCell>
                      <TableCell className="text-xs text-gray-500">{item.reference || item.barcode}</TableCell>
                      <TableCell className="text-center">{fmt(item.systemStock)}</TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min={0}
                          value={item.countedStock}
                          onChange={e => updateCounted(item.productId, Number(e.target.value))}
                          className="w-20 text-center mx-auto h-7 text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold ${item.difference > 0 ? 'text-green-600' : item.difference < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {item.difference > 0 ? `+${item.difference}` : item.difference}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsNewOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateCount} className="bg-blue-600 hover:bg-blue-700">
                Guardar conteo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal detalle */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle conteo {selectedCount?.countNumber}</DialogTitle>
          </DialogHeader>
          {selectedCount && (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm text-gray-500">
                <span>Fecha: {fmtDate(selectedCount.createdAt)}</span>
                {selectedCount.notes && <span>Notas: {selectedCount.notes}</span>}
                <Badge className={selectedCount.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                  {selectedCount.status === 'completed' ? 'Aplicado' : 'Borrador'}
                </Badge>
              </div>
              <ScrollArea className="h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Sistema</TableHead>
                      <TableHead className="text-center">Contado</TableHead>
                      <TableHead className="text-center">Diferencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCount.items.filter(i => i.difference !== 0).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-gray-400">
                          Sin diferencias — inventario cuadrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedCount.items.filter(i => i.difference !== 0).map(item => (
                        <TableRow key={item.productId}>
                          <TableCell className="font-medium text-sm">{item.productName}</TableCell>
                          <TableCell className="text-center">{fmt(item.systemStock)}</TableCell>
                          <TableCell className="text-center">{fmt(item.countedStock)}</TableCell>
                          <TableCell className="text-center">
                            <span className={`font-bold ${item.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {item.difference > 0 ? `+${item.difference}` : item.difference}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
              {selectedCount.status === 'draft' && (
                <div className="flex justify-end">
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleApplyCount(selectedCount)}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Aplicar y ajustar stock
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
