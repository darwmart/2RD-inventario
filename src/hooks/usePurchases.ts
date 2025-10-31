import { useCallback } from 'react';
import { Purchase, PurchaseItem, PaymentMethod } from '@/types';
import { useLocalStorage } from './useLocalStorage';
import { v4 as uuidv4 } from 'uuid';

export function usePurchases() {
  const [purchases, setPurchases] = useLocalStorage<Purchase[]>('purchases', []);

  const addPurchase = useCallback((purchaseData: {
    invoiceNumber: string;
    supplierId: string;
    supplierName: string;
    items: PurchaseItem[];
    paymentMethod: PaymentMethod;
    paymentDetails?: {
      creditDays?: number;
      bankId?: string;
      bankName?: string;
      isCashPayment?: boolean;
    };
    tax?: number;
    notes?: string;
  }) => {
    const subtotal = purchaseData.items.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal + (purchaseData.tax || 0);

    const newPurchase: Purchase = {
      id: uuidv4(),
      invoiceNumber: purchaseData.invoiceNumber,
      supplierId: purchaseData.supplierId,
      supplierName: purchaseData.supplierName,
      items: purchaseData.items,
      subtotal,
      tax: purchaseData.tax,
      total,
      paymentMethod: purchaseData.paymentMethod,
      paymentDetails: purchaseData.paymentDetails,
      notes: purchaseData.notes,
      createdAt: new Date()
    };

    setPurchases(prev => [...prev, newPurchase]);
    return newPurchase;
  }, [setPurchases]);

  const getPurchasesByDate = useCallback((date: string) => {
    return purchases.filter(purchase => {
      const purchaseDate = new Date(purchase.createdAt).toDateString();
      const targetDate = new Date(date).toDateString();
      return purchaseDate === targetDate;
    });
  }, [purchases]);

  const getPurchasesBySupplier = useCallback((supplierId: string) => {
    return purchases.filter(purchase => purchase.supplierId === supplierId);
  }, [purchases]);

  return {
    purchases,
    addPurchase,
    getPurchasesByDate,
    getPurchasesBySupplier,
  };
}
