import { Sale, SaleItem, PaymentMethod, Advisor, Deposit } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export type CreateSaleInput = {
  advisorId: string;
  advisorName: string;
  items: SaleItem[];
  paymentMethod: PaymentMethod;
  discount?: number;
  type: 'sale' | 'quote' | 'reserved';
  customerName?: string;
  customerDocument?: string;
  customerPhone?: string;
  deposit?: number;
  ivaTotal?: number;
  commission?: number;
  commissionAmount?: number;
  reteivaAmount?: number;
};

export function buildSale(data: CreateSaleInput): Sale {
  const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal - (data.discount || 0);

  const deposits: Deposit[] | undefined =
    data.type === 'reserved' && (data.deposit || 0) > 0
      ? [{ id: uuidv4(), amount: data.deposit as number, method: data.paymentMethod, createdAt: new Date() }]
      : undefined;

  return {
    id: uuidv4(),
    saleNumber: `V${Date.now()}`,
    advisorId: data.advisorId,
    advisorName: data.advisorName,
    items: data.items,
    subtotal,
    discount: data.discount || 0,
    total,
    ivaTotal: data.ivaTotal,
    commission: data.commission,
    commissionAmount: data.commissionAmount,
    reteivaAmount: data.reteivaAmount,
    paymentMethod: data.paymentMethod,
    customerName: data.customerName,
    customerDocument: data.customerDocument,
    customerPhone: data.customerPhone,
    deposit: data.deposit,
    deposits,
    status: data.type === 'sale' ? 'completed' : 'pending',
    type: data.type,
    createdAt: new Date(),
  };
}

export function createPaymentMethod(
  name: string,
  type: 'cash' | 'electronic' | 'credit',
  bankId?: string,
  commission?: number,
  paymentPeriod?: 'immediate' | 'weekly' | 'monthly',
  paymentDays?: number,
): PaymentMethod {
  return {
    id: uuidv4(),
    name,
    type,
    isActive: true,
    ...(bankId ? { bankId } : {}),
    ...(commission !== undefined ? { commission } : {}),
    ...(paymentPeriod ? { paymentPeriod } : {}),
    ...(paymentDays !== undefined ? { paymentDays } : {}),
  };
}

export function createAdvisor(data: Omit<Advisor, 'id' | 'createdAt'>): Advisor {
  return { ...data, id: uuidv4(), createdAt: new Date() };
}

export function addDepositToSale(sale: Sale, amount: number, paymentMethod: PaymentMethod): Sale {
  const record: Deposit = { id: uuidv4(), amount, method: paymentMethod, createdAt: new Date() };
  return {
    ...sale,
    deposit: (sale.deposit || 0) + amount,
    deposits: [...(sale.deposits || []), record],
  };
}

export function filterSalesByDate(sales: Sale[], date: string): Sale[] {
  const toKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };
  const targetKey = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : toKey(new Date(date));
  return sales.filter(s => toKey(new Date(s.createdAt)) === targetKey);
}
