import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle } from 'lucide-react';
import { StockCount } from '@/types';
import { fmtDate } from '@/utils/dates';

interface Props {
  open: boolean;
  count: StockCount | null;
  onClose: () => void;
  onApply: (count: StockCount) => void;
}

const fmt = (n: number) => n.toLocaleString('es-CO');

export default function CountDetailDialog({ open, count, onClose, onApply }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalle conteo {count?.countNumber}</DialogTitle>
        </DialogHeader>
        {count && (
          <div className="space-y-4">
            <div className="flex gap-4 text-sm text-gray-500">
              <span>Fecha: {fmtDate(count.createdAt)}</span>
              {count.notes && <span>Notas: {count.notes}</span>}
              <Badge className={count.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                {count.status === 'completed' ? 'Aplicado' : 'Borrador'}
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
                  {count.items.filter(i => i.difference !== 0).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-gray-400">
                        Sin diferencias — inventario cuadrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    count.items.filter(i => i.difference !== 0).map(item => (
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
            {count.status === 'draft' && (
              <div className="flex justify-end">
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => onApply(count)}>
                  <CheckCircle className="h-4 w-4 mr-1" /> Aplicar y ajustar stock
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
