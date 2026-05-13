import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Save, CalendarDays, Info } from 'lucide-react';
import { Advisor, Expense, LoanPayment, SalaryPayment, Sale } from '@/types';
import { fmtMoneyInput, parseMoney, numToMoneyStr } from '@/utils/formatters';
import { useCompanySettings } from '@/hooks/queries/useCompanySettings';
import { useBankSettings } from '@/hooks/queries/useBankSettings';
import { printSalaryVoucher } from './SalaryVoucher';
import { toast } from 'sonner';

const TRANSPORT_ALLOWANCE = 200_700; // Auxilio de transporte 2025
const DAYS_PER_MONTH = 30;           // Ley colombiana: mes laboral = 30 días

interface LoanRow {
  loan: Expense;
  remaining: number;
  abono: string;
}

interface Props {
  open: boolean;
  advisor: Advisor;
  advisorSales: Sale[];
  advisorLoans: Expense[];
  loanPayments: LoanPayment[];
  onSave: (payment: Omit<SalaryPayment, 'id' | 'createdAt'>, loanPayments: Omit<LoanPayment, 'id'>[]) => void;
  onClose: () => void;
}

function toPeriodKey(dateStr: string) {
  return dateStr.slice(0, 7); // 'YYYY-MM'
}

function calcDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const f = new Date(from + 'T00:00:00');
  const t = new Date(to + 'T00:00:00');
  if (t < f) return 0;
  return Math.round((t.getTime() - f.getTime()) / 86_400_000) + 1;
}

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export default function SalaryPaymentDialog({
  open, advisor, advisorSales, advisorLoans, loanPayments, onSave, onClose,
}: Props) {
  const { companyInfo } = useCompanySettings();
  const { banks } = useBankSettings();

  const [fromDate, setFromDate]         = useState(firstOfMonth);
  const [toDate, setToDate]             = useState(today);
  const [baseSalaryMonthly, setBaseSalaryMonthly] = useState('');
  const [commissions, setCommissions]   = useState('');
  const [transport, setTransport]         = useState(false);
  const [transportAmt, setTransportAmt]   = useState(numToMoneyStr(TRANSPORT_ALLOWANCE));
  const [healthEnabled, setHealthEnabled]   = useState(false);
  const [pensionEnabled, setPensionEnabled] = useState(false);
  const [loanRows, setLoanRows]         = useState<LoanRow[]>([]);
  const [otherDed, setOtherDed]         = useState('');
  const [otherDedDesc, setOtherDedDesc] = useState('');
  const [payMethod, setPayMethod]       = useState('Efectivo');
  const [payDate, setPayDate]           = useState(today);
  const [notes, setNotes]               = useState('');
  const [advisorDoc, setAdvisorDoc]     = useState(advisor.document ?? '');

  // Al abrir: pre-cargar salario base y comisiones del período
  useEffect(() => {
    if (!open) return;
    const from = firstOfMonth();
    const to   = today();
    setFromDate(from);
    setToDate(to);
    setPayDate(to);
    setAdvisorDoc(advisor.document ?? '');
    if (advisor.baseSalary) setBaseSalaryMonthly(numToMoneyStr(advisor.baseSalary));
    // Comisiones del mes actual
    const period = toPeriodKey(from);
    const periodSales = advisorSales.filter(s =>
      s.status === 'completed' && s.type === 'sale' && s.createdAt.toString().slice(0, 7) === period
    );
    const totalComm = periodSales.reduce((s, sale) => s + (sale.commissionAmount ?? 0), 0);
    setCommissions(totalComm > 0 ? numToMoneyStr(totalComm) : '');
  }, [open]);

  // Recalcular comisiones cuando cambia el rango
  useEffect(() => {
    if (!open || !fromDate || !toDate) return;
    const from = new Date(fromDate + 'T00:00:00');
    const to   = new Date(toDate + 'T23:59:59');
    const rangeSales = advisorSales.filter(s => {
      if (s.status !== 'completed' || s.type !== 'sale') return false;
      const d = new Date(s.createdAt);
      return d >= from && d <= to;
    });
    const totalComm = rangeSales.reduce((s, sale) => s + (sale.commissionAmount ?? 0), 0);
    setCommissions(totalComm > 0 ? numToMoneyStr(totalComm) : '');
  }, [fromDate, toDate, open]);

  // Construir filas de préstamos con saldo pendiente
  useEffect(() => {
    if (!open) return;
    const rows: LoanRow[] = advisorLoans.map(loan => {
      const paid = loanPayments.filter(p => p.loanId === loan.id).reduce((s, p) => s + p.amount, 0);
      const remaining = loan.amount - paid;
      return { loan, remaining, abono: '' };
    }).filter(r => r.remaining > 0);
    setLoanRows(rows);
  }, [open, advisorLoans, loanPayments]);

  // ── Cálculos ─────────────────────────────────────────────────────────────
  const daysWorked    = calcDays(fromDate, toDate);
  const baseMonthlly  = parseMoney(baseSalaryMonthly);
  const dailyRate     = baseMonthlly > 0 ? Math.round(baseMonthlly / DAYS_PER_MONTH) : 0;
  const baseProp      = Math.round(dailyRate * daysWorked); // salario proporcional
  const comm          = parseMoney(commissions);
  const transportMonthly = parseMoney(transportAmt);
  const transportVal  = transport && daysWorked > 0
    ? Math.round(transportMonthly / DAYS_PER_MONTH * daysWorked)
    : 0;
  const grossPay      = baseProp + comm + transportVal;

  const healthAmt   = healthEnabled  ? Math.round(baseProp * 0.04) : 0;
  const pensionAmt  = pensionEnabled ? Math.round(baseProp * 0.04) : 0;
  const totalLoanDed = loanRows.reduce((s, r) => s + parseMoney(r.abono), 0);
  const otherDedAmt  = parseMoney(otherDed);
  const totalDeductions = healthAmt + pensionAmt + totalLoanDed + otherDedAmt;
  const netPay = grossPay - totalDeductions;

  const period = fromDate ? toPeriodKey(fromDate) : toPeriodKey(today());
  const activeBanks = banks.filter(b => b.isActive);

  const buildPayload = () => {
    const loanDeductions = loanRows
      .filter(r => parseMoney(r.abono) > 0)
      .map(r => ({ loanId: r.loan.id, description: r.loan.description, amount: parseMoney(r.abono) }));

    const payment: Omit<SalaryPayment, 'id' | 'createdAt'> = {
      advisorId: advisor.id,
      advisorName: advisor.name,
      advisorDocument: advisorDoc || advisor.document,
      period,
      fromDate,
      toDate,
      daysWorked,
      baseSalaryMonthly: baseMonthlly,
      baseSalary: baseProp,
      commissions: comm,
      transportAllowance: transportVal,
      healthDeduction: healthAmt,
      pensionDeduction: pensionAmt,
      loanDeductions,
      otherDeductions: otherDedAmt,
      otherDeductionDesc: otherDedDesc,
      grossPay,
      totalDeductions,
      netPay,
      paymentMethod: payMethod,
      paymentDate: payDate,
      notes,
    };
    return { payment, loanDeductions };
  };

  const handleSave = () => {
    if (daysWorked <= 0) { toast.error('El rango de fechas no es válido'); return; }
    if (baseMonthlly <= 0 && comm <= 0) { toast.error('Ingresa salario base mensual o comisiones'); return; }
    if (!payDate) { toast.error('Selecciona la fecha de pago'); return; }

    const { payment, loanDeductions } = buildPayload();
    const newLoanPayments: Omit<LoanPayment, 'id'>[] = loanDeductions.map(d => ({
      loanId: d.loanId,
      advisorId: advisor.id,
      advisorName: advisor.name,
      amount: d.amount,
      date: payDate,
      notes: `Descuento nómina ${fromDate} al ${toDate}`,
    }));
    onSave(payment, newLoanPayments);
    onClose();
  };

  const handlePrint = () => {
    if (daysWorked <= 0) { toast.error('El rango de fechas no es válido'); return; }
    if (baseMonthlly <= 0 && comm <= 0) { toast.error('Completa el salario antes de imprimir'); return; }
    const { payment } = buildPayload();
    const preview: SalaryPayment = {
      ...payment,
      id: 'PREVIEW',
      createdAt: new Date().toISOString(),
      paymentDate: payDate || today(),
    };
    printSalaryVoucher(preview, companyInfo);
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pago de Salario — {advisor.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">

          {/* ── Rango de fechas ── */}
          <div className="border rounded-lg p-4 bg-blue-50/40 space-y-3">
            <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />Período a cancelar
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Desde</Label>
                <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Hasta</Label>
                <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
              </div>
            </div>

            {daysWorked > 0 && (
              <div className="flex items-center gap-2 bg-blue-100 rounded px-3 py-2">
                <Info className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="text-sm text-blue-800">
                  <strong>{daysWorked} días</strong> a pagar
                  {baseMonthlly > 0 && (
                    <> · Salario diario: <strong>{fmt(dailyRate)}</strong>
                    · Proporcional: <strong>{fmt(baseProp)}</strong></>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Cédula */}
          <div className="space-y-1.5">
            <Label>Cédula del asesor (para el comprobante)</Label>
            <Input
              placeholder="Número de cédula"
              value={advisorDoc}
              onChange={e => setAdvisorDoc(e.target.value)}
            />
          </div>

          {/* ── Devengados ── */}
          <div className="border rounded-lg p-4 bg-green-50/40 space-y-3">
            <p className="text-sm font-semibold text-green-800">Devengados</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Salario base mensual</Label>
                <Input
                  type="text" inputMode="numeric" placeholder="$0"
                  value={baseSalaryMonthly}
                  onChange={e => setBaseSalaryMonthly(fmtMoneyInput(e.target.value))}
                />
                {daysWorked > 0 && baseMonthlly > 0 && (
                  <p className="text-xs text-green-700 font-medium">
                    {daysWorked}/{DAYS_PER_MONTH} días = {fmt(baseProp)}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Comisiones del período</Label>
                <Input
                  type="text" inputMode="numeric" placeholder="$0"
                  value={commissions}
                  onChange={e => setCommissions(fmtMoneyInput(e.target.value))}
                />
                <p className="text-xs text-gray-400">Auto-calculadas · editables</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="transport" checked={transport} onCheckedChange={v => setTransport(!!v)} />
                <label htmlFor="transport" className="text-sm cursor-pointer">
                  Auxilio de transporte
                  <span className="text-xs text-gray-400 ml-1">(aplica salarios ≤ 2 SMLV)</span>
                </label>
              </div>
              {transport && (
                <div className="ml-6 space-y-1">
                  <div className="flex items-center gap-3">
                    <Input
                      type="text" inputMode="numeric"
                      className="w-44"
                      value={transportAmt}
                      onChange={e => setTransportAmt(fmtMoneyInput(e.target.value))}
                    />
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                      onClick={() => setTransportAmt(numToMoneyStr(TRANSPORT_ALLOWANCE))}
                    >
                      Restablecer ${TRANSPORT_ALLOWANCE.toLocaleString('es-CO')}
                    </button>
                  </div>
                  {daysWorked > 0 && transportMonthly > 0 && (
                    <p className="text-xs text-green-700 font-medium">
                      {daysWorked}/{DAYS_PER_MONTH} días = {fmt(transportVal)}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="text-right text-sm font-bold text-green-700 border-t pt-2">
              Total devengado: {fmt(grossPay)}
            </div>
          </div>

          {/* ── Deducciones ── */}
          <div className="border rounded-lg p-4 bg-red-50/30 space-y-3">
            <p className="text-sm font-semibold text-red-800">Deducciones</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Checkbox id="health" checked={healthEnabled} onCheckedChange={v => setHealthEnabled(!!v)} />
                <label htmlFor="health" className="text-sm cursor-pointer">
                  Salud 4% — {fmt(healthAmt)}
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="pension" checked={pensionEnabled} onCheckedChange={v => setPensionEnabled(!!v)} />
                <label htmlFor="pension" className="text-sm cursor-pointer">
                  Pensión 4% — {fmt(pensionAmt)}
                </label>
              </div>
            </div>

            {loanRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600">Abonos a préstamos pendientes</p>
                {loanRows.map((row, idx) => (
                  <div key={row.loan.id} className="flex items-center gap-3 p-2 bg-white border rounded">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{row.loan.description}</p>
                      <p className="text-xs text-red-600">Saldo: {fmt(row.remaining)}</p>
                    </div>
                    <div className="w-36">
                      <Input
                        type="text" inputMode="numeric" placeholder="$0"
                        value={row.abono}
                        onChange={e => {
                          const val = fmtMoneyInput(e.target.value);
                          setLoanRows(prev => prev.map((r, i) => i === idx ? { ...r, abono: val } : r));
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Otras deducciones</Label>
                <Input
                  type="text" inputMode="numeric" placeholder="$0"
                  value={otherDed} onChange={e => setOtherDed(fmtMoneyInput(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Descripción</Label>
                <Input
                  placeholder="Concepto de deducción"
                  value={otherDedDesc} onChange={e => setOtherDedDesc(e.target.value)}
                />
              </div>
            </div>
            <div className="text-right text-sm font-bold text-red-700 border-t pt-2">
              Total deducciones: {fmt(totalDeductions)}
            </div>
          </div>

          {/* ── Neto ── */}
          <div className={`rounded-lg p-4 text-center ${netPay >= 0 ? 'bg-blue-600' : 'bg-red-600'}`}>
            <p className="text-white text-xs">NETO A PAGAR</p>
            <p className="text-white text-3xl font-bold">{fmt(netPay)}</p>
            {daysWorked > 0 && (
              <p className="text-white/70 text-xs mt-1">
                {daysWorked} días · del {fromDate} al {toDate}
              </p>
            )}
          </div>

          {/* ── Método y fecha de pago ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Método de pago</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  {activeBanks.filter(b => b.id !== 'efectivo').map(b => (
                    <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de pago</Label>
              <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notas (opcional)</Label>
            <Textarea
              placeholder="Observaciones adicionales..."
              value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} className="resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />Guardar Pago
            </Button>
            <Button variant="outline" onClick={handlePrint} className="flex-1">
              <Printer className="h-4 w-4 mr-2" />Imprimir Comprobante
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
