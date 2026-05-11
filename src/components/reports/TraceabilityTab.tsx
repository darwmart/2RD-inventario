import { useMemo, useState } from 'react';
import { useProducts } from '@/hooks/queries/useProducts';
import { useSalesData } from '@/hooks/queries/useSalesData';
import { useReturns } from '@/hooks/useReturns';
import { usePurchasesData } from '@/hooks/queries/usePurchasesData';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useStockCount } from '@/hooks/useStockCount';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, Search, Activity } from 'lucide-react';
import { fmtDate } from '@/utils/dates';
import { fmt, fmtNum, txTypeLabel, printReport } from '@/utils/reportPrint';

export default function TraceabilityTab() {
  const { products } = useProducts();
  const { sales } = useSalesData();
  const { returns } = useReturns();
  const { purchases } = usePurchasesData();
  const { transactions } = useWarehouses();
  const { stockCounts } = useStockCount();

  const [traceSearch, setTraceSearch] = useState('');
  const [traceProductId, setTraceProductId] = useState('');

  const traceMatches = useMemo(() => {
    if (traceSearch.length < 2) return [];
    const q = traceSearch.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.reference?.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [products, traceSearch]);

  const traceProduct = products.find(p => p.id === traceProductId);

  const traceHistory = useMemo(() => {
    if (!traceProductId) return [];
    const rows: { date: Date; tipo: string; doc: string; ref2: string; qty: number; price: number; color: string }[] = [];

    purchases.forEach(pur => {
      pur.items.forEach(it => {
        if (it.productId === traceProductId)
          rows.push({ date: new Date(pur.createdAt), tipo: 'Compra', doc: pur.documentNumber, ref2: pur.supplierName, qty: it.quantity, price: it.unitCost, color: 'blue' });
      });
    });

    sales.filter(s => s.status !== 'cancelled').forEach(sale => {
      sale.items.forEach(it => {
        if (it.productId === traceProductId)
          rows.push({ date: new Date(sale.createdAt), tipo: 'Venta', doc: sale.saleNumber, ref2: sale.advisorName, qty: -it.quantity, price: it.unitPrice, color: 'green' });
      });
    });

    returns.forEach(ret => {
      ret.items.forEach(it => {
        if (it.productId === traceProductId)
          rows.push({ date: new Date(ret.createdAt), tipo: 'Devolución', doc: ret.returnNumber, ref2: ret.advisorName, qty: it.quantity, price: it.unitPrice, color: 'orange' });
      });
    });

    transactions.forEach(tx => {
      tx.items.forEach(it => {
        if (it.productId === traceProductId) {
          const qty = tx.type === 'loan' ? -it.quantity : it.quantity;
          rows.push({ date: new Date(tx.createdAt), tipo: txTypeLabel[tx.type], doc: tx.id.slice(0, 8), ref2: tx.warehouseName, qty, price: 0, color: 'purple' });
        }
      });
    });

    stockCounts.forEach(sc => {
      sc.items.forEach(it => {
        if (it.productId === traceProductId)
          rows.push({ date: new Date(sc.createdAt), tipo: 'Conteo', doc: sc.countNumber, ref2: sc.status === 'completed' ? 'Completado' : 'Borrador', qty: it.difference, price: 0, color: 'gray' });
      });
    });

    return rows.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [traceProductId, purchases, sales, returns, transactions, stockCounts]);

  function printTrace() {
    if (!traceProduct) return;
    const rows = traceHistory.map(r =>
      `<tr><td>${fmtDate(r.date)}</td><td>${r.tipo}</td><td>${r.doc}</td><td>${r.ref2}</td><td style="text-align:right">${r.qty > 0 ? '+' : ''}${r.qty}</td><td style="text-align:right">${r.price ? fmt(r.price) : '-'}</td></tr>`
    ).join('');
    printReport(
      `Trazabilidad — ${traceProduct.name}`,
      `<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Documento</th><th>Referencia</th><th>Cantidad</th><th>Precio</th></tr></thead><tbody>${rows}</tbody></table>`
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" />Trazabilidad de Producto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre, referencia o código de barras..."
            value={traceSearch}
            onChange={e => { setTraceSearch(e.target.value); setTraceProductId(''); }}
          />
          {traceMatches.length > 0 && !traceProductId && (
            <div className="absolute z-10 bg-white border rounded-md shadow-lg w-full mt-1 max-h-48 overflow-y-auto">
              {traceMatches.map(p => (
                <div key={p.id} className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm" onClick={() => { setTraceProductId(p.id); setTraceSearch(p.name); }}>
                  <span className="font-medium">{p.name}</span>
                  {p.reference && <span className="ml-2 text-gray-400 text-xs">Ref: {p.reference}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {traceProduct && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex gap-4 text-sm">
                <span className="text-gray-500">Ref: <b>{traceProduct.reference || '-'}</b></span>
                <span className="text-gray-500">Stock actual: <b>{fmtNum(traceProduct.stock)}</b> uds</span>
                <span className="text-gray-500">Costo: <b>{fmt(traceProduct.cost)}</b></span>
              </div>
              <Button size="sm" variant="outline" onClick={printTrace}><Printer className="h-4 w-4 mr-1" />Imprimir</Button>
            </div>

            {traceHistory.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">Sin movimientos registrados para este producto.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-800 text-white">
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Documento</th>
                    <th className="px-3 py-2 text-left">Referencia</th>
                    <th className="px-3 py-2 text-right">Cantidad</th>
                    <th className="px-3 py-2 text-right">Precio unit.</th>
                  </tr></thead>
                  <tbody>
                    {traceHistory.map((r, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-600">{fmtDate(r.date)}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={
                            r.color === 'blue' ? 'border-blue-400 text-blue-700' :
                            r.color === 'green' ? 'border-green-400 text-green-700' :
                            r.color === 'orange' ? 'border-orange-400 text-orange-700' :
                            r.color === 'purple' ? 'border-purple-400 text-purple-700' :
                            'border-gray-300 text-gray-600'
                          }>{r.tipo}</Badge>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{r.doc}</td>
                        <td className="px-3 py-2 text-gray-700">{r.ref2}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${r.qty < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {r.qty > 0 ? '+' : ''}{fmtNum(r.qty)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">{r.price ? fmt(r.price) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {!traceProduct && traceSearch.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">Busca un producto para ver su historial completo de movimientos.</p>
        )}
      </CardContent>
    </Card>
  );
}
