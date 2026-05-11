import { useMemo } from 'react';
import { useSalesData } from '@/hooks/queries/useSalesData';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Customer } from '@/types';
import { fmtDate } from '@/utils/dates';

interface Props {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const STATUS_CLS: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  returned:  'bg-red-100 text-red-800',
  pending:   'bg-yellow-100 text-yellow-800',
};
const STATUS_LABEL: Record<string, string> = {
  completed: 'Completada', returned: 'Devuelta', pending: 'Pendiente',
};

export default function CustomerHistoryDialog({ open, customer, onClose }: Props) {
  const { sales } = useSalesData();

  const customerSales = useMemo(() => {
    if (!customer) return [];
    return sales.filter(s =>
      s.customerId === customer.id ||
      (s.customerDocument && customer.document && customer.document === s.customerDocument)
    );
  }, [customer, sales]);

  const totalSpent = customerSales.reduce((sum, s) => sum + s.total, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Historial de compras — {customer?.name}</DialogTitle>
        </DialogHeader>
        {customer && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{customerSales.length}</p>
                <p className="text-xs text-gray-500">Compras realizadas</p>
              </div>
              <div className="bg-green-50 rounded p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{fmt(totalSpent)}</p>
                <p className="text-xs text-gray-500">Total comprado</p>
              </div>
              <div className="bg-purple-50 rounded p-3 text-center">
                <p className="text-2xl font-bold text-purple-700">{fmt(customer.balance || 0)}</p>
                <p className="text-xs text-gray-500">Saldo a favor</p>
              </div>
            </div>
            <ScrollArea className="h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Venta</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Asesor</TableHead>
                    <TableHead>Método pago</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-gray-400">Sin compras registradas</TableCell>
                    </TableRow>
                  ) : (
                    customerSales.map(sale => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-mono text-sm">{sale.saleNumber}</TableCell>
                        <TableCell>{fmtDate(sale.createdAt)}</TableCell>
                        <TableCell>{sale.advisorName}</TableCell>
                        <TableCell>{sale.paymentMethod?.name}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(sale.total)}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_CLS[sale.status] || 'bg-gray-100 text-gray-600'}>
                            {STATUS_LABEL[sale.status] || sale.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
