import { PurchaseDocument, PurchaseItem, PaymentMethod, DocumentType, DocumentStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export type CreateDocumentInput = {
  documentType: DocumentType;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  tax?: number;
  notes?: string;
  supplierInvoiceNumber?: string;
  /** Sobreescribe la numeración automática (para compras directas con N° de factura del proveedor) */
  documentNumber?: string;
  /** Sobreescribe el estado inicial (por defecto 'pending') */
  status?: DocumentStatus;
  /** Bodega destino (opcional) */
  warehouse?: string;
  /** Fecha real del documento (independiente de cuándo se digitó en el sistema) */
  documentDate?: Date;
  paymentMethod?: PaymentMethod;
  paymentDetails?: PurchaseDocument['paymentDetails'];
  orderRef?: string;
  deliveryRef?: string;
};

export function generateDocumentNumber(purchases: PurchaseDocument[], type: DocumentType): string {
  const year = new Date().getFullYear();
  const prefix = type === 'delivery' ? 'A' : 'F';
  const count = purchases.filter(
    p => p.documentType === type && new Date(p.createdAt).getFullYear() === year,
  ).length;
  return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
}

export function buildDocument(purchases: PurchaseDocument[], data: CreateDocumentInput): PurchaseDocument {
  const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
  return {
    id: uuidv4(),
    documentType: data.documentType,
    documentNumber: data.documentNumber ?? generateDocumentNumber(purchases, data.documentType),
    supplierInvoiceNumber: data.supplierInvoiceNumber,
    warehouse: data.warehouse,
    status: data.status ?? 'pending',
    supplierId: data.supplierId,
    supplierName: data.supplierName,
    items: data.items,
    subtotal,
    tax: data.tax,
    total: subtotal + (data.tax || 0),
    notes: data.notes,
    documentDate: data.documentDate ?? new Date(),
    createdAt: new Date(),
    paymentMethod: data.paymentMethod,
    paymentDetails: data.paymentDetails,
    orderRef: data.orderRef,
    deliveryRef: data.deliveryRef,
  };
}

export function applyPayment(
  purchase: PurchaseDocument,
  bankId: string,
  bankName: string,
  amount: number,
): PurchaseDocument {
  return {
    ...purchase,
    status: 'completed' as DocumentStatus,
    paymentDetails: {
      ...purchase.paymentDetails,
      bankId,
      bankName,
      paidAt: new Date().toISOString(),
    },
    payments: [
      ...(purchase.payments || []),
      { date: new Date().toISOString(), amount, bankId, bankName },
    ],
    updatedAt: new Date(),
  };
}

// Convierte un albarán a factura y marca el albarán como facturado.
// Retorna [lista actualizada, factura nueva] para aplicar en un solo setState.
export function convertDelivery(
  purchases: PurchaseDocument[],
  deliveryId: string,
  paymentData: {
    paymentMethod: PaymentMethod;
    paymentDetails?: PurchaseDocument['paymentDetails'];
  },
): { updatedList: PurchaseDocument[]; invoice: PurchaseDocument } {
  const delivery = purchases.find(p => p.id === deliveryId);
  if (!delivery || delivery.documentType !== 'delivery') {
    throw new Error('Documento no encontrado o no es un albarán');
  }

  const invoice = buildDocument(purchases, {
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

  const updatedList = [
    ...purchases.map(p =>
      p.id === deliveryId ? { ...p, status: 'invoiced' as DocumentStatus, invoiceRef: invoice.id } : p,
    ),
    invoice,
  ];

  return { updatedList, invoice };
}
