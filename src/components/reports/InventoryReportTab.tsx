import { useMemo, useState } from 'react';
import { useProducts, useCategories, useSuppliers } from '@/hooks/queries/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Package } from 'lucide-react';
import { fmt, fmtNum, printReport } from '@/utils/reportPrint';

export default function InventoryReportTab() {
  const { products } = useProducts();
  const { categories } = useCategories();
  const { suppliers } = useSuppliers();

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

  return (
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
  );
}
