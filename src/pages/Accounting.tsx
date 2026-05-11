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
import { fmtDateTime } from '@/utils/dates';

// ─── Tipo interno de movimiento unificado ────────────────────────────────────
type Movement = {
  id: string;
  date: Date;
  type: 'venta' | 'abono' | 'gasto' | 'compra' | 'traspaso' | 'apertura';
  description: string;
  amount: number;        // Neto real (ya descontada comisión)
  grossAmount?: number;  // Bruto antes de comisión (solo crédito)
  commissionAmt?: number;// Valor de la comisión descontada
  bank: string;
  bankLabel: string;
  direction: 'in' | 'out';
  settled: boolean;      // true = dinero ya disponible en banco
  expectedDate?: Date;   // Fecha estimada de acreditación (crédito con paymentDays)
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

  const mapPaymentToBank = (paymentName: string, paymentType: string, bankId?: string): string => {
    if (paymentType === 'cash') return 'efectivo';
    // Banco configurado explícitamente en el método de pago (más confiable)
    if (bankId && banks.find(b => b.id === bankId && b.isActive)) return bankId;
    // Fallback: buscar por nombre
    const name = paymentName.toLowerCase();
    const matched = banks.find(b => b.isActive && b.id !== 'efectivo' && name.includes(b.name.toLowerCase()));
    if (matched) return matched.id;
    const firstNonCash = banks.find(b => b.isActive && b.id !== 'efectivo' && b.id !== 'caja-principal');
    return firstNonCash?.id ?? 'caja-principal';
  };

  const netAmount = (amount: number, paymentName: string, platformCommission?: number): number => {
    const name = paymentName.toLowerCase();
    let net = amount;
    // Comisión de plataforma crédito (Sistecredito, Addi, etc.)
    if (platformCommission && platformCommission > 0) {
      net -= amount * platformCommission / 100;
    } else if (cardSettings.commissionsEnabled) {
      if (name.includes('débito')) net -= amount * cardSettings.debitCommission / 100;
      else if (name.includes('crédito')) net -= amount * cardSettings.creditCommission / 100;
    }
    if (cardSettings.reteivaEnabled && (name.includes('débito') || name.includes('crédito'))) {
      net -= amount * cardSettings.reteiva / 100;
    }
    return Math.round(net);
  };

  const addDays = (date: Date, days: number): Date => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  // Calcula la fecha esperada de pago según el período de recaudo de la plataforma
  const getExpectedPaymentDate = (saleDate: Date, pm: { paymentDays?: number; paymentPeriod?: string }): Date | undefined => {
    const days = pm.paymentDays ?? 0;
    if (!pm.paymentPeriod || pm.paymentPeriod === 'immediate') {
      return days > 0 ? addDays(saleDate, days) : undefined;
    }
    if (pm.paymentPeriod === 'weekly') {
      // Fin de la semana (domingo) de la venta + días de pago
      const d = new Date(saleDate);
      const daysToSunday = d.getDay() === 0 ? 0 : 7 - d.getDay();
      const endOfWeek = addDays(d, daysToSunday);
      return addDays(endOfWeek, days);
    }
    if (pm.paymentPeriod === 'monthly') {
      // Último día del mes de la venta + días de pago
      const d = new Date(saleDate);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return addDays(endOfMonth, days);
    }
    return undefined;
  };

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // ─── Construir lista unificada de movimientos ──────────────────────────────
  const allMovements = useMemo((): Movement[] => {
    const list: Movement[] = [];

    // 1. Ventas completadas
    sales
      .filter(s => s.status === 'completed' && s.type === 'sale')
      .forEach(s => {
        const pm = s.paymentMethod;
        const bank = mapPaymentToBank(pm.name, pm.type, pm.bankId);
        const saleDate = new Date(s.createdAt);
        const commission = pm.type === 'credit' ? pm.commission : undefined;
        const gross = s.total;
        const net = netAmount(gross, pm.name, commission);
        const expectedDate = pm.type === 'credit' ? getExpectedPaymentDate(saleDate, pm) : undefined;
        const settled = !expectedDate || expectedDate <= today;
        list.push({
          id: `sale-${s.id}`,
          date: saleDate,
          type: 'venta',
          description: `Venta #${s.saleNumber ?? ''} — ${s.items.map(i => i.productName).join(', ')}`,
          amount: net,
          grossAmount: commission ? gross : undefined,
          commissionAmt: commission ? Math.round(gross * commission / 100) : undefined,
          bank,
          bankLabel: getBankLabel(bank),
          direction: 'in',
          settled,
          expectedDate,
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
            const pmBankId = d.method?.bankId ?? s.paymentMethod.bankId;
            const bank = mapPaymentToBank(pmName, pmType, pmBankId);
            list.push({
              id: `deposit-${s.id}-${d.createdAt}`,
              date: new Date(d.createdAt),
              type: 'abono',
              description: `Abono separado — ${s.items?.map(i => i.productName).join(', ') ?? ''}`,
              amount: netAmount(d.amount, pmName),
              bank,
              bankLabel: getBankLabel(bank),
              direction: 'in',
              settled: true,
            });
          });
        } else if (s.deposit && s.deposit > 0) {
          const bank = mapPaymentToBank(s.paymentMethod.name, s.paymentMethod.type, s.paymentMethod.bankId);
          list.push({
            id: `deposit-${s.id}`,
            date: new Date(s.createdAt),
            type: 'abono',
            description: `Abono separado — ${s.items?.map(i => i.productName).join(', ') ?? ''}`,
            amount: netAmount(s.deposit, s.paymentMethod.name),
            bank,
            bankLabel: getBankLabel(bank),
            direction: 'in',
            settled: true,
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
        settled: true,
      });
    });

    // 4. Compras a proveedores
    purchases
      .filter(p => p.status !== 'cancelled')
      .forEach(p => {
        // Crédito pendiente (dueDate sin bankId): aún no se ha pagado, no sale del banco
        const isUnpaidCredit = !!(p.paymentDetails?.dueDate && !p.paymentDetails?.bankId
          && !(p.payments && p.payments.length > 0));
        if (isUnpaidCredit) return;

        const supplierLabel = p.supplierName || 'Sin proveedor';
        const docLabel = p.supplierInvoiceNumber ?? p.documentNumber ?? '—';

        if (p.payments && p.payments.length > 0) {
          // Un movimiento por cada pago registrado → banco correcto en cada uno
          p.payments.forEach((pay, idx) => {
            list.push({
              id: `purchase-${p.id}-pay${idx}`,
              date: new Date(pay.date),
              type: 'compra',
              description: `Compra — ${supplierLabel} | Factura: ${docLabel}`,
              amount: pay.amount,
              bank: pay.bankId || 'efectivo',
              bankLabel: getBankLabel(pay.bankId || 'efectivo'),
              direction: 'out',
              settled: true,
            });
          });
        } else {
          // Pago único en el momento de creación (sin array payments)
          const isPaidCredit = !!(p.paymentDetails?.dueDate && p.paymentDetails?.bankId);
          const explicitBankId = p.paymentDetails?.bankId;
          const isCash = !explicitBankId && (p.paymentDetails?.isCashPayment || p.paymentMethod?.type === 'cash');
          const bank = isCash ? 'efectivo' : (explicitBankId ?? 'efectivo');
          const movDate = isPaidCredit && p.paymentDetails?.paidAt
            ? new Date(p.paymentDetails.paidAt)
            : new Date(p.createdAt);
          list.push({
            id: `purchase-${p.id}`,
            date: movDate,
            type: 'compra',
            description: `Compra — ${supplierLabel} | Factura: ${docLabel}`,
            amount: p.total,
            bank,
            bankLabel: getBankLabel(bank),
            direction: 'out',
            settled: true,
          });
        }
      });

    // 5. Traspasos entre Caja Registradora y Caja Fuerte
    accountingRecords.forEach(r => {
      if (r.tipo === 'traspaso') {
        if (r.banco === 'caja-principal') {
          // Apertura de caja: dinero SALE de Caja Fuerte hacia la caja registradora
          list.push({
            id: `apertura-${r.id}`,
            date: new Date(r.fecha),
            type: 'apertura',
            description: r.descripcion || 'Apertura de caja',
            amount: r.monto,
            bank: 'caja-principal',
            bankLabel: getBankLabel('caja-principal'),
            direction: 'out',
            settled: true,
          });
        } else {
          // Traspaso normal: dinero ENTRA a Caja Fuerte desde caja registradora
          list.push({
            id: `transfer-${r.id}`,
            date: new Date(r.fecha),
            type: 'traspaso',
            description: r.descripcion || 'Traspaso a Caja Fuerte',
            amount: r.monto,
            bank: 'caja-principal',
            bankLabel: getBankLabel('caja-principal'),
            direction: 'in',
            settled: true,
          });
        }
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

  // ─── Balance por banco (solo movimientos acreditados / settled) ───────────
  const bankBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    banks.filter(b => b.isActive).forEach(b => { balances[b.id] = 0; });
    allMovements.forEach(m => {
      if (balances[m.bank] === undefined) balances[m.bank] = 0;
      if (m.direction === 'out') {
        balances[m.bank] -= m.amount;
      } else if (m.settled) {
        // Solo suma si el dinero ya fue acreditado
        balances[m.bank] += m.amount;
      }
    });
    return balances;
  }, [allMovements, banks]);

  // ─── Total pendiente de cobro (crédito no acreditado aún) ─────────────────
  const pendingByBank = useMemo(() => {
    const pending: Record<string, number> = {};
    allMovements
      .filter(m => m.direction === 'in' && !m.settled)
      .forEach(m => {
        pending[m.bank] = (pending[m.bank] ?? 0) + m.amount;
      });
    return pending;
  }, [allMovements]);

  // ─── Resumen del período filtrado ─────────────────────────────────────────
  const summary = useMemo(() => {
    const ventasSettled   = filtered.filter(m => m.type === 'venta' && m.settled).reduce((s, m) => s + m.amount, 0);
    const ventasPending   = filtered.filter(m => m.type === 'venta' && !m.settled).reduce((s, m) => s + m.amount, 0);
    const abonos          = filtered.filter(m => m.type === 'abono').reduce((s, m) => s + m.amount, 0);
    const gastos          = filtered.filter(m => m.type === 'gasto').reduce((s, m) => s + m.amount, 0);
    const compras         = filtered.filter(m => m.type === 'compra').reduce((s, m) => s + m.amount, 0);
    const traspasos       = filtered.filter(m => m.type === 'traspaso').reduce((s, m) => s + m.amount, 0);
    const comisiones      = filtered.filter(m => m.type === 'venta' && m.commissionAmt).reduce((s, m) => s + (m.commissionAmt ?? 0), 0);
    const ventas = ventasSettled + ventasPending;
    return { ventas, ventasSettled, ventasPending, abonos, gastos, compras, traspasos, comisiones, utilidad: ventas + abonos - gastos - compras };
  }, [filtered]);

  // ─── Helpers de UI ─────────────────────────────────────────────────────────
  const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  const typeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    venta:    { label: 'Venta',    color: 'bg-green-100 text-green-700',  icon: <ArrowDownCircle className="h-3 w-3" /> },
    abono:    { label: 'Abono',    color: 'bg-blue-100 text-blue-700',    icon: <ArrowDownCircle className="h-3 w-3" /> },
    gasto:    { label: 'Gasto',    color: 'bg-red-100 text-red-700',      icon: <ArrowUpCircle className="h-3 w-3" /> },
    compra:   { label: 'Compra',   color: 'bg-orange-100 text-orange-700',icon: <ShoppingBag className="h-3 w-3" /> },
    traspaso: { label: 'A Caja Fuerte', color: 'bg-purple-100 text-purple-700', icon: <ArrowRightLeft className="h-3 w-3" /> },
    apertura: { label: 'Apertura Caja', color: 'bg-indigo-100 text-indigo-700', icon: <ArrowRightLeft className="h-3 w-3" /> },
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
            {banks.filter(b => b.isActive && b.id !== 'efectivo').map(b => {
              const balance = bankBalances[b.id] ?? 0;
              const pending = pendingByBank[b.id] ?? 0;
              return (
                <Card key={b.id} className={balance < 0 ? 'border-red-200' : ''}>
                  <CardContent className="pt-4">
                    <p className="text-xs text-gray-500 mb-1">{b.name}</p>
                    <p className={`text-xl font-bold ${balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {fmt(balance)}
                    </p>
                    {pending > 0 && (
                      <p className="text-xs text-amber-600 mt-1">+ {fmt(pending)} por cobrar</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <Card>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-gray-500">Ventas</p>
              <p className="text-base font-bold text-green-600">{fmt(summary.ventas)}</p>
              {summary.ventasPending > 0 && (
                <p className="text-xs text-amber-600">{fmt(summary.ventasPending)} pendiente</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-gray-500">Por cobrar</p>
              <p className="text-base font-bold text-amber-600">{fmt(summary.ventasPending)}</p>
              <p className="text-xs text-gray-400">crédito pendiente</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-gray-500">Comisiones</p>
              <p className="text-base font-bold text-rose-500">{fmt(summary.comisiones)}</p>
              <p className="text-xs text-gray-400">cobradas plataformas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-gray-500">Abonos</p>
              <p className="text-base font-bold text-blue-600">{fmt(summary.abonos)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-gray-500">Gastos</p>
              <p className="text-base font-bold text-red-600">{fmt(summary.gastos)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-gray-500">Compras</p>
              <p className="text-base font-bold text-orange-600">{fmt(summary.compras)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-gray-500">Traspasos</p>
              <p className="text-base font-bold text-purple-600">{fmt(summary.traspasos)}</p>
            </CardContent>
          </Card>
          <Card className={summary.utilidad < 0 ? 'border-red-300' : 'border-green-300'}>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-gray-500">Utilidad neta</p>
              <p className={`text-base font-bold ${summary.utilidad < 0 ? 'text-red-600' : 'text-green-700'}`}>
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
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Entrada</TableHead>
                    <TableHead className="text-right">Salida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(m => {
                    const cfg = typeConfig[m.type];
                    return (
                      <TableRow key={m.id} className={!m.settled && m.direction === 'in' ? 'bg-amber-50' : ''}>
                        <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                          {fmtDateTime(m.date)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${cfg.color} gap-1 text-xs font-medium`}>
                            {cfg.icon}{cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-xs">
                          <span className="truncate block">{m.description}</span>
                          {m.commissionAmt && (
                            <span className="text-xs text-rose-500">Comisión: -{fmt(m.commissionAmt)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{m.bankLabel}</TableCell>
                        <TableCell className="text-xs">
                          {!m.settled && m.direction === 'in' ? (
                            <span className="text-amber-600 font-medium">
                              Por cobrar{m.expectedDate ? ` ${m.expectedDate.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })}` : ''}
                            </span>
                          ) : (
                            <span className="text-gray-400">Acreditado</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {m.direction === 'in' ? (
                            <span className={m.settled ? 'text-green-600' : 'text-amber-500'}>{fmt(m.amount)}</span>
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
