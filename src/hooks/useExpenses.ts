// src/hooks/useExpenses.ts
import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Expense } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export function useExpenses() {
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('expenses', []);
  const [expensesMap, setExpensesMap] = useLocalStorage<
    Record<string, Expense[]>
  >('expensesMap', {});

  const addExpense = useCallback((
    advisor: string,
    type: 'gasto' | 'prestamo',
    amount: number,
    description: string
  ) => {
    const newExpense: Expense = {
      id: uuidv4(),
      advisor,
      type,
      amount,
      description,
      createdAt: new Date().toISOString(),
    };
    const dateKey = formatDateToKey(new Date()); // Usar utilidad de fechas
    setExpenses(prev => [...prev, newExpense]);
    setExpensesMap(prev => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] ?? []), newExpense],
    }));
    return newExpense;
  }, [setExpenses, setExpensesMap]);

  const getExpensesByDate = useCallback((date: string) => {
    return expensesMap[formatDateToKey(date)] ?? [];
  }, [expensesMap]);

  const getExpensesByAdvisor = useCallback((advisor: string) => {
    return expenses.filter(e => e.advisor === advisor);
  }, [expenses]);

  return {
    expenses,
    expensesMap,
    addExpense,
    getExpensesByDate,
    getExpensesByAdvisor,
  };
}

// Utilidad de fechas (crear en Paso 6)
export const formatDateToKey = (date: Date | string): string => {
  // Si ya es un string en formato YYYY-MM-DD, retornarlo directamente
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  // Si no, convertir la fecha
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};