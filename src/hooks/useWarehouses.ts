import { useState } from 'react';
import { ExternalWarehouse, WarehouseTransaction, WarehouseTransactionItem, WarehouseTransactionType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const WAREHOUSES_KEY = '2rd_warehouses';
const TRANSACTIONS_KEY = '2rd_warehouse_transactions';

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function useWarehouses() {
  const [warehouses, setWarehouses] = useState<ExternalWarehouse[]>(() =>
    loadFromStorage(WAREHOUSES_KEY, [])
  );
  const [transactions, setTransactions] = useState<WarehouseTransaction[]>(() =>
    loadFromStorage(TRANSACTIONS_KEY, [])
  );

  const saveWarehouses = (updated: ExternalWarehouse[]) => {
    setWarehouses(updated);
    localStorage.setItem(WAREHOUSES_KEY, JSON.stringify(updated));
  };

  const saveTransactions = (updated: WarehouseTransaction[]) => {
    setTransactions(updated);
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updated));
  };

  const addWarehouse = (data: Omit<ExternalWarehouse, 'id' | 'code' | 'createdAt' | 'updatedAt'>) => {
    const maxCode = warehouses.reduce((max, w) => {
      const num = parseInt(w.code.replace('BOD-', '') || '0');
      return num > max ? num : max;
    }, 0);
    const newWarehouse: ExternalWarehouse = {
      ...data,
      id: uuidv4(),
      code: `BOD-${String(maxCode + 1).padStart(3, '0')}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    saveWarehouses([...warehouses, newWarehouse]);
    return newWarehouse;
  };

  const updateWarehouse = (id: string, data: Partial<Omit<ExternalWarehouse, 'id' | 'code' | 'createdAt'>>) => {
    saveWarehouses(
      warehouses.map(w => (w.id === id ? { ...w, ...data, updatedAt: new Date() } : w))
    );
  };

  const deleteWarehouse = (id: string) => {
    saveWarehouses(warehouses.filter(w => w.id !== id));
    saveTransactions(transactions.filter(t => t.warehouseId !== id));
  };

  const addTransaction = (
    warehouseId: string,
    type: WarehouseTransactionType,
    items: WarehouseTransactionItem[],
    notes: string,
    createdBy: string
  ): WarehouseTransaction => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    const transaction: WarehouseTransaction = {
      id: uuidv4(),
      warehouseId,
      warehouseName: warehouse?.name || '',
      type,
      items,
      notes,
      createdAt: new Date(),
      createdBy,
    };
    saveTransactions([transaction, ...transactions]);
    return transaction;
  };

  const deleteTransaction = (id: string) => {
    saveTransactions(transactions.filter(t => t.id !== id));
  };

  const getWarehouseStock = (warehouseId: string): Record<string, { quantity: number; productName: string; barcode?: string; reference?: string }> => {
    const stock: Record<string, { quantity: number; productName: string; barcode?: string; reference?: string }> = {};

    transactions
      .filter(t => t.warehouseId === warehouseId)
      .forEach(t => {
        t.items.forEach(item => {
          if (!stock[item.productId]) {
            stock[item.productId] = {
              quantity: 0,
              productName: item.productName,
              barcode: item.barcode,
              reference: item.reference,
            };
          }
          if (t.type === 'loan') {
            stock[item.productId].quantity += item.quantity;
          } else if (t.type === 'return') {
            stock[item.productId].quantity -= item.quantity;
          } else {
            // adjustment: quantity can be positive or negative
            stock[item.productId].quantity += item.quantity;
          }
        });
      });

    // Only return products with positive balance (still at warehouse)
    return Object.fromEntries(
      Object.entries(stock).filter(([, v]) => v.quantity > 0)
    );
  };

  return {
    warehouses,
    transactions,
    addWarehouse,
    updateWarehouse,
    deleteWarehouse,
    addTransaction,
    deleteTransaction,
    getWarehouseStock,
  };
}
