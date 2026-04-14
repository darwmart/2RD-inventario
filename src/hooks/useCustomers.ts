import { useCallback } from 'react';
import { Customer } from '@/types';
import { useLocalStorage } from './useLocalStorage';
import { v4 as uuidv4 } from 'uuid';

export function useCustomers() {
  const [customers, setCustomers] = useLocalStorage<Customer[]>('customers', []);

  const addCustomer = useCallback((data: Omit<Customer, 'id' | 'createdAt'>) => {
    const newCustomer: Customer = {
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
    };
    setCustomers(prev => [...prev, newCustomer]);
    return newCustomer;
  }, [setCustomers]);

  const updateCustomer = useCallback((id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, [setCustomers]);

  const deleteCustomer = useCallback((id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  }, [setCustomers]);

  const findCustomerByDocument = useCallback((document: string) => {
    return customers.find(c => c.document === document);
  }, [customers]);

  const addCreditBalance = useCallback((id: string, amount: number) => {
    setCustomers(prev => prev.map(c =>
      c.id === id ? { ...c, balance: (c.balance || 0) + amount } : c
    ));
  }, [setCustomers]);

  return {
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    findCustomerByDocument,
    addCreditBalance,
  };
}
