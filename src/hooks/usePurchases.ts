import { useCallback } from 'react';
import { Purchase, PurchaseDocument, PurchaseItem, PaymentMethod, DocumentType, DocumentStatus } from '@/types';
import { useLocalStorage } from './useLocalStorage';
import { v4 as uuidv4 } from 'uuid';

export function usePurchases() {
  const [purchases, setPurchases] = useLocalStorage<PurchaseDocument[]>('purchases', []);

  // Generar número de documento según tipo y año
  const generateDocumentNumber = useCallback((type: DocumentType) => {
    const year = new Date().getFullYear();
    const prefix = type === 'delivery' ? 'A' : 'F';

    // Filtrar documentos del mismo tipo y año
    const docsOfType = purchases.filter(p => {
      const docYear = new Date(p.createdAt).getFullYear();
      return p.documentType === type && docYear === year;
    });

    const nextNumber = docsOfType.length + 1;
    return `${prefix}-${year}-${String(nextNumber).padStart(4, '0')}`;
  }, [purchases]);

  // Crear documento de compra (Pedido, Albarán o Factura)
  const createDocument = useCallback((data: {
    documentType: DocumentType;
    supplierId: string;
    supplierName: string;
    items: PurchaseItem[];
    tax?: number;
    notes?: string;
    supplierInvoiceNumber?: string;
    paymentMethod?: PaymentMethod;
    paymentDetails?: {
      dueDate?: string;
      bankId?: string;
      bankName?: string;
      isCashPayment?: boolean;
    };
    orderRef?: string;
    deliveryRef?: string;
  }) => {
    const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal + (data.tax || 0);

    // Las facturas se crean con estado 'pending', se cambiarán a 'completed' cuando se paguen
    const status: DocumentStatus = 'pending';

    const newDocument: PurchaseDocument = {
      id: uuidv4(),
      documentType: data.documentType,
      documentNumber: generateDocumentNumber(data.documentType),
      supplierInvoiceNumber: data.supplierInvoiceNumber,
      status,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      items: data.items,
      subtotal,
      tax: data.tax,
      total,
      notes: data.notes,
      createdAt: new Date(),
      paymentMethod: data.paymentMethod,
      paymentDetails: data.paymentDetails,
      orderRef: data.orderRef,
      deliveryRef: data.deliveryRef,
    };

    setPurchases(prev => [...prev, newDocument]);
    return newDocument;
  }, [setPurchases, generateDocumentNumber]);

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
    const total = subtotal + (purchaseData.tax || 0);

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
  }) => {
    const subtotal = purchaseData.items.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal + (purchaseData.tax || 0);

    setPurchases(prev => prev.map(purchase =>
      purchase.id === purchaseId
        ? {
            ...purchase,
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
          }
        : purchase
    ));
  }, [setPurchases]);

  const deletePurchase = useCallback((purchaseId: string) => {
    setPurchases(prev => prev.filter(purchase => purchase.id !== purchaseId));
  }, [setPurchases]);

  // Convertir Albarán a Factura
  const convertDeliveryToInvoice = useCallback((deliveryId: string, paymentData: {
    paymentMethod: PaymentMethod;
    paymentDetails?: {
      dueDate?: string;
      bankId?: string;
      bankName?: string;
      isCashPayment?: boolean;
    };
  }) => {
    const delivery = purchases.find(p => p.id === deliveryId);
    if (!delivery || delivery.documentType !== 'delivery') {
      throw new Error('Documento no encontrado o no es un albarán');
    }

    // Crear factura basada en el albarán
    const invoice = createDocument({
      documentType: 'invoice',
      supplierId: delivery.supplierId,
      supplierName: delivery.supplierName,
      items: delivery.items,
      tax: delivery.tax,
      notes: delivery.notes,
      paymentMethod: paymentData.paymentMethod,
      paymentDetails: paymentData.paymentDetails,
      orderRef: delivery.orderRef,
      deliveryRef: delivery.id,
    });

    // Actualizar estado del albarán
    setPurchases(prev => prev.map(p =>
      p.id === deliveryId
        ? { ...p, status: 'invoiced' as DocumentStatus, invoiceRef: invoice.id }
        : p
    ));

    return invoice;
  }, [purchases, createDocument, setPurchases]);

  // Actualizar estado de un documento
  const updateDocumentStatus = useCallback((documentId: string, status: DocumentStatus) => {
    setPurchases(prev => prev.map(p =>
      p.id === documentId
        ? { ...p, status, updatedAt: new Date() }
        : p
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
    generateDocumentNumber,
  };
}
