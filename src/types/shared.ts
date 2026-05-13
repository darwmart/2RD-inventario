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
  document?: string;    // Cédula de ciudadanía
  baseSalary?: number;  // Salario base configurado
  isActive: boolean;
  createdAt: Date;
};

export type LoanPayment = {
  id: string;
  loanId: string;
  advisorId: string;
  advisorName: string;
  amount: number;
  salaryPaymentId?: string;
  date: string;
  notes: string;
};

export type SalaryPayment = {
  id: string;
  advisorId: string;
  advisorName: string;
  advisorDocument?: string;
  period: string;           // 'YYYY-MM' derivado de fromDate
  fromDate: string;         // fecha inicio del período
  toDate: string;           // fecha fin del período
  daysWorked: number;       // días calculados (ley colombiana: mes = 30 días)
  baseSalaryMonthly: number; // salario base mensual configurado
  baseSalary: number;       // salario proporcional = baseSalaryMonthly * daysWorked / 30
  commissions: number;
  transportAllowance: number;
  healthDeduction: number;
  pensionDeduction: number;
  loanDeductions: { loanId: string; description: string; amount: number }[];
  otherDeductions: number;
  otherDeductionDesc: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  paymentMethod: string;
  paymentDate: string;
  notes: string;
  createdAt: string;
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
