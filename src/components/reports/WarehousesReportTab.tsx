import { useMemo, useState } from 'react';
import { useWarehouses } from '@/hooks/useWarehouses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Warehouse } from 'lucide-react';
import { fmtDate } from '@/utils/dates';
import { txTypeLabel, inRange, printReport } from '@/utils/reportPrint';

const TX_CLS: Record<string, string> = {
  loan:       'border-red-400 text-red-700',
  return:     'border-green-400 text-green-700',
  exchange:   'border-blue-400 text-blue-700',
  adjustment: 'border-gray-300 text-gray-600',
};

export default function WarehousesReportTab() {
  const { warehouses, transactions } = useWarehouses();

  const [wFrom, setWFrom] = useState('');
  const [wTo, setWTo] = useState('');
  const [wWarehouse, setWWarehouse] = useState('all');
  const [wType, setWType] = useState('all');

  const filteredTx = useMemo(() => {
    return transactions.filter(t => {
      if (!inRange(t.createdAt, wFrom, wTo)) return false;
      if (wWarehouse !== 'all' && t.warehouseId !== wWarehouse) return false;
      if (wType !== 'all' && t.type !== wType) return false;
      return true;
    });
  }, [transactions, wFrom, wTo, wWarehouse, wType]);

  function printWarehouses() {
    const rows = filteredTx.map(t => {
      const items = t.items.map(i => `${i.productName} (${i.quantity})`).join(', ');
      return `<tr><td>${fmtDate(t.createdAt)}</td><td>${t.warehouseName}</td><td>${txTypeLabel[t.type]}</td><td>${t.createdBy}</td><td>${items}</td><td>${t.notes || '-'}</td></tr>`;
    }).join('');
    printReport('Movimientos de Bodegas', `<table><thead><tr><th>Fecha</th><th>Bodega</th><th>Tipo</th><th>Usuario</th><th>Productos</th><th>Notas</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><Warehouse className="h-4 w-4" />Movimientos de Bodegas Externas</CardTitle>
          <Button size="sm" variant="outline" onClick={printWarehouses}><Printer className="h-4 w-4 mr-1" />Imprimir</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={wFrom} onChange={e => setWFrom(e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={wTo} onChange={e => setWTo(e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Bodega</Label>
            <Select value={wWarehouse} onValueChange={setWWarehouse}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={wType} onValueChange={setWType}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="loan">Préstamo</SelectItem>
                <SelectItem value="return">Devolución</SelectItem>
                <SelectItem value="exchange">Cambio</SelectItem>
                <SelectItem value="adjustment">Ajuste</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0"><tr className="bg-slate-800 text-white">
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Bodega</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Usuario</th>
              <th className="px-3 py-2 text-left">Productos</th>
              <th className="px-3 py-2 text-left">Notas</th>
            </tr></thead>
            <tbody>
              {filteredTx.map(t => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-1.5 text-gray-600">{fmtDate(t.createdAt)}</td>
                  <td className="px-3 py-1.5 font-medium">{t.warehouseName}</td>
                  <td className="px-3 py-1.5"><Badge variant="outline" className={TX_CLS[t.type] || ''}>{txTypeLabel[t.type]}</Badge></td>
                  <td className="px-3 py-1.5 text-gray-500">{t.createdBy}</td>
                  <td className="px-3 py-1.5 text-gray-700 text-xs">
                    {t.items.map((it, idx) => (
                      <span key={idx} className="mr-2">{it.productName} <b>×{it.quantity}</b></span>
                    ))}
                  </td>
                  <td className="px-3 py-1.5 text-gray-400 text-xs">{t.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTx.length === 0 && <p className="text-center text-gray-400 py-6 text-sm">Sin movimientos para los filtros seleccionados.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
