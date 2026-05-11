import { useMemo, useState } from 'react';
import { useReturns } from '@/hooks/useReturns';
import { useAdvisors } from '@/hooks/queries/useAdvisors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, RotateCcw } from 'lucide-react';
import { fmtDate } from '@/utils/dates';
import { fmt, fmtNum, inRange, printReport } from '@/utils/reportPrint';

export default function ReturnsReportTab() {
  const { returns } = useReturns();
  const { advisors } = useAdvisors();

  const [retFrom, setRetFrom] = useState('');
  const [retTo, setRetTo] = useState('');
  const [retAdvisor, setRetAdvisor] = useState('all');

  const filteredReturns = useMemo(() => {
    return returns.filter(r => {
      if (!inRange(r.createdAt, retFrom, retTo)) return false;
      if (retAdvisor !== 'all' && r.advisorId !== retAdvisor) return false;
      return true;
    });
  }, [returns, retFrom, retTo, retAdvisor]);

  const retTotals = useMemo(() => ({
    count: filteredReturns.length,
    total: filteredReturns.reduce((s, r) => s + r.total, 0),
  }), [filteredReturns]);

  function printReturns() {
    const rows = filteredReturns.map(r =>
      `<tr><td>${r.returnNumber}</td><td>${fmtDate(r.createdAt)}</td><td>${r.saleNumber}</td><td>${r.advisorName}</td><td>${r.reason}</td><td style="text-align:right">${fmt(r.total)}</td></tr>`
    ).join('');
    const summary = `<div class="summary"><div class="scard"><b>${fmtNum(retTotals.count)}</b><span>Devoluciones</span></div><div class="scard"><b>${fmt(retTotals.total)}</b><span>Total devuelto</span></div></div>`;
    printReport('Reporte de Devoluciones', `<table><thead><tr><th>Número</th><th>Fecha</th><th>Venta origen</th><th>Asesor</th><th>Motivo</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>`, summary);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><RotateCcw className="h-4 w-4" />Devoluciones</CardTitle>
          <Button size="sm" variant="outline" onClick={printReturns}><Printer className="h-4 w-4 mr-1" />Imprimir</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={retFrom} onChange={e => setRetFrom(e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={retTo} onChange={e => setRetTo(e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Asesor</Label>
            <Select value={retAdvisor} onValueChange={setRetAdvisor}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {advisors.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold">{fmtNum(retTotals.count)}</p>
            <p className="text-xs text-gray-500">Devoluciones</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-orange-700">{fmt(retTotals.total)}</p>
            <p className="text-xs text-gray-500">Total devuelto</p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0"><tr className="bg-slate-800 text-white">
              <th className="px-3 py-2 text-left">Número</th>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Venta origen</th>
              <th className="px-3 py-2 text-left">Asesor</th>
              <th className="px-3 py-2 text-left">Motivo</th>
              <th className="px-3 py-2 text-left">Productos</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr></thead>
            <tbody>
              {filteredReturns.map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-1.5 font-mono text-xs">{r.returnNumber}</td>
                  <td className="px-3 py-1.5 text-gray-600">{fmtDate(r.createdAt)}</td>
                  <td className="px-3 py-1.5 font-mono text-xs">{r.saleNumber}</td>
                  <td className="px-3 py-1.5">{r.advisorName}</td>
                  <td className="px-3 py-1.5 text-gray-500 text-xs">{r.reason}</td>
                  <td className="px-3 py-1.5 text-xs text-gray-500">
                    {r.items.map((it, i) => <span key={i} className="mr-2">{it.productName} ×{it.quantity}</span>)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-semibold text-orange-700">{fmt(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredReturns.length === 0 && <p className="text-center text-gray-400 py-6 text-sm">Sin devoluciones para los filtros seleccionados.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
