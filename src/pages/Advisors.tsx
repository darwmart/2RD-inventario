import { useState } from 'react';
import { useAdvisors, useSalesData, useExpensesData } from '@/hooks/queries';
import { useSalaryPayments } from '@/hooks/useSalaryPayments';
import { useLoanPayments } from '@/hooks/useLoanPayments';
import { Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Advisor, LoanPayment, SalaryPayment } from '@/types';
import AdvisorFormDialog from '@/components/advisors/AdvisorFormDialog';
import AdvisorCard, { AdvisorStats } from '@/components/advisors/AdvisorCard';
import SalaryPaymentDialog from '@/components/advisors/SalaryPaymentDialog';
import SalaryHistoryDialog from '@/components/advisors/SalaryHistoryDialog';
import { toast } from 'sonner';

export default function Advisors() {
  const { advisors, addAdvisor }     = useAdvisors();
  const { sales }                    = useSalesData();
  const { expenses, getExpensesByAdvisorName } = useExpensesData();
  const { addSalaryPayment, getByAdvisor: getSalariesByAdvisor } = useSalaryPayments();
  const { loanPayments, addMany: addLoanPayments, getTotalPaid } = useLoanPayments();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [salaryAdvisor, setSalaryAdvisor] = useState<Advisor | null>(null);
  const [historyAdvisor, setHistoryAdvisor] = useState<Advisor | null>(null);

  const getAdvisorStats = (advisor: Advisor): AdvisorStats => {
    const advisorSales  = sales.filter(s => s.advisorId === advisor.id && s.status === 'completed');
    const currentMonth  = new Date().getMonth();
    const currentYear   = new Date().getFullYear();

    const monthlySales  = advisorSales.filter(s => {
      const d = new Date(s.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const advisorLoans  = getExpensesByAdvisorName(advisor.name).filter(e => e.type === 'prestamo');
    const loansThisMonth = advisorLoans
      .filter(e => {
        const d = new Date(e.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const pendingLoanBalance = advisorLoans.reduce((sum, loan) => {
      const paid = getTotalPaid(loan.id);
      return sum + Math.max(0, loan.amount - paid);
    }, 0);

    const salariesPaid = getSalariesByAdvisor(advisor.id).length;

    return {
      totalSales:    advisorSales.length,
      totalRevenue:  advisorSales.reduce((sum, s) => sum + s.total, 0),
      monthlySales:  monthlySales.length,
      monthlyRevenue:monthlySales.reduce((sum, s) => sum + s.total, 0),
      loansThisMonth,
      totalDebt:     advisorLoans.reduce((sum, e) => sum + e.amount, 0),
      pendingLoanBalance,
      salariesPaid,
    };
  };

  const handleSave = (data: { name: string; email: string; phone: string; document?: string; baseSalary?: number }) => {
    addAdvisor({ ...data, isActive: true });
    setIsFormOpen(false);
  };

  const handleSaveSalary = (
    payment: Omit<SalaryPayment, 'id' | 'createdAt'>,
    newLoanPayments: Omit<LoanPayment, 'id'>[],
  ) => {
    addSalaryPayment(payment);
    if (newLoanPayments.length > 0) addLoanPayments(newLoanPayments);
    toast.success(`Pago de salario registrado para ${payment.advisorName} — Neto: $${payment.netPay.toLocaleString('es-CO')}`);
  };

  const salaryAdvisorLoans = salaryAdvisor
    ? getExpensesByAdvisorName(salaryAdvisor.name).filter(e => e.type === 'prestamo')
    : [];

  const salaryAdvisorSales = salaryAdvisor
    ? sales.filter(s => s.advisorId === salaryAdvisor.id && s.status === 'completed' && s.type === 'sale')
    : [];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Asesores de Venta</h1>
          <p className="mt-2 text-gray-600">Gestiona el equipo de ventas y sus estadísticas</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Agregar Asesor
        </Button>
      </div>

      {advisors.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay asesores registrados</h3>
          <p className="text-gray-500">Comienza agregando tu primer asesor de ventas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {advisors.map(advisor => (
            <AdvisorCard
              key={advisor.id}
              advisor={advisor}
              stats={getAdvisorStats(advisor)}
              onPaySalary={setSalaryAdvisor}
              onViewHistory={setHistoryAdvisor}
            />
          ))}
        </div>
      )}

      <AdvisorFormDialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
      />

      {historyAdvisor && (
        <SalaryHistoryDialog
          open={!!historyAdvisor}
          advisor={historyAdvisor}
          payments={getSalariesByAdvisor(historyAdvisor.id)}
          onClose={() => setHistoryAdvisor(null)}
        />
      )}

      {salaryAdvisor && (
        <SalaryPaymentDialog
          open={!!salaryAdvisor}
          advisor={salaryAdvisor}
          advisorSales={salaryAdvisorSales}
          advisorLoans={salaryAdvisorLoans}
          loanPayments={loanPayments}
          onSave={handleSaveSalary}
          onClose={() => setSalaryAdvisor(null)}
        />
      )}
    </div>
  );
}
