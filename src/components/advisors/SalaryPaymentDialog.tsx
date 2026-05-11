import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Save } from 'lucide-react';
import { Advisor, Expense, LoanPayment, SalaryPayment, Sale } from '@/types';
import { fmtMoneyInput, parseMoney, numToMoneyStr } from '@/utils/formatters';
import { useCompanySettings } from '@/hooks/queries/useCompanySettings';
import { useBankSettings } from '@/hooks/queries/useBankSettings';
import { printSalaryVoucher } from './SalaryVoucher';
import { toast } from 'sonner';

const TRANSPORT_ALLOWANCE_2025 = 200_700;
const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

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

const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function SalaryPaymentDialog({
  open, advisor, advisorSales, advisorLoans, loanPayments, onSave, onClose,
}: Props) {
  const { companyInfo } = useCompanySettings();
  const { banks } = useBankSettings();

  const now = new Date();
  const [period, setPeriod] = useState(toKey(now));
  const [baseSalary, setBaseSalary] = useState('');
  const [commissions, setCommissions] = useState('');
  const [transport, setTransport] = useState(false);
  const [healthEnabled, setHealthEnabled] = useState(false);
  const [pensionEnabled, setPensionEnabled] = useState(false);
  const [loanRows, setLoanRows] = useState<LoanRow[]>([]);
  const [otherDed, setOtherDed] = useState('');
  const [otherDedDesc, setOtherDedDesc] = useState('');
  const [payMethod, setPayMethod] = useState('Efectivo');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [advisorDoc, setAdvisorDoc] = useState(advisor.document ?? '');

  // Auto-calculate commissions from sales in period
  useEffect(() => {
    if (!open) return;
    const periodSales = advisorSales.filter(s =>
      s.status === 'completed' && s.type === 'sale' && toKey(new Date(s.createdAt)) === period
    );
    const totalComm = periodSales.reduce((s, sale) => s + (sale.commissionAmount ?? 0), 0);
    setCommissions(totalComm > 0 ? numToMoneyStr(totalComm) : '');

    if (advisor.baseSalary) setBaseSalary(numToMoneyStr(advisor.baseSalary));
  }, [open, period]);

  // Build loan rows with remaining balance
  useEffect(() => {
    if (!open) return;
    const rows: LoanRow[] = advisorLoans.map(loan => {
      const paid = loanPayments.filter(p => p.loanId === loan.id).reduce((s, p) => s + p.amount, 0);
      const remaining = loan.amount - paid;
      return { loan, remaining, abono: '' };
    }).filter(r => r.remaining > 0);
    setLoanRows(rows);
  }, [open, advisorLoans, loanPayments]);

  const base = parseMoney(baseSalary);
  const comm = parseMoney(commissions);
  const transportAmt = transport ? TRANSPORT_ALLOWANCE_2025 : 0;
  const grossPay = base + comm + transportAmt;

  const healthAmt = healthEnabled ? Math.round(base * 0.04) : 0;
  const pensionAmt = pensionEnabled ? Math.round(base * 0.04) : 0;
  const totalLoanDed = loanRows.reduce((s, r) => s + parseMoney(r.abono), 0);
  const otherDedAmt = parseMoney(otherDed);
  const totalDeductions = healthAmt + pensionAmt + totalLoanDed + otherDedAmt;
  const netPay = grossPay - totalDeductions;

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  const [selMonth, selYear] = period.split('-').map(Number);

  const activeBanks = banks.filter(b => b.isActive);

  const handleSave = () => {
    if (base <= 0 && comm <= 0) { toast.error('Ingresa salario base o comisiones'); return; }
    if (!payDate) { toast.error('Selecciona la fecha de pago'); return; }

    const loanDeductions = loanRows
      .filter(r => parseMoney(r.abono) > 0)
      .map(r => ({
        loanId: r.loan.id,
        description: r.loan.description,
        amount: parseMoney(r.abono),
      }));

    const payment: Omit<SalaryPayment, 'id' | 'createdAt'> = {
      advisorId: advisor.id,
      advisorName: advisor.name,
      advisorDocument: advisorDoc || advisor.document,
      period,
      baseSalary: base,
      commissions: comm,
      transportAllowance: transportAmt,
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

    const newLoanPayments: Omit<LoanPayment, 'id'>[] = loanDeductions.map(d => ({
      loanId: d.loanId,
      advisorId: advisor.id,
      advisorName: advisor.name,
      amount: d.amount,
      date: payDate,
      notes: `Descuento nómina ${period}`,
    }));

    onSave(payment, newLoanPayments);
    onClose();
  };

  const handlePrint = () => {
    if (base <= 0 && comm <= 0) { toast.error('Completa el salario antes de imprimir'); return; }
    const loanDeductions = loanRows
      .filter(r => parseMoney(r.abono) > 0)
      .map(r => ({ loanId: r.loan.id, description: r.loan.description, amount: parseMoney(r.abono) }));
    const preview: SalaryPayment = {
      id: 'PREVIEW', createdAt: new Date().toISOString(),
      advisorId: advisor.id, advisorName: advisor.name,
      advisorDocument: advisorDoc || advisor.document,
      period, baseSalary: base, commissions: comm, transportAllowance: transportAmt,
      healthDeduction: healthAmt, pensionDeduction: pensionAmt, loanDeductions,
      otherDeductions: otherDedAmt, otherDeductionDesc: otherDedDesc,
      grossPay, totalDeductions, netPay,
      paymentMethod: payMethod, paymentDate: payDate || new Date().toISOString().slice(0, 10), notes,
    };
    printSalaryVoucher(preview, companyInfo);
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pago de Salario — {advisor.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">

          {/* Período y datos básicos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Mes</Label>
              <Select
                value={String(selMonth)}
                onValueChange={v => setPeriod(`${selYear}-${String(v).padStart(2, '0')}`)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Año</Label>
              <Select
                value={String(selYear)}
                onValueChange={v => setPeriod(`${v}-${String(selMonth).padStart(2, '0')}`)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Cédula del asesor (para el comprobante)</Label>
            <Input
              placeholder="Número de cédula"
              value={advisorDoc}
              onChange={e => setAdvisorDoc(e.target.value)}
            />
          </div>

          {/* Devengados */}
          <div className="border rounded-lg p-4 bg-green-50/40 space-y-3">
            <p className="text-sm font-semibold text-green-800">Devengados</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Salario básico</Label>
                <Input
                  type="text" inputMode="numeric" placeholder="$0"
                  value={baseSalary} onChange={e => setBaseSalary(fmtMoneyInput(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Comisiones del período</Label>
                <Input
                  type="text" inputMode="numeric" placeholder="$0"
                  value={commissions} onChange={e => setCommissions(fmtMoneyInput(e.target.value))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="transport" checked={transport} onCheckedChange={v => setTransport(!!v)} />
              <label htmlFor="transport" className="text-sm cursor-pointer">
                Auxilio de transporte — {fmt(TRANSPORT_ALLOWANCE_2025)}
                <span className="text-xs text-gray-400 ml-1">(aplica salarios ≤ 2 SMLV)</span>
              </label>
            </div>
            <div className="text-right text-sm font-bold text-green-700 border-t pt-2">
              Total devengado: {fmt(grossPay)}
            </div>
          </div>

          {/* Deducciones */}
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

          {/* Neto */}
          <div className={`rounded-lg p-4 text-center ${netPay >= 0 ? 'bg-blue-600' : 'bg-red-600'}`}>
            <p className="text-white text-xs">NETO A PAGAR</p>
            <p className="text-white text-3xl font-bold">{fmt(netPay)}</p>
          </div>

          {/* Método y fecha de pago */}
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
