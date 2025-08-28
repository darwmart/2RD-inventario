import { useState, useCallback } from 'react';
import { Sale, SaleItem, PaymentMethod, Advisor } from '@/types';
import { useLocalStorage } from './useLocalStorage';
import { v4 as uuidv4 } from 'uuid';

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
    { id: '10', name: 'Esmiopcion', type: 'credit', isActive: true }
  ]);
  const [advisors, setAdvisors] = useLocalStorage<Advisor[]>('advisors', [
    { id: '1', name: 'Administrador', email: 'admin@tienda.com', phone: '', isActive: true, createdAt: new Date() }
  ]);

  const addSale = useCallback((saleData: {
    advisorId: string;
    items: SaleItem[];
    paymentMethod: PaymentMethod;
    discount?: number;
    type: 'sale' | 'quote' | 'reserved';
    // Datos del cliente (para separados)
    customerName?: string;
    customerDocument?: string;
    customerPhone?: string;
    // Abono inicial (para separados)
    deposit?: number;
  }) => {
    const advisor = advisors.find(a => a.id === saleData.advisorId);
    const subtotal = saleData.items.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal - (saleData.discount || 0);

    // Preparar historial de abonos si aplica
    const deposits = (saleData.type === 'reserved' && (saleData.deposit || 0) > 0)
      ? [{
          id: uuidv4(),
          amount: saleData.deposit as number,
          method: saleData.paymentMethod,
          createdAt: new Date()
        }]
      : undefined;

    const newSale: Sale = {
      id: uuidv4(),
      saleNumber: `V${Date.now()}`,
      advisorId: saleData.advisorId,
      advisorName: advisor?.name || 'Desconocido',
      items: saleData.items,
      subtotal,
      discount: saleData.discount || 0,
      total,
      paymentMethod: saleData.paymentMethod,
      // Información del cliente y abono (si aplica)
      customerName: saleData.customerName,
      customerDocument: saleData.customerDocument,
      customerPhone: saleData.customerPhone,
      deposit: saleData.deposit,
      deposits: deposits,
      status: saleData.type === 'sale' ? 'completed' : 'pending',
      type: saleData.type,
      createdAt: new Date()
    };

    setSales(prev => [...prev, newSale]);
    return newSale;
  }, [setSales, advisors]);

  const updateSale = useCallback((id: string, updates: Partial<Sale>) => {
    setSales(prev => prev.map(sale =>
      sale.id === id ? { ...sale, ...updates } : sale
    ));
  }, [setSales]);

  const getSalesByDate = useCallback((date: string) => {
    return sales.filter(sale => {
      const saleDate = new Date(sale.createdAt).toDateString();
      const targetDate = new Date(date).toDateString();
      return saleDate === targetDate;
    });
  }, [sales]);

  const getSalesByAdvisor = useCallback((advisorId: string) => {
    return sales.filter(sale => sale.advisorId === advisorId);
  }, [sales]);

  const addPaymentMethod = useCallback((name: string, type: 'cash' | 'electronic' | 'credit') => {
    const newPaymentMethod: PaymentMethod = {
      id: uuidv4(),
      name,
      type,
      isActive: true
    };
    setPaymentMethods(prev => [...prev, newPaymentMethod]);
    return newPaymentMethod;
  }, [setPaymentMethods]);

  const addAdvisor = useCallback((advisorData: Omit<Advisor, 'id' | 'createdAt'>) => {
    const newAdvisor: Advisor = {
      ...advisorData,
      id: uuidv4(),
      createdAt: new Date()
    };
    setAdvisors(prev => [...prev, newAdvisor]);
    return newAdvisor;
  }, [setAdvisors]);

  // Registrar un abono (depósito) a un separado con su método de pago
  const addSaleDeposit = useCallback((saleId: string, amount: number, paymentMethodId: string) => {
    const pm = paymentMethods.find(p => p.id === paymentMethodId);
    if (!pm) {
      throw new Error('Método de pago inválido');
    }

    let updatedSale: Sale | undefined;

    setSales(prev => prev.map(s => {
      if (s.id !== saleId) return s;
      const newDepositRecord = {
        id: uuidv4(),
        amount,
        method: pm,
        createdAt: new Date()
      };
      const deposits = [...(s.deposits || []), newDepositRecord];
      updatedSale = { ...s, deposit: (s.deposit || 0) + amount, deposits };
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
    getSalesByDate,
    getSalesByAdvisor,
    addPaymentMethod,
    addAdvisor,
    addSaleDeposit
  };
}