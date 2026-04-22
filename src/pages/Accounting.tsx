import { useMemo, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Banknote, ArrowDownCircle, ArrowUpCircle, ShoppingBag,
  ArrowRightLeft, Calculator, TrendingUp, Calendar,
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useSales } from '@/hooks/useSales';
import { useSettings } from '@/hooks/useSettings';
import { useExpenses } from '@/hooks/useExpenses';
import { usePurchases } from '@/hooks/usePurchases';
import { AccountingRecord } from '@/types';
import { formatDateToKey } from '@/hooks/useExpenses';

// ─── Tipo interno de movimiento unificado ────────────────────────────────────
type Movement = {
  id: string;
  date: Date;
  type: 'venta' | 'abono' | 'gasto' | 'compra' | 'traspaso' | 'apertura';
  description: string;
  amount: number;
  bank: string;
  bankLabel: string;
  direction: 'in' | 'out';
};

export default function Accounting() {
  const { sales, paymentMethods } = useSales();
  const { banks, cardSettings } = useSettings();
  const { expenses } = useExpenses();
  const { purchases } = usePurchases();
  const [accountingRecords] = useLocalStorage<AccountingRecord[]>('accountingRecords', []);

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterBank, setFilterBank] = useState('all');

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const getBankLabel = (bankId: string) => {
    if (bankId === 'efectivo') return 'Efectivo';
    return banks.find(b => b.id === bankId)?.name ?? bankId;
  };

  const mapPaymentToBank = (paymentName: string, paymentType: string): string => {
    if (paymentType === 'cash') return 'efectivo';
    const name = paymentName.toLowerCase();
    const matched = banks.find(b => b.isActive && b.id !== 'efectivo' && name.includes(b.name.toLowerCase()));
    if (matched) return matched.id;
    const firstNonCash = banks.find(b => b.isActive && b.id !== 'efectivo');
    return firstNonCash?.id ?? 'efectivo';
  };

  const netAmount = (amount: number, paymentName: string): number => {
    const name = paymentName.toLowerCase();
    let net = amount;
    if (cardSettings.commissionsEnabled) {
      if (name.includes('débito')) net -= amount * cardSettings.debitCommission / 100;
      else if (name.includes('crédito')) net -= amount * cardSettings.creditCommission / 100;
    }
    if (cardSettings.reteivaEnabled && (name.includes('débito') || name.includes('crédito'))) {
      net -= amount * cardSettings.reteiva / 100;
    }
    return Math.round(net);
  };

  // ─── Construir lista unificada de movimientos ──────────────────────────────
  const allMovements = useMemo((): Movement[] => {
    const list: Movement[] = [];

    // 1. Ventas completadas
    sales
      .filter(s => s.status === 'completed' && s.type === 'sale')
      .forEach(s => {
        const bank = mapPaymentToBank(s.paymentMethod.name, s.paymentMethod.type);
        list.push({
          id: `sale-${s.id}`,
          date: new Date(s.createdAt),
          type: 'venta',
          description: `Venta #${s.saleNumber ?? ''} — ${s.items.map(i => i.productName).join(', ')}`,
          amount: netAmount(s.total, s.paymentMethod.name),
          bank,
          bankLabel: getBankLabel(bank),
          direction: 'in',
        });
      });

    // 2. Abonos de separados
    sales
      .filter(s => s.type === 'reserved')
      .forEach(s => {
        if (s.deposits && s.deposits.length > 0) {
          s.deposits.forEach(d => {
            const pmName = d.method?.name ?? s.paymentMethod.name;
            const pmType = d.method?.type ?? s.paymentMethod.type;
            const bank = mapPaymentToBank(pmName, pmType);
            list.push({
              id: `deposit-${s.id}-${d.createdAt}`,
              date: new Date(d.createdAt),
              type: 'abono',
              description: `Abono separado — ${s.items?.map(i => i.productName).join(', ') ?? ''}`,
              amount: netAmount(d.amount, pmName),
              bank,
              bankLabel: getBankLabel(bank),
              direction: 'in',
            });
          });
        } else if (s.deposit && s.deposit > 0) {
          const bank = mapPaymentToBank(s.paymentMethod.name, s.paymentMethod.type);
          list.push({
            id: `deposit-${s.id}`,
            date: new Date(s.createdAt),
            type: 'abono',
            description: `Abono separado — ${s.items?.map(i => i.productName).join(', ') ?? ''}`,
            amount: netAmount(s.deposit, s.paymentMethod.name),
            bank,
            bankLabel: getBankLabel(bank),
            direction: 'in',
          });
        }
      });

    // 3. Gastos y préstamos
    expenses.forEach(e => {
      list.push({
        id: `expense-${e.id}`,
        date: new Date(e.createdAt),
        type: 'gasto',
        description: `${e.type === 'prestamo' ? 'Préstamo' : 'Gasto'} — ${e.description} (${e.advisor})`,
        amount: e.amount,
        bank: 'efectivo',
        bankLabel: 'Efectivo',
        direction: 'out',
      });
    });

    // 4. Compras a proveedores
    purchases
      .filter(p => p.status !== 'cancelled')
      .forEach(p => {
        const isCredit = p.paymentMethod?.type === 'credit' || p.paymentDetails?.dueDate;
        if (isCredit) return; // crédito aún no sale del banco
        const isCash = p.paymentDetails?.isCashPayment || p.paymentMethod?.type === 'cash';
        const bank = isCash
          ? 'efectivo'
          : (p.paymentDetails?.bankId ?? 'efectivo');
        list.push({
          id: `purchase-${p.id}`,
          date: new Date(p.createdAt),
          type: 'compra',
          description: `Compra — ${p.supplierName} Factura: ${p.supplierInvoiceNumber ?? p.documentNumber}`,
          amount: p.total,
          bank,
          bankLabel: getBankLabel(bank),
          direction: 'out',
        });
      });

    // 5. Traspasos desde Arqueo de Caja → ingresan a Caja Fuerte
    // Las aperturas de caja son internas del Arqueo y no afectan la contabilidad
    accountingRecords.forEach(r => {
      if (r.tipo === 'traspaso') {
        list.push({
          id: `transfer-${r.id}`,
          date: new Date(r.fecha),
          type: 'traspaso',
          description: r.descripcion || 'Traspaso a Caja Fuerte',
          amount: r.monto,
          bank: 'caja-principal',
          bankLabel: getBankLabel('caja-principal'),
          direction: 'in',
        });
      }
    });

    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [sales, expenses, purchases, accountingRecords, banks, cardSettings]);

  // ─── Filtrar por fecha y tipo ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    return allMovements.filter(m => {
      const key = formatDateToKey(m.date);
      if (fechaInicio && key < fechaInicio) return false;
      if (fechaFin && key > fechaFin) return false;
      if (filterType !== 'all' && m.type !== filterType) return false;
      if (filterBank !== 'all' && m.bank !== filterBank) return false;
      return true;
    });
  }, [allMovements, fechaInicio, fechaFin, filterType, filterBank]);

  // ─── Balance por banco (todos los movimientos históricos) ─────────────────
  const bankBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    banks.filter(b => b.isActive).forEach(b => { balances[b.id] = 0; });
    allMovements.forEach(m => {
      if (balances[m.bank] === undefined) balances[m.bank] = 0;
      balances[m.bank] += m.direction === 'in' ? m.amount : -m.amount;
    });
    return balances;
  }, [allMovements, banks]);

  // ─── Resumen del período filtrado ─────────────────────────────────────────
  const summary = useMemo(() => {
    const ventas   = filtered.filter(m => m.type === 'venta').reduce((s, m) => s + m.amount, 0);
    const abonos   = filtered.filter(m => m.type === 'abono').reduce((s, m) => s + m.amount, 0);
    const gastos   = filtered.filter(m => m.type === 'gasto').reduce((s, m) => s + m.amount, 0);
    const compras  = filtered.filter(m => m.type === 'compra').reduce((s, m) => s + m.amount, 0);
    const traspasos = filtered.filter(m => m.type === 'traspaso').reduce((s, m) => s + m.amount, 0);
    // La utilidad no incluye traspasos (son movimientos internos efectivo → Caja Fuerte)
    return { ventas, abonos, gastos, compras, traspasos, utilidad: ventas + abonos - gastos - compras };
  }, [filtered]);

  // ─── Helpers de UI ─────────────────────────────────────────────────────────
  const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  const fmtDate = (d: Date) => d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const typeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    venta:    { label: 'Venta',    color: 'bg-green-100 text-green-700',  icon: <ArrowDownCircle className="h-3 w-3" /> },
    abono:    { label: 'Abono',    color: 'bg-blue-100 text-blue-700',    icon: <ArrowDownCircle className="h-3 w-3" /> },
    gasto:    { label: 'Gasto',    color: 'bg-red-100 text-red-700',      icon: <ArrowUpCircle className="h-3 w-3" /> },
    compra:   { label: 'Compra',   color: 'bg-orange-100 text-orange-700',icon: <ShoppingBag className="h-3 w-3" /> },
    traspaso: { label: 'A Caja Fuerte', color: 'bg-purple-100 text-purple-700', icon: <ArrowRightLeft className="h-3 w-3" /> },
  };

  return (
    <ScrollArea className="h-screen p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* Encabezado */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contabilidad</h1>
          <p className="text-gray-500 mt-1">Todos los movimientos de dinero en un solo lugar</p>
        </div>

        {/* Saldo por banco */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Saldo consolidado (Caja Fuerte y Bancos)</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {banks.filter(b => b.isActive && b.id !== 'efectivo').map(b => (
              <Card key={b.id} className={bankBalances[b.id] < 0 ? 'border-red-200' : ''}>
                <CardContent className="pt-4">
                  <p className="text-xs text-gray-500 mb-1">{b.name}</p>
                  <p className={`text-xl font-bold ${bankBalances[b.id] < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {fmt(bankBalances[b.id] ?? 0)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <p className="text-xs text-gray-500 mb-1">Desde</p>
                <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-36" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Hasta</p>
                <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-36" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Tipo</p>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="venta">Ventas</SelectItem>
                    <SelectItem value="abono">Abonos</SelectItem>
                    <SelectItem value="gasto">Gastos</SelectItem>
                    <SelectItem value="compra">Compras</SelectItem>
                    <SelectItem value="traspaso">Traspasos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Banco</p>
                <Select value={filterBank} onValueChange={setFilterBank}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {banks.filter(b => b.isActive).map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(fechaInicio || fechaFin || filterType !== 'all' || filterBank !== 'all') && (
                <button
                  onClick={() => { setFechaInicio(''); setFechaFin(''); setFilterType('all'); setFilterBank('all'); }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resumen del período */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">Ventas</p>
              <p className="text-lg font-bold text-green-600">{fmt(summary.ventas)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">Abonos</p>
              <p className="text-lg font-bold text-blue-600">{fmt(summary.abonos)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">Gastos</p>
              <p className="text-lg font-bold text-red-600">{fmt(summary.gastos)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">Compras</p>
              <p className="text-lg font-bold text-orange-600">{fmt(summary.compras)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">Traspasos a Caja Fuerte</p>
              <p className="text-lg font-bold text-purple-600">{fmt(summary.traspasos)}</p>
            </CardContent>
          </Card>
          <Card className={summary.utilidad < 0 ? 'border-red-300' : 'border-green-300'}>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">Utilidad neta</p>
              <p className={`text-lg font-bold ${summary.utilidad < 0 ? 'text-red-600' : 'text-green-700'}`}>
                {fmt(summary.utilidad)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de movimientos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Movimientos ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No hay movimientos para el período seleccionado</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead className="text-right">Entrada</TableHead>
                    <TableHead className="text-right">Salida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(m => {
                    const cfg = typeConfig[m.type];
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                          {fmtDate(m.date)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${cfg.color} gap-1 text-xs font-medium`}>
                            {cfg.icon}{cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate">{m.description}</TableCell>
                        <TableCell className="text-xs">{m.bankLabel}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {m.direction === 'in' ? (
                            <span className="text-green-600">{fmt(m.amount)}</span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {m.direction === 'out' ? (
                            <span className="text-red-600">{fmt(m.amount)}</span>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

      </div>
    </ScrollArea>
  );
}
