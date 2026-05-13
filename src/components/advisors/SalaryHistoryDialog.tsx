import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, FileText } from 'lucide-react';
import { Advisor, SalaryPayment } from '@/types';
import { useCompanySettings } from '@/hooks/queries/useCompanySettings';
import { printSalaryVoucher } from './SalaryVoucher';

interface Props {
  open: boolean;
  advisor: Advisor;
  payments: SalaryPayment[];
  onClose: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const MONTHS = [
  'Ene','Feb','Mar','Abr','May','Jun',
  'Jul','Ago','Sep','Oct','Nov','Dic',
];

function periodLabel(p: SalaryPayment) {
  if (p.fromDate && p.toDate) {
    const f = new Date(p.fromDate + 'T00:00:00');
    const t = new Date(p.toDate   + 'T00:00:00');
    return `${f.getDate()} ${MONTHS[f.getMonth()]} — ${t.getDate()} ${MONTHS[t.getMonth()]} ${t.getFullYear()}`;
  }
  const [y, m] = p.period.split('-');
  return `${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

export default function SalaryHistoryDialog({ open, advisor, payments, onClose }: Props) {
  const { companyInfo } = useCompanySettings();

  const sorted = [...payments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Historial de Nóminas — {advisor.name}
          </DialogTitle>
        </DialogHeader>

        {sorted.length === 0 ? (
          <p className="text-center text-gray-400 py-10">No hay nóminas registradas para este asesor</p>
        ) : (
          <div className="space-y-3 py-2">
            {sorted.map(p => (
              <div key={p.id} className="border rounded-lg p-4 bg-gray-50 hover:bg-white transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{periodLabel(p)}</span>
                      {p.daysWorked && (
                        <Badge variant="outline" className="text-xs">{p.daysWorked} días</Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">{p.paymentMethod}</Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-gray-500">Devengado</p>
                        <p className="font-medium text-green-700">{fmt(p.grossPay)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Deducciones</p>
                        <p className="font-medium text-red-600">{fmt(p.totalDeductions)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Neto pagado</p>
                        <p className="font-bold text-blue-700">{fmt(p.netPay)}</p>
                      </div>
                    </div>

                    {p.loanDeductions.length > 0 && (
                      <p className="text-xs text-gray-500">
                        Abonos préstamos: {fmt(p.loanDeductions.reduce((s, d) => s + d.amount, 0))}
                        {' '}({p.loanDeductions.length} préstamo{p.loanDeductions.length > 1 ? 's' : ''})
                      </p>
                    )}

                    <p className="text-xs text-gray-400">
                      Pagado el {new Date(p.paymentDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
                      {' · '}Registrado {new Date(p.createdAt).toLocaleDateString('es-CO')}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => printSalaryVoucher(p, companyInfo)}
                    className="shrink-0"
                  >
                    <Printer className="h-4 w-4 mr-1" />Reimprimir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
