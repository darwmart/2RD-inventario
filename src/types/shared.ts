// Tipos transversales compartidos entre múltiples dominios

export type PaymentMethod = {
  id: string;
  name: string;
  type: 'cash' | 'electronic' | 'credit';
  isActive: boolean;
  bankId?: string;
  commission?: number;
  paymentPeriod?: 'immediate' | 'weekly' | 'monthly';
  paymentDays?: number;
};

export type Advisor = {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: Date;
};

export type Expense = {
  id: string;
  advisorId: string;
  advisor: string;
  type: 'gasto' | 'prestamo';
  amount: number;
  description: string;
  createdAt: string;
};

export type Deposit = {
  id: string;
  amount: number;
  method: PaymentMethod;
  createdAt: Date;
};
