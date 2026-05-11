import type { PaymentMethod, Deposit } from './shared';

export type SaleItem = {
  productId: string;
  productName: string;
  description: string;
  cost: number;
  quantity: number;
  unitPrice: number;
  total: number;
  hasIva?: boolean;
  ivaAmount?: number;
};

export type Sale = {
  id: string;
  saleNumber: string;
  advisorId: string;
  advisorName: string;
  customerId?: string;
  items: SaleItem[];
  subtotal: number;
  discount?: number;
  total: number;
  ivaTotal?: number;
  commission?: number;
  commissionAmount?: number;
  reteivaAmount?: number;
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerDocument?: string;
  customerPhone?: string;
  deposit?: number;
  deposits?: Deposit[];
  status: 'pending' | 'completed' | 'cancelled' | 'returned';
  type: 'sale' | 'quote' | 'reserved';
  createdAt: Date;
};

export type SaleReturn = {
  id: string;
  returnNumber: string;
  saleId: string;
  saleNumber: string;
  advisorId: string;
  advisorName: string;
  items: SaleItem[];
  subtotal: number;
  total: number;
  reason: string;
  paymentMethod?: PaymentMethod;
  createdAt: Date;
};

export type AdvisorCommission = {
  advisorId: string;
  advisorName: string;
  period: string;
  salesCount: number;
  totalSales: number;
  commissionRate: number;
  commissionAmount: number;
};
