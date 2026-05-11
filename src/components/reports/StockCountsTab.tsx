import { useMemo, useState } from 'react';
import { useStockCount } from '@/hooks/useStockCount';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, ClipboardList } from 'lucide-react';
import { fmtDate } from '@/utils/dates';
import { fmtNum, inRange, printReport } from '@/utils/reportPrint';

export default function StockCountsTab() {
  const { stockCounts } = useStockCount();

  const [scStatus, setScStatus] = useState('all');
  const [scFrom, setScFrom] = useState('');
  const [scTo, setScTo] = useState('');

  const filteredCounts = useMemo(() => {
    return stockCounts.filter(sc => {
      if (!inRange(sc.createdAt, scFrom, scTo)) return false;
      if (scStatus !== 'all' && sc.status !== scStatus) return false;
      return true;
    });
  }, [stockCounts, scStatus, scFrom, scTo]);

  function printCounts() {
    const rows = filteredCounts.flatMap(sc =>
      sc.items.map(it =>
        `<tr><td>${sc.countNumber}</td><td>${fmtDate(sc.createdAt)}</td><td>${sc.status === 'completed' ? 'Completado' : 'Borrador'}</td><td>${it.productName}</td><td style="text-align:right">${fmtNum(it.systemStock)}</td><td style="text-align:right">${fmtNum(it.countedStock)}</td><td style="text-align:right;color:${it.difference < 0 ? 'red' : it.difference > 0 ? 'green' : 'inherit'}">${it.difference > 0 ? '+' : ''}${fmtNum(it.difference)}</td></tr>`
      )
    ).join('');
    printReport('Conteos de Inventario', `<table><thead><tr><th>Número</th><th>Fecha</th><th>Estado</th><th>Producto</th><th>Stock Sistema</th><th>Stock Contado</th><th>Diferencia</th></tr></thead><tbody>${rows}</tbody></table>`);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="h-4 w-4" />Conteos de Inventario</CardTitle>
          <Button size="sm" variant="outline" onClick={printCounts}><Printer className="h-4 w-4 mr-1" />Imprimir</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={scFrom} onChange={e => setScFrom(e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={scTo} onChange={e => setScTo(e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Estado</Label>
            <Select value={scStatus} onValueChange={setScStatus}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3 max-h-[460px] overflow-y-auto">
          {filteredCounts.length === 0 && <p className="text-center text-gray-400 py-6 text-sm">Sin conteos para los filtros seleccionados.</p>}
          {filteredCounts.map(sc => {
            const diffs = sc.items.filter(i => i.difference !== 0);
            const totalDiff = sc.items.reduce((s, i) => s + Math.abs(i.difference), 0);
            return (
              <div key={sc.id} className="border rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold">{sc.countNumber}</span>
                    <span className="text-gray-500 text-xs">{fmtDate(sc.createdAt)}</span>
                    <Badge variant="outline" className={sc.status === 'completed' ? 'border-green-400 text-green-700' : 'border-yellow-400 text-yellow-700'}>
                      {sc.status === 'completed' ? 'Completado' : 'Borrador'}
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>{sc.items.length} productos</span>
                    {diffs.length > 0 && <span className="text-orange-600 font-medium">{diffs.length} con diferencias ({totalDiff} uds)</span>}
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-100 text-gray-600">
                    <th className="px-3 py-1.5 text-left text-xs">Producto</th>
                    <th className="px-3 py-1.5 text-right text-xs">Stock sistema</th>
                    <th className="px-3 py-1.5 text-right text-xs">Contado</th>
                    <th className="px-3 py-1.5 text-right text-xs">Diferencia</th>
                  </tr></thead>
                  <tbody>
                    {sc.items.filter(i => i.difference !== 0).map((it, idx) => (
                      <tr key={idx} className="border-t bg-orange-50">
                        <td className="px-3 py-1.5">{it.productName}</td>
                        <td className="px-3 py-1.5 text-right">{fmtNum(it.systemStock)}</td>
                        <td className="px-3 py-1.5 text-right">{fmtNum(it.countedStock)}</td>
                        <td className={`px-3 py-1.5 text-right font-semibold ${it.difference < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {it.difference > 0 ? '+' : ''}{fmtNum(it.difference)}
                        </td>
                      </tr>
                    ))}
                    {sc.items.filter(i => i.difference === 0).map((it, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-1.5 text-gray-600">{it.productName}</td>
                        <td className="px-3 py-1.5 text-right text-gray-500">{fmtNum(it.systemStock)}</td>
                        <td className="px-3 py-1.5 text-right text-gray-500">{fmtNum(it.countedStock)}</td>
                        <td className="px-3 py-1.5 text-right text-gray-400">0</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
