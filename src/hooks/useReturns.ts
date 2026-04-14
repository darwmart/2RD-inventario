import { useCallback } from 'react';
import { SaleReturn, SaleItem, PaymentMethod } from '@/types';
import { useLocalStorage } from './useLocalStorage';
import { v4 as uuidv4 } from 'uuid';

export function useReturns() {
  const [returns, setReturns] = useLocalStorage<SaleReturn[]>('saleReturns', []);

  const addReturn = useCallback((data: {
    saleId: string;
    saleNumber: string;
    advisorId: string;
    advisorName: string;
    items: SaleItem[];
    reason: string;
    paymentMethod?: PaymentMethod;
  }) => {
    const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
    const newReturn: SaleReturn = {
      id: uuidv4(),
      returnNumber: `DEV${Date.now()}`,
      saleId: data.saleId,
      saleNumber: data.saleNumber,
      advisorId: data.advisorId,
      advisorName: data.advisorName,
      items: data.items,
      subtotal,
      total: subtotal,
      reason: data.reason,
      paymentMethod: data.paymentMethod,
      createdAt: new Date(),
    };
    setReturns(prev => [newReturn, ...prev]);
    return newReturn;
  }, [setReturns]);

  const deleteReturn = useCallback((id: string) => {
    setReturns(prev => prev.filter(r => r.id !== id));
  }, [setReturns]);

  const getReturnsBySale = useCallback((saleId: string) => {
    return returns.filter(r => r.saleId === saleId);
  }, [returns]);

  return {
    returns,
    addReturn,
    deleteReturn,
    getReturnsBySale,
  };
}
