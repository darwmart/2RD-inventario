import { useCallback } from 'react';
import { StockCount, StockCountItem } from '@/types';
import { useLocalStorage } from './useLocalStorage';
import { v4 as uuidv4 } from 'uuid';

export function useStockCount() {
  const [stockCounts, setStockCounts] = useLocalStorage<StockCount[]>('stockCounts', []);

  const createCount = useCallback((items: Omit<StockCountItem, 'difference'>[], notes?: string) => {
    const itemsWithDiff: StockCountItem[] = items.map(i => ({
      ...i,
      difference: i.countedStock - i.systemStock,
    }));
    const newCount: StockCount = {
      id: uuidv4(),
      countNumber: `INV${Date.now()}`,
      status: 'draft',
      items: itemsWithDiff,
      notes,
      createdAt: new Date(),
    };
    setStockCounts(prev => [newCount, ...prev]);
    return newCount;
  }, [setStockCounts]);

  const updateCountItems = useCallback((id: string, items: StockCountItem[]) => {
    setStockCounts(prev => prev.map(c =>
      c.id === id ? { ...c, items } : c
    ));
  }, [setStockCounts]);

  const completeCount = useCallback((id: string) => {
    setStockCounts(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'completed', completedAt: new Date() } : c
    ));
  }, [setStockCounts]);

  const deleteCount = useCallback((id: string) => {
    setStockCounts(prev => prev.filter(c => c.id !== id));
  }, [setStockCounts]);

  return {
    stockCounts,
    createCount,
    updateCountItems,
    completeCount,
    deleteCount,
  };
}
