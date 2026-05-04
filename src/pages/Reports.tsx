import { useState, useMemo } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { useSales } from '@/hooks/useSales';
import { useReturns } from '@/hooks/useReturns';
import { usePurchases } from '@/hooks/usePurchases';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useStockCount } from '@/hooks/useStockCount';
import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Printer, Search, TrendingDown, TrendingUp, Package, ShoppingBag, Warehouse, RotateCcw, ClipboardList, Activity } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;
const fmtNum = (n: number) => Math.round(n).toLocaleString('es-CO');
const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });

function printReport(title: string, tableHtml: string, summaryHtml = '') {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:12px;margin:20px;color:#111}
    h2{margin-bottom:4px;font-size:16px}
    .sub{color:#555;font-size:11px;margin-bottom:12px}
    .summary{display:flex;gap:24px;margin-bottom:14px}
    .scard{border:1px solid #ddd;border-radius:6px;padding:8px 16px;min-width:120px}
    .scard b{display:block;font-size:18px}
    .scard span{font-size:10px;color:#666}
    table{border-collapse:collapse;width:100%;font-size:11px}
    th{background:#1e293b;color:#fff;padding:6px 8px;text-align:left}
    tr:nth-child(even){background:#f8fafc}
    td{padding:5px 8px;border-bottom:1px solid #e2e8f0}
    @media print{button{display:none}}
  </style></head><body>
  <h2>${title}</h2>
  <p class="sub">Generado el ${new Date().toLocaleString('es-CO')}</p>
  ${summaryHtml}
  ${tableHtml}
  <script>window.onload=()=>{window.print();}<\/script>
  </body></html>`);
  w.document.close();
}

function inRange(date: Date | string, from: string, to: string) {
  const d = new Date(date).toISOString().slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

const txTypeLabel: Record<string, string> = {
  loan: 'Préstamo',
  return: 'Devolución',
  adjustment: 'Ajuste',
  exchange: 'Cambio',
};

// ─────────────────────────────────────────────────────────────────────────────
export default function Reports() {
  const { products, categories, suppliers } = useInventory();
  const { sales, advisors } = useSales();
  const { returns } = useReturns();
  const { purchases } = usePurchases();
  const { warehouses, transactions } = useWarehouses();
  const { stockCounts } = useStockCount();
  const { banks } = useSettings();

  // ── Trazabilidad ────────────────────────────────────────────────────────────
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
        if (it.productId === traceProductId) {
          rows.push({ date: new Date(pur.createdAt), tipo: 'Compra', doc: pur.documentNumber, ref2: pur.supplierName, qty: it.quantity, price: it.unitCost, color: 'blue' });
        }
      });
    });

    sales.filter(s => s.status !== 'cancelled').forEach(sale => {
      sale.items.forEach(it => {
        if (it.productId === traceProductId) {
          rows.push({ date: new Date(sale.createdAt), tipo: 'Venta', doc: sale.saleNumber, ref2: sale.advisorName, qty: -it.quantity, price: it.unitPrice, color: 'green' });
        }
      });
    });

    returns.forEach(ret => {
      ret.items.forEach(it => {
        if (it.productId === traceProductId) {
          rows.push({ date: new Date(ret.createdAt), tipo: 'Devolución', doc: ret.returnNumber, ref2: ret.advisorName, qty: it.quantity, price: it.unitPrice, color: 'orange' });
        }
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
        if (it.productId === traceProductId) {
          rows.push({ date: new Date(sc.createdAt), tipo: 'Conteo', doc: sc.countNumber, ref2: sc.status === 'completed' ? 'Completado' : 'Borrador', qty: it.difference, price: 0, color: 'gray' });
        }
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

  // ── Inventario ──────────────────────────────────────────────────────────────
  const [invCat, setInvCat] = useState('all');
  const [invSupp, setInvSupp] = useState('all');
  const [invLow, setInvLow] = useState(false);
  const [invSearch, setInvSearch] = useState('');

  const filteredInventory = useMemo(() => {
    return products.filter(p => {
      if (invCat !== 'all' && p.categoryId !== invCat) return false;
      if (invSupp !== 'all' && p.supplierId !== invSupp) return false;
      if (invLow && p.stock > p.minStock) return false;
      if (invSearch) {
        const q = invSearch.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.reference?.toLowerCase().includes(q) && !p.barcode?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [products, invCat, invSupp, invLow, invSearch]);

  const invTotals = useMemo(() => ({
    items: filteredInventory.length,
    units: filteredInventory.reduce((s, p) => s + p.stock, 0),
    value: filteredInventory.reduce((s, p) => s + p.stock * p.cost, 0),
  }), [filteredInventory]);

  function printInventory() {
    const rows = filteredInventory.map(p => {
      const cat = categories.find(c => c.id === p.categoryId)?.name || '-';
      const sup = suppliers.find(s => s.id === p.supplierId);
      const supName = sup ? (sup.commercialName || sup.fiscalName) : '-';
      return `<tr><td>${p.reference || '-'}</td><td>${p.name}</td><td>${p.barcode || '-'}</td><td>${cat}</td><td>${supName}</td><td style="text-align:right">${fmtNum(p.stock)}</td><td style="text-align:right">${fmtNum(p.minStock)}</td><td style="text-align:right">${fmt(p.cost)}</td><td style="text-align:right">${fmt(p.currentPrice)}</td></tr>`;
    }).join('');
    const summary = `<div class="summary"><div class="scard"><b>${fmtNum(invTotals.items)}</b><span>Productos</span></div><div class="scard"><b>${fmtNum(invTotals.units)}</b><span>Unidades</span></div><div class="scard"><b>${fmt(invTotals.value)}</b><span>Valor total</span></div></div>`;
    printReport('Inventario', `<table><thead><tr><th>Ref.</th><th>Nombre</th><th>Código Barras</th><th>Categoría</th><th>Proveedor</th><th>Stock</th><th>Mín.</th><th>Costo</th><th>Precio</th></tr></thead><tbody>${rows}</tbody></table>`, summary);
  }

  // ── Ventas ──────────────────────────────────────────────────────────────────
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

  const salesTotals = useMemo(() => ({
    count: filteredSales.length,
    total: filteredSales.reduce((s, v) => s + v.total, 0),
    avg: filteredSales.length ? filteredSales.reduce((s, v) => s + v.total, 0) / filteredSales.length : 0,
  }), [filteredSales]);

  function printSales() {
    const rows = filteredSales.map(s =>
      `<tr><td>${s.saleNumber}</td><td>${fmtDate(s.createdAt)}</td><td>${s.advisorName}</td><td>${s.customerName || '-'}</td><td>${s.paymentMethod?.name || '-'}</td><td style="text-align:right">${fmt(s.total)}</td><td>${s.status === 'returned' ? 'Devuelta' : 'Completada'}</td></tr>`
    ).join('');
    const summary = `<div class="summary"><div class="scard"><b>${fmtNum(salesTotals.count)}</b><span>Ventas</span></div><div class="scard"><b>${fmt(salesTotals.total)}</b><span>Total</span></div><div class="scard"><b>${fmt(salesTotals.avg)}</b><span>Promedio</span></div></div>`;
    printReport('Reporte de Ventas', `<table><thead><tr><th>#</th><th>Fecha</th><th>Asesor</th><th>Cliente</th><th>Método</th><th>Total</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table>`, summary);
  }

  // ── Compras ─────────────────────────────────────────────────────────────────
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
      const statusLabel: Record<string, string> = { pending: 'Pendiente', partial: 'Parcial', completed: 'Pagada', invoiced: 'Facturada', cancelled: 'Cancelada' };
      return `<tr><td>${p.documentNumber}</td><td>${fmtDate(p.createdAt)}</td><td>${p.supplierName}</td><td>${p.documentType === 'invoice' ? 'Factura' : 'Albarán'}</td><td>${statusLabel[p.status] || p.status}</td><td style="text-align:right">${fmt(p.total)}</td></tr>`;
    }).join('');
    const summary = `<div class="summary"><div class="scard"><b>${fmtNum(purTotals.count)}</b><span>Documentos</span></div><div class="scard"><b>${fmt(purTotals.total)}</b><span>Total</span></div><div class="scard"><b>${fmt(purTotals.pending)}</b><span>Por pagar</span></div></div>`;
    printReport('Reporte de Compras', `<table><thead><tr><th>Número</th><th>Fecha</th><th>Proveedor</th><th>Tipo</th><th>Estado</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>`, summary);
  }

  // ── Bodegas ─────────────────────────────────────────────────────────────────
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

  // ── Devoluciones ────────────────────────────────────────────────────────────
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

  // ── Conteos de Stock ────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Informes</h1>
        <p className="mt-1 text-gray-500 text-sm">Historial, trazabilidad y reportes del sistema</p>
      </div>

      <Tabs defaultValue="trazabilidad" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="trazabilidad" className="flex items-center gap-1"><Activity className="h-3.5 w-3.5" />Trazabilidad</TabsTrigger>
          <TabsTrigger value="inventario" className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />Inventario</TabsTrigger>
          <TabsTrigger value="ventas" className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />Ventas</TabsTrigger>
          <TabsTrigger value="compras" className="flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" />Compras</TabsTrigger>
          <TabsTrigger value="bodegas" className="flex items-center gap-1"><Warehouse className="h-3.5 w-3.5" />Bodegas</TabsTrigger>
          <TabsTrigger value="devoluciones" className="flex items-center gap-1"><RotateCcw className="h-3.5 w-3.5" />Devoluciones</TabsTrigger>
          <TabsTrigger value="conteos" className="flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" />Conteos</TabsTrigger>
        </TabsList>

        {/* ── TRAZABILIDAD ── */}
        <TabsContent value="trazabilidad">
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
        </TabsContent>

        {/* ── INVENTARIO ── */}
        <TabsContent value="inventario">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base"><Package className="h-4 w-4" />Inventario Actual</CardTitle>
                <Button size="sm" variant="outline" onClick={printInventory}><Printer className="h-4 w-4 mr-1" />Imprimir</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Buscar</Label>
                  <Input placeholder="Nombre, ref, código..." value={invSearch} onChange={e => setInvSearch(e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Categoría</Label>
                  <Select value={invCat} onValueChange={setInvCat}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Proveedor</Label>
                  <Select value={invSupp} onValueChange={setInvSupp}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.commercialName || s.fiscalName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={invLow} onChange={e => setInvLow(e.target.checked)} className="rounded" />
                    Solo bajo stock
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{fmtNum(invTotals.items)}</p>
                  <p className="text-xs text-gray-500">Productos</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{fmtNum(invTotals.units)}</p>
                  <p className="text-xs text-gray-500">Unidades</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{fmt(invTotals.value)}</p>
                  <p className="text-xs text-gray-500">Valor en costo</p>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0"><tr className="bg-slate-800 text-white">
                    <th className="px-3 py-2 text-left">Ref.</th>
                    <th className="px-3 py-2 text-left">Nombre</th>
                    <th className="px-3 py-2 text-left">Categoría</th>
                    <th className="px-3 py-2 text-right">Stock</th>
                    <th className="px-3 py-2 text-right">Mín.</th>
                    <th className="px-3 py-2 text-right">Costo</th>
                    <th className="px-3 py-2 text-right">Precio</th>
                  </tr></thead>
                  <tbody>
                    {filteredInventory.map(p => {
                      const cat = categories.find(c => c.id === p.categoryId)?.name || '-';
                      const low = p.stock <= p.minStock;
                      return (
                        <tr key={p.id} className={`border-b hover:bg-gray-50 ${low ? 'bg-red-50' : ''}`}>
                          <td className="px-3 py-1.5 text-gray-500 text-xs">{p.reference || '-'}</td>
                          <td className="px-3 py-1.5 font-medium">{p.name}</td>
                          <td className="px-3 py-1.5 text-gray-500">{cat}</td>
                          <td className={`px-3 py-1.5 text-right font-semibold ${low ? 'text-red-600' : ''}`}>{fmtNum(p.stock)}</td>
                          <td className="px-3 py-1.5 text-right text-gray-400">{fmtNum(p.minStock)}</td>
                          <td className="px-3 py-1.5 text-right">{fmt(p.cost)}</td>
                          <td className="px-3 py-1.5 text-right">{fmt(p.currentPrice)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── VENTAS ── */}
        <TabsContent value="ventas">
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

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{fmtNum(salesTotals.count)}</p>
                  <p className="text-xs text-gray-500">Ventas</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-green-700">{fmt(salesTotals.total)}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{fmt(salesTotals.avg)}</p>
                  <p className="text-xs text-gray-500">Promedio</p>
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
                    <th className="px-3 py-2 text-left">Estado</th>
                  </tr></thead>
                  <tbody>
                    {filteredSales.map(s => (
                      <tr key={s.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-1.5 font-mono text-xs">{s.saleNumber}</td>
                        <td className="px-3 py-1.5 text-gray-600">{fmtDate(s.createdAt)}</td>
                        <td className="px-3 py-1.5">{s.advisorName}</td>
                        <td className="px-3 py-1.5 text-gray-500">{s.customerName || '-'}</td>
                        <td className="px-3 py-1.5 text-gray-500">{s.paymentMethod?.name || '-'}</td>
                        <td className="px-3 py-1.5 text-right font-semibold">{fmt(s.total)}</td>
                        <td className="px-3 py-1.5">
                          <Badge variant="outline" className={s.status === 'returned' ? 'border-orange-400 text-orange-600' : 'border-green-400 text-green-700'}>
                            {s.status === 'returned' ? 'Devuelta' : 'Completada'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── COMPRAS ── */}
        <TabsContent value="compras">
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
                      const statusConfig: Record<string, { label: string; cls: string }> = {
                        pending: { label: 'Pendiente', cls: 'border-yellow-400 text-yellow-700' },
                        partial: { label: 'Parcial', cls: 'border-orange-400 text-orange-700' },
                        completed: { label: 'Pagada', cls: 'border-green-400 text-green-700' },
                        invoiced: { label: 'Facturada', cls: 'border-blue-400 text-blue-700' },
                        cancelled: { label: 'Cancelada', cls: 'border-gray-300 text-gray-500' },
                      };
                      const sc = statusConfig[p.status] || { label: p.status, cls: '' };
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
        </TabsContent>

        {/* ── BODEGAS ── */}
        <TabsContent value="bodegas">
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
                    {filteredTx.map(t => {
                      const txCls: Record<string, string> = { loan: 'border-red-400 text-red-700', return: 'border-green-400 text-green-700', exchange: 'border-blue-400 text-blue-700', adjustment: 'border-gray-300 text-gray-600' };
                      return (
                        <tr key={t.id} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-1.5 text-gray-600">{fmtDate(t.createdAt)}</td>
                          <td className="px-3 py-1.5 font-medium">{t.warehouseName}</td>
                          <td className="px-3 py-1.5"><Badge variant="outline" className={txCls[t.type] || ''}>{txTypeLabel[t.type]}</Badge></td>
                          <td className="px-3 py-1.5 text-gray-500">{t.createdBy}</td>
                          <td className="px-3 py-1.5 text-gray-700 text-xs">
                            {t.items.map((it, idx) => (
                              <span key={idx} className="mr-2">{it.productName} <b>×{it.quantity}</b></span>
                            ))}
                          </td>
                          <td className="px-3 py-1.5 text-gray-400 text-xs">{t.notes || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredTx.length === 0 && <p className="text-center text-gray-400 py-6 text-sm">Sin movimientos para los filtros seleccionados.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── DEVOLUCIONES ── */}
        <TabsContent value="devoluciones">
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
        </TabsContent>

        {/* ── CONTEOS ── */}
        <TabsContent value="conteos">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
