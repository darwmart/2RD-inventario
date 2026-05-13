import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { Product, StockCountItem } from '@/types';
import { fmtMoneyInput, parseMoney } from '@/utils/formatters';

type DraftItem = StockCountItem & { countedStr?: string };

interface Props {
  open: boolean;
  products: Product[];
  onClose: () => void;
  onSave: (items: StockCountItem[], notes?: string) => void;
}

export default function NewCountDialog({ open, products, onClose, onSave }: Props) {
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [countNotes, setCountNotes] = useState('');
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setDraftItems(products.map(p => ({
      productId: p.id,
      productName: p.name,
      barcode: p.barcode,
      reference: p.reference,
      systemStock: p.stock,
      countedStock: p.stock,
      difference: 0,
      countedStr: p.stock > 0 ? p.stock.toLocaleString('es-CO') : '0',
    })));
    setCountNotes('');
    setProductSearch('');
  }, [open, products]);

  const displayItems = useMemo(() => {
    if (!productSearch) return draftItems;
    const q = productSearch.toLowerCase();
    return draftItems.filter(i =>
      i.productName.toLowerCase().includes(q) ||
      (i.barcode || '').toLowerCase().includes(q) ||
      (i.reference || '').toLowerCase().includes(q)
    );
  }, [draftItems, productSearch]);

  const updateCountedStr = (productId: string, raw: string) => {
    const f = fmtMoneyInput(raw);
    const countedStock = Math.max(0, parseMoney(f));
    setDraftItems(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      return { ...item, countedStr: f, countedStock, difference: countedStock - item.systemStock };
    }));
  };

  const positives = draftItems.filter(i => i.difference > 0).length;
  const negatives = draftItems.filter(i => i.difference < 0).length;
  const fmt = (n: number) => n.toLocaleString('es-CO');

  return (
    <Dialog open={open} onOpenChange={onClose}>
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
              <p className="text-xl font-bold text-green-700">{positives}</p>
              <p className="text-xs text-gray-500">Sobrantes</p>
            </div>
            <div className="bg-red-50 rounded p-3">
              <p className="text-xl font-bold text-red-700">{negatives}</p>
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
                        type="text"
                        inputMode="numeric"
                        value={item.countedStr ?? item.countedStock.toLocaleString('es-CO')}
                        onChange={e => updateCountedStr(item.productId, e.target.value)}
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
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => onSave(draftItems, countNotes || undefined)} className="bg-blue-600 hover:bg-blue-700">
              Guardar conteo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
