import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { Product } from '@/types';
import type { PurchaseDocument } from '@/types/purchase';

interface Props {
  products: Product[];
  purchases: PurchaseDocument[];
}

export default function OperationalAlertsWidget({ products, purchases }: Props) {
  const now = new Date();
  const todayMidnight = new Date(now); todayMidnight.setHours(0, 0, 0, 0);
  const in3Days = new Date(now); in3Days.setDate(now.getDate() + 3); in3Days.setHours(23, 59, 59, 999);

  const zeroStock = products.filter(p => p.stock <= 0);

  const pendingInvoices = purchases.filter(
    p => p.documentType === 'invoice' && (p.status === 'pending' || p.status === 'partial')
  );

  const overdue = pendingInvoices.filter(p => {
    const due = p.paymentDetails?.dueDate;
    if (!due) return false;
    return new Date(due) < todayMidnight;
  });

  const dueSoon = pendingInvoices.filter(p => {
    const due = p.paymentDetails?.dueDate;
    if (!due) return false;
    const d = new Date(due);
    return d >= todayMidnight && d <= in3Days;
  });

  const total = zeroStock.length + overdue.length + dueSoon.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          Alertas Operacionales
          {total > 0 && (
            <Badge variant="destructive" className="ml-auto text-xs">{total}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {total === 0 && (
          <p className="text-sm text-green-600 font-medium">Sin alertas activas</p>
        )}

        {zeroStock.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-600 mb-1">Sin stock ({zeroStock.length})</p>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {zeroStock.map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs py-0.5">
                  <span className="truncate text-gray-700">{p.name}</span>
                  <Badge variant="outline" className="border-red-400 text-red-600 text-xs ml-2 shrink-0">0</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {overdue.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-600 mb-1">Facturas vencidas ({overdue.length})</p>
            <div className="space-y-1">
              {overdue.map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs py-0.5">
                  <span className="truncate text-gray-700">{p.supplierName} — {p.documentNumber}</span>
                  <span className="text-red-600 font-semibold ml-2 shrink-0">
                    ${p.total.toLocaleString('es-CO')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {dueSoon.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-orange-500 mb-1">Vencen en 3 días ({dueSoon.length})</p>
            <div className="space-y-1">
              {dueSoon.map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs py-0.5">
                  <span className="truncate text-gray-700">{p.supplierName} — {p.documentNumber}</span>
                  <span className="text-orange-600 font-semibold ml-2 shrink-0">
                    ${p.total.toLocaleString('es-CO')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
