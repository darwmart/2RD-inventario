import type { PaymentMethod } from './shared';

export type DocumentStatus = 'pending' | 'partial' | 'completed' | 'invoiced' | 'cancelled';

export type DocumentType = 'delivery' | 'invoice';

export type PurchaseItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
};

export type PurchaseDocument = {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  supplierInvoiceNumber?: string;
  warehouse?: string;
  status: DocumentStatus;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  subtotal: number;
  tax?: number;
  total: number;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;

  paymentMethod?: PaymentMethod;
  paymentDetails?: {
    dueDate?: string;
    bankId?: string;
    bankName?: string;
    isCashPayment?: boolean;
    paidAt?: string;
  };

  payments?: {
    date: string;
    amount: number;
    bankId: string;
    bankName: string;
  }[];

  orderRef?: string;
  deliveryRef?: string;
  invoiceRef?: string;
};

// Alias de compatibilidad
export type Purchase = PurchaseDocument;
