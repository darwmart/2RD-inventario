import { useCallback } from 'react';
import { Sale, SaleItem, PaymentMethod, Advisor } from '@/types';
import { useLocalStorage } from './useLocalStorage';
import {
  buildSale,
  createPaymentMethod,
  createAdvisor,
  addDepositToSale,
  filterSalesByDate,
} from '@/domain/sales';

export function useSales() {
  const [sales, setSales] = useLocalStorage<Sale[]>('sales', []);
  const [paymentMethods, setPaymentMethods] = useLocalStorage<PaymentMethod[]>('paymentMethods', [
    { id: '1', name: 'Efectivo', type: 'cash', isActive: true },
    { id: '2', name: 'Tarjeta Débito', type: 'electronic', isActive: true },
    { id: '3', name: 'Tarjeta Crédito', type: 'electronic', isActive: true },
    { id: '4', name: 'Transferencia', type: 'electronic', isActive: true },
    { id: '5', name: 'Nequi', type: 'electronic', isActive: true },
    { id: '6', name: 'Daviplata', type: 'electronic', isActive: true },
    { id: '7', name: 'Transfiya', type: 'electronic', isActive: true },
    { id: '8', name: 'Sistecredito', type: 'credit', isActive: true },
    { id: '9', name: 'Addi', type: 'credit', isActive: true },
    { id: '10', name: 'Esmiopcion', type: 'credit', isActive: true },
  ]);
  const [advisors, setAdvisors] = useLocalStorage<Advisor[]>('advisors', [
    { id: '1', name: 'Administrador', email: 'admin@tienda.com', phone: '', isActive: true, createdAt: new Date() },
  ]);

  const addSale = useCallback((saleData: {
    advisorId: string;
    items: SaleItem[];
    paymentMethod: PaymentMethod;
    discount?: number;
    type: 'sale' | 'quote' | 'reserved';
    customerName?: string;
    customerDocument?: string;
    customerPhone?: string;
    deposit?: number;
    ivaTotal?: number;
    commission?: number;
    commissionAmount?: number;
    reteivaAmount?: number;
  }) => {
    const advisor = advisors.find(a => a.id === saleData.advisorId);
    const sale = buildSale({ ...saleData, advisorName: advisor?.name || 'Desconocido' });
    setSales(prev => [...prev, sale]);
    return sale;
  }, [setSales, advisors]);

  const updateSale = useCallback((id: string, updates: Partial<Sale>) => {
    setSales(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, [setSales]);

  const deleteSale = useCallback((id: string) => {
    setSales(prev => prev.filter(s => s.id !== id));
  }, [setSales]);

  const getSalesByDate = useCallback((date: string) => {
    return filterSalesByDate(sales, date);
  }, [sales]);

  const getSalesByAdvisor = useCallback((advisorId: string) => {
    return sales.filter(s => s.advisorId === advisorId);
  }, [sales]);

  const addPaymentMethod = useCallback((
    name: string,
    type: 'cash' | 'electronic' | 'credit',
    bankId?: string,
    commission?: number,
    paymentPeriod?: 'immediate' | 'weekly' | 'monthly',
    paymentDays?: number,
  ) => {
    const pm = createPaymentMethod(name, type, bankId, commission, paymentPeriod, paymentDays);
    setPaymentMethods(prev => [...prev, pm]);
    return pm;
  }, [setPaymentMethods]);

  const updatePaymentMethod = useCallback((id: string, updates: Partial<PaymentMethod>) => {
    setPaymentMethods(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, [setPaymentMethods]);

  const deletePaymentMethod = useCallback((id: string) => {
    setPaymentMethods(prev => prev.filter(m => m.id !== id));
  }, [setPaymentMethods]);

  const addAdvisor = useCallback((data: Omit<Advisor, 'id' | 'createdAt'>) => {
    const advisor = createAdvisor(data);
    setAdvisors(prev => [...prev, advisor]);
    return advisor;
  }, [setAdvisors]);

  const addSaleDeposit = useCallback((saleId: string, amount: number, paymentMethodId: string) => {
    const pm = paymentMethods.find(p => p.id === paymentMethodId);
    if (!pm) throw new Error('Método de pago inválido');

    let updatedSale: Sale | undefined;
    setSales(prev => prev.map(s => {
      if (s.id !== saleId) return s;
      updatedSale = addDepositToSale(s, amount, pm);
      return updatedSale;
    }));
    return updatedSale!;
  }, [setSales, paymentMethods]);

  return {
    sales,
    paymentMethods,
    advisors,
    addSale,
    updateSale,
    deleteSale,
    getSalesByDate,
    getSalesByAdvisor,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    addAdvisor,
    addSaleDeposit,
  };
}
