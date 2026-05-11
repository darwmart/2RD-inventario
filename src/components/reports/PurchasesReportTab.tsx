import { useMemo, useState } from 'react';
import { usePurchases } from '@/hooks/usePurchases';
import { useInventory } from '@/hooks/useInventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, ShoppingBag } from 'lucide-react';
import { fmtDate } from '@/utils/dates';
import { fmt, fmtNum, inRange, printReport } from '@/utils/reportPrint';

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pendiente',  cls: 'border-yellow-400 text-yellow-700' },
  partial:   { label: 'Parcial',    cls: 'border-orange-400 text-orange-700' },
  completed: { label: 'Pagada',     cls: 'border-green-400 text-green-700'  },
  invoiced:  { label: 'Facturada',  cls: 'border-blue-400 text-blue-700'    },
  cancelled: { label: 'Cancelada',  cls: 'border-gray-300 text-gray-500'    },
};

export default function PurchasesReportTab() {
  const { purchases } = usePurchases();
  const { suppliers } = useInventory();

  const [purFrom, setPurFrom] = useState('');
  const [purTo, setPurTo] = useState('');
  const [purSupp, setPurSupp] = useState('all');
  const [purStatus, setPurStatus] = useState('all');

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      if (!inRange(p.createdAt, purFrom, purTo)) return false;
      if (purSupp !== 'all' && p.supplierId !== purSupp) return false;
      if (purStatus !== 'all' && p.status !== purStatus) return false;
      return true;
    });
  }, [purchases, purFrom, purTo, purSupp, purStatus]);

  const purTotals = useMemo(() => ({
    count: filteredPurchases.length,
    total: filteredPurchases.reduce((s, p) => s + p.total, 0),
    pending: filteredPurchases.filter(p => p.status === 'pending' || p.status === 'partial').reduce((s, p) => s + p.total, 0),
  }), [filteredPurchases]);

  function printPurchases() {
    const rows = filteredPurchases.map(p => {
      const sc = STATUS_CONFIG[p.status] || { label: p.status, cls: '' };
      return `<tr><td>${p.documentNumber}</td><td>${fmtDate(p.createdAt)}</td><td>${p.supplierName}</td><td>${p.documentType === 'invoice' ? 'Factura' : 'Albarán'}</td><td>${sc.label}</td><td style="text-align:right">${fmt(p.total)}</td></tr>`;
    }).join('');
    const summary = `<div class="summary"><div class="scard"><b>${fmtNum(purTotals.count)}</b><span>Documentos</span></div><div class="scard"><b>${fmt(purTotals.total)}</b><span>Total</span></div><div class="scard"><b>${fmt(purTotals.pending)}</b><span>Por pagar</span></div></div>`;
    printReport('Reporte de Compras', `<table><thead><tr><th>Número</th><th>Fecha</th><th>Proveedor</th><th>Tipo</th><th>Estado</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>`, summary);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><ShoppingBag className="h-4 w-4" />Historial de Compras</CardTitle>
          <Button size="sm" variant="outline" onClick={printPurchases}><Printer className="h-4 w-4 mr-1" />Imprimir</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={purFrom} onChange={e => setPurFrom(e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={purTo} onChange={e => setPurTo(e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Proveedor</Label>
            <Select value={purSupp} onValueChange={setPurSupp}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.commercialName || s.fiscalName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Estado</Label>
            <Select value={purStatus} onValueChange={setPurStatus}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="partial">Parcial</SelectItem>
                <SelectItem value="completed">Pagada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold">{fmtNum(purTotals.count)}</p>
            <p className="text-xs text-gray-500">Documentos</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-blue-700">{fmt(purTotals.total)}</p>
            <p className="text-xs text-gray-500">Total compras</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-orange-700">{fmt(purTotals.pending)}</p>
            <p className="text-xs text-gray-500">Por pagar</p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0"><tr className="bg-slate-800 text-white">
              <th className="px-3 py-2 text-left">Número</th>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Proveedor</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr></thead>
            <tbody>
              {filteredPurchases.map(p => {
                const sc = STATUS_CONFIG[p.status] || { label: p.status, cls: '' };
                return (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-1.5 font-mono text-xs">{p.documentNumber}</td>
                    <td className="px-3 py-1.5 text-gray-600">{fmtDate(p.createdAt)}</td>
                    <td className="px-3 py-1.5">{p.supplierName}</td>
                    <td className="px-3 py-1.5 text-gray-500">{p.documentType === 'invoice' ? 'Factura' : 'Albarán'}</td>
                    <td className="px-3 py-1.5"><Badge variant="outline" className={sc.cls}>{sc.label}</Badge></td>
                    <td className="px-3 py-1.5 text-right font-semibold">{fmt(p.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
