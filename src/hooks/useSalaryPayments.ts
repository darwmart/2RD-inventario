import { useLocalStorage } from './useLocalStorage';
import { SalaryPayment } from '@/types';

export function useSalaryPayments() {
  const [salaryPayments, setSalaryPayments] = useLocalStorage<SalaryPayment[]>('salaryPayments', []);

  const addSalaryPayment = (data: Omit<SalaryPayment, 'id' | 'createdAt'>): SalaryPayment => {
    const payment: SalaryPayment = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setSalaryPayments(prev => [...prev, payment]);
    return payment;
  };

  const getByAdvisor = (advisorId: string) =>
    salaryPayments.filter(p => p.advisorId === advisorId);

  const getByPeriod = (advisorId: string, period: string) =>
    salaryPayments.find(p => p.advisorId === advisorId && p.period === period);

  return { salaryPayments, addSalaryPayment, getByAdvisor, getByPeriod };
}
