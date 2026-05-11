import { useMemo, useState } from 'react';
import { useSalesData } from '@/hooks/queries/useSalesData';
import { useAdvisors } from '@/hooks/queries/useAdvisors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, TrendingUp } from 'lucide-react';
import { fmtDate } from '@/utils/dates';
import { fmt, fmtNum, inRange, printReport } from '@/utils/reportPrint';

export default function SalesReportTab() {
  const { sales } = useSalesData();
  const { advisors } = useAdvisors();

  const [salesFrom, setSalesFrom] = useState('');
  const [salesTo, setSalesTo] = useState('');
  const [salesAdvisor, setSalesAdvisor] = useState('all');
  const [salesMethod, setSalesMethod] = useState('all');

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (s.status === 'cancelled') return false;
      if (!inRange(s.createdAt, salesFrom, salesTo)) return false;
      if (salesAdvisor !== 'all' && s.advisorId !== salesAdvisor) return false;
      if (salesMethod !== 'all' && s.paymentMethod?.type !== salesMethod) return false;
      return true;
    });
  }, [sales, salesFrom, salesTo, salesAdvisor, salesMethod]);

  const salesTotals = useMemo(() => {
    const total = filteredSales.reduce((s, v) => s + v.total, 0);
    const costo = filteredSales.reduce((s, v) => s + v.items.reduce((si, it) => si + it.cost * it.quantity, 0), 0);
    return { count: filteredSales.length, total, costo, utilidad: total - costo };
  }, [filteredSales]);

  function printSales() {
    const rows = filteredSales.map(s => {
      const costo = s.items.reduce((si, it) => si + it.cost * it.quantity, 0);
      const utilidad = s.total - costo;
      return `<tr><td>${s.saleNumber}</td><td>${fmtDate(s.createdAt)}</td><td>${s.advisorName}</td><td>${s.customerName || '-'}</td><td>${s.paymentMethod?.name || '-'}</td><td style="text-align:right">${fmt(s.total)}</td><td style="text-align:right">${fmt(costo)}</td><td style="text-align:right;color:green">${fmt(utilidad)}</td><td>${s.status === 'returned' ? 'Devuelta' : 'Completada'}</td></tr>`;
    }).join('');
    const summary = `<div class="summary"><div class="scard"><b>${fmtNum(salesTotals.count)}</b><span>Ventas</span></div><div class="scard"><b>${fmt(salesTotals.total)}</b><span>Total</span></div><div class="scard"><b>${fmt(salesTotals.costo)}</b><span>Costo</span></div><div class="scard"><b>${fmt(salesTotals.utilidad)}</b><span>Utilidad</span></div></div>`;
    printReport('Reporte de Ventas', `<table><thead><tr><th>#</th><th>Fecha</th><th>Asesor</th><th>Cliente</th><th>Método</th><th>Total</th><th>Costo</th><th>Utilidad</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table>`, summary);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" />Historial de Ventas</CardTitle>
          <Button size="sm" variant="outline" onClick={printSales}><Printer className="h-4 w-4 mr-1" />Imprimir</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={salesFrom} onChange={e => setSalesFrom(e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={salesTo} onChange={e => setSalesTo(e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Asesor</Label>
            <Select value={salesAdvisor} onValueChange={setSalesAdvisor}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {advisors.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Método de pago</Label>
            <Select value={salesMethod} onValueChange={setSalesMethod}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="electronic">Electrónico</SelectItem>
                <SelectItem value="credit">Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold">{fmtNum(salesTotals.count)}</p>
            <p className="text-xs text-gray-500">Ventas</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-green-700">{fmt(salesTotals.total)}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-orange-700">{fmt(salesTotals.costo)}</p>
            <p className="text-xs text-gray-500">Costo</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-blue-700">{fmt(salesTotals.utilidad)}</p>
            <p className="text-xs text-gray-500">Utilidad</p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0"><tr className="bg-slate-800 text-white">
              <th className="px-3 py-2 text-left">Número</th>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Asesor</th>
              <th className="px-3 py-2 text-left">Cliente</th>
              <th className="px-3 py-2 text-left">Método</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Costo</th>
              <th className="px-3 py-2 text-right">Utilidad</th>
              <th className="px-3 py-2 text-left">Estado</th>
            </tr></thead>
            <tbody>
              {filteredSales.map(s => {
                const costo = s.items.reduce((si, it) => si + it.cost * it.quantity, 0);
                const utilidad = s.total - costo;
                return (
                  <tr key={s.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-1.5 font-mono text-xs">{s.saleNumber}</td>
                    <td className="px-3 py-1.5 text-gray-600">{fmtDate(s.createdAt)}</td>
                    <td className="px-3 py-1.5">{s.advisorName}</td>
                    <td className="px-3 py-1.5 text-gray-500">{s.customerName || '-'}</td>
                    <td className="px-3 py-1.5 text-gray-500">{s.paymentMethod?.name || '-'}</td>
                    <td className="px-3 py-1.5 text-right font-semibold">{fmt(s.total)}</td>
                    <td className="px-3 py-1.5 text-right text-orange-700">{fmt(costo)}</td>
                    <td className="px-3 py-1.5 text-right font-semibold text-blue-700">{fmt(utilidad)}</td>
                    <td className="px-3 py-1.5">
                      <Badge variant="outline" className={s.status === 'returned' ? 'border-orange-400 text-orange-600' : 'border-green-400 text-green-700'}>
                        {s.status === 'returned' ? 'Devuelta' : 'Completada'}
                      </Badge>
                    </td>
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
