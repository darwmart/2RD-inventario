import { useState, useMemo } from 'react';
import { useSales } from '@/hooks/useSales';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TrendingUp, Users, DollarSign, ShoppingCart } from 'lucide-react';

type Period = 'day' | 'month' | 'year';

export default function AdvisorCommissions() {
  const { sales, advisors } = useSales();
  const [period, setPeriod] = useState<Period>('month');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [commissionRate, setCommissionRate] = useState(3); // % de comisión por defecto

  const toKey = (d: Date | string, p: Period) => {
    const date = new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    if (p === 'day') return `${y}-${m}-${dd}`;
    if (p === 'month') return `${y}-${m}`;
    return `${y}`;
  };

  const periodLabel = (p: Period) => {
    if (p === 'day') return selectedDate;
    if (p === 'month') return selectedDate;
    return selectedDate.slice(0, 4);
  };

  const filteredSales = useMemo(() => {
    return sales.filter(s =>
      s.type === 'sale' &&
      s.status !== 'cancelled' &&
      toKey(s.createdAt, period) === periodLabel(period)
    );
  }, [sales, period, selectedDate]);

  const commissionsByAdvisor = useMemo(() => {
    const map = new Map<string, {
      advisorId: string;
      advisorName: string;
      salesCount: number;
      totalSales: number;
      totalCost: number;
      totalProfit: number;
      commissionAmount: number;
      byPaymentType: { cash: number; electronic: number; credit: number };
    }>();

    filteredSales.forEach(sale => {
      const key = sale.advisorId;
      const cost = sale.items.reduce((sum, item) => sum + (item.cost || 0) * item.quantity, 0);
      const profit = sale.total - cost;

      if (!map.has(key)) {
        map.set(key, {
          advisorId: sale.advisorId,
          advisorName: sale.advisorName,
          salesCount: 0,
          totalSales: 0,
          totalCost: 0,
          totalProfit: 0,
          commissionAmount: 0,
          byPaymentType: { cash: 0, electronic: 0, credit: 0 },
        });
      }
      const entry = map.get(key)!;
      entry.salesCount += 1;
      entry.totalSales += sale.total;
      entry.totalCost += cost;
      entry.totalProfit += profit;
      entry.commissionAmount = Math.round(entry.totalSales * commissionRate / 100);
      const type = sale.paymentMethod?.type || 'cash';
      if (type === 'cash') entry.byPaymentType.cash += sale.total;
      else if (type === 'electronic') entry.byPaymentType.electronic += sale.total;
      else entry.byPaymentType.credit += sale.total;
    });

    return Array.from(map.values()).sort((a, b) => b.totalSales - a.totalSales);
  }, [filteredSales, commissionRate]);

  const totals = useMemo(() => ({
    salesCount: commissionsByAdvisor.reduce((s, a) => s + a.salesCount, 0),
    totalSales: commissionsByAdvisor.reduce((s, a) => s + a.totalSales, 0),
    totalProfit: commissionsByAdvisor.reduce((s, a) => s + a.totalProfit, 0),
    totalCommissions: commissionsByAdvisor.reduce((s, a) => s + a.commissionAmount, 0),
  }), [commissionsByAdvisor]);

  const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  const pct = (a: number, total: number) => total > 0 ? `${((a / total) * 100).toFixed(1)}%` : '0%';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Comisiones por Asesor</h1>
        <p className="text-gray-500 mt-1">Resumen de ventas y comisiones calculadas por periodo</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <Label>Periodo</Label>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Día</SelectItem>
              <SelectItem value="month">Mes</SelectItem>
              <SelectItem value="year">Año</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Fecha</Label>
          {period === 'day' && (
            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-44" />
          )}
          {period === 'month' && (
            <Input type="month" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-44" />
          )}
          {period === 'year' && (
            <Input type="number" min={2020} max={2099} value={selectedDate.slice(0, 4)} onChange={e => setSelectedDate(e.target.value)} className="w-28" />
          )}
        </div>
        <div>
          <Label>% Comisión base</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={commissionRate}
              onChange={e => setCommissionRate(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
        </div>
      </div>

      {/* Métricas generales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><ShoppingCart className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Ventas del periodo</p>
                <p className="text-2xl font-bold">{totals.salesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><DollarSign className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Total vendido</p>
                <p className="text-xl font-bold">{fmt(totals.totalSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><TrendingUp className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Utilidad bruta</p>
                <p className="text-xl font-bold">{fmt(totals.totalProfit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg"><Users className="h-5 w-5 text-orange-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Total comisiones ({commissionRate}%)</p>
                <p className="text-xl font-bold">{fmt(totals.totalCommissions)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla por asesor */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle por Asesor</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asesor</TableHead>
                <TableHead className="text-center">Ventas</TableHead>
                <TableHead className="text-right">Total vendido</TableHead>
                <TableHead className="text-right">Utilidad</TableHead>
                <TableHead className="text-center">% del total</TableHead>
                <TableHead className="text-right">Comisión ({commissionRate}%)</TableHead>
                <TableHead>Por tipo de pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissionsByAdvisor.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-gray-400">
                    Sin ventas en el periodo seleccionado
                  </TableCell>
                </TableRow>
              ) : (
                commissionsByAdvisor.map(advisor => (
                  <TableRow key={advisor.advisorId}>
                    <TableCell className="font-medium">{advisor.advisorName}</TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-blue-100 text-blue-800">{advisor.salesCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{fmt(advisor.totalSales)}</TableCell>
                    <TableCell className="text-right text-purple-700">{fmt(advisor.totalProfit)}</TableCell>
                    <TableCell className="text-center text-gray-600">{pct(advisor.totalSales, totals.totalSales)}</TableCell>
                    <TableCell className="text-right font-bold text-orange-700">{fmt(advisor.commissionAmount)}</TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        {advisor.byPaymentType.cash > 0 && <div className="text-green-700">Efectivo: {fmt(advisor.byPaymentType.cash)}</div>}
                        {advisor.byPaymentType.electronic > 0 && <div className="text-blue-700">Electrónico: {fmt(advisor.byPaymentType.electronic)}</div>}
                        {advisor.byPaymentType.credit > 0 && <div className="text-orange-700">Crédito: {fmt(advisor.byPaymentType.credit)}</div>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {commissionsByAdvisor.length > 0 && (
              <TableFooter>
                <TableRow className="font-bold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-center">{totals.salesCount}</TableCell>
                  <TableCell className="text-right">{fmt(totals.totalSales)}</TableCell>
                  <TableCell className="text-right">{fmt(totals.totalProfit)}</TableCell>
                  <TableCell className="text-center">100%</TableCell>
                  <TableCell className="text-right text-orange-700">{fmt(totals.totalCommissions)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
