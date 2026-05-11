import { useCallback } from 'react';
import { Purchase, PurchaseDocument, PurchaseItem, PaymentMethod, DocumentType, DocumentStatus } from '@/types';
import { useLocalStorage } from './useLocalStorage';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateDocumentInput,
  generateDocumentNumber,
  buildDocument,
  applyPayment,
  convertDelivery,
} from '@/domain/purchases';

export function usePurchases() {
  const [purchases, setPurchases] = useLocalStorage<PurchaseDocument[]>('purchases', []);

  const createDocument = useCallback((data: CreateDocumentInput) => {
    const doc = buildDocument(purchases, data);
    setPurchases(prev => [...prev, doc]);
    return doc;
  }, [purchases, setPurchases]);

  // Función legacy para compatibilidad
  const addPurchase = useCallback((purchaseData: {
    invoiceNumber: string;
    supplierId: string;
    supplierName: string;
    items: PurchaseItem[];
    paymentMethod: PaymentMethod;
    paymentDetails?: {
      creditDays?: number;
      dueDate?: string;
      bankId?: string;
      bankName?: string;
      isCashPayment?: boolean;
    };
    tax?: number;
    notes?: string;
  }) => {
    const subtotal = purchaseData.items.reduce((sum, item) => sum + item.total, 0);
    const newPurchase: PurchaseDocument = {
      id: uuidv4(),
      documentType: 'invoice',
      documentNumber: purchaseData.invoiceNumber,
      status: 'completed',
      supplierId: purchaseData.supplierId,
      supplierName: purchaseData.supplierName,
      items: purchaseData.items,
      subtotal,
      tax: purchaseData.tax,
      total: subtotal + (purchaseData.tax || 0),
      paymentMethod: purchaseData.paymentMethod,
      paymentDetails: purchaseData.paymentDetails,
      notes: purchaseData.notes,
      createdAt: new Date(),
    };
    setPurchases(prev => [...prev, newPurchase]);
    return newPurchase;
  }, [setPurchases]);

  const getPurchasesByDate = useCallback((date: string) => {
    return purchases.filter(p => {
      const purchaseDate = new Date(p.createdAt).toDateString();
      return purchaseDate === new Date(date).toDateString();
    });
  }, [purchases]);

  const getPurchasesBySupplier = useCallback((supplierId: string) => {
    return purchases.filter(p => p.supplierId === supplierId);
  }, [purchases]);

  const updatePurchase = useCallback((purchaseId: string, purchaseData: {
    invoiceNumber: string;
    supplierId: string;
    supplierName: string;
    items: PurchaseItem[];
    paymentMethod: PaymentMethod;
    paymentDetails?: {
      creditDays?: number;
      dueDate?: string;
      bankId?: string;
      bankName?: string;
      isCashPayment?: boolean;
    };
    tax?: number;
    notes?: string;
    status?: DocumentStatus;
  }) => {
    const subtotal = purchaseData.items.reduce((sum, item) => sum + item.total, 0);
    setPurchases(prev => prev.map(p =>
      p.id === purchaseId
        ? {
            ...p,
            documentNumber: purchaseData.invoiceNumber,
            supplierId: purchaseData.supplierId,
            supplierName: purchaseData.supplierName,
            items: purchaseData.items,
            subtotal,
            tax: purchaseData.tax,
            total: subtotal + (purchaseData.tax || 0),
            paymentMethod: purchaseData.paymentMethod,
            paymentDetails: purchaseData.paymentDetails,
            notes: purchaseData.notes,
            ...(purchaseData.status !== undefined ? { status: purchaseData.status } : {}),
            updatedAt: new Date(),
          }
        : p,
    ));
  }, [setPurchases]);

  const deletePurchase = useCallback((purchaseId: string) => {
    setPurchases(prev => prev.filter(p => p.id !== purchaseId));
  }, [setPurchases]);

  const convertDeliveryToInvoice = useCallback((
    deliveryId: string,
    paymentData: {
      paymentMethod: PaymentMethod;
      paymentDetails?: PurchaseDocument['paymentDetails'];
    },
  ) => {
    const { updatedList, invoice } = convertDelivery(purchases, deliveryId, paymentData);
    setPurchases(() => updatedList);
    return invoice;
  }, [purchases, setPurchases]);

  const updateDocumentStatus = useCallback((documentId: string, status: DocumentStatus) => {
    setPurchases(prev => prev.map(p =>
      p.id === documentId ? { ...p, status, updatedAt: new Date() } : p,
    ));
  }, [setPurchases]);

  const markAsPaid = useCallback((purchaseId: string, bankId: string, bankName: string, amount: number) => {
    setPurchases(prev => prev.map(p =>
      p.id === purchaseId ? applyPayment(p, bankId, bankName, amount) : p,
    ));
  }, [setPurchases]);

  return {
    purchases,
    addPurchase,
    createDocument,
    updatePurchase,
    deletePurchase,
    getPurchasesByDate,
    getPurchasesBySupplier,
    convertDeliveryToInvoice,
    updateDocumentStatus,
    markAsPaid,
    generateDocumentNumber: useCallback(
      (type: DocumentType) => generateDocumentNumber(purchases, type),
      [purchases],
    ),
  };
}
