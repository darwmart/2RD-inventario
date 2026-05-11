import { useLocalStorage } from './useLocalStorage';
import { LoanPayment } from '@/types';

export function useLoanPayments() {
  const [loanPayments, setLoanPayments] = useLocalStorage<LoanPayment[]>('loanPayments', []);

  const addLoanPayment = (data: Omit<LoanPayment, 'id'>): LoanPayment => {
    const payment: LoanPayment = { ...data, id: crypto.randomUUID() };
    setLoanPayments(prev => [...prev, payment]);
    return payment;
  };

  const addMany = (items: Omit<LoanPayment, 'id'>[]) => {
    const created = items.map(d => ({ ...d, id: crypto.randomUUID() } as LoanPayment));
    setLoanPayments(prev => [...prev, ...created]);
    return created;
  };

  const getTotalPaid = (loanId: string) =>
    loanPayments.filter(p => p.loanId === loanId).reduce((s, p) => s + p.amount, 0);

  const getByAdvisor = (advisorId: string) =>
    loanPayments.filter(p => p.advisorId === advisorId);

  return { loanPayments, addLoanPayment, addMany, getTotalPaid, getByAdvisor };
}
