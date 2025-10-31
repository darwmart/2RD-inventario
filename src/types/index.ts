export type Product = {
  id: string;
  name: string;
  barcode: string;
  reference: string;
  description: string;
  image: string;
  cost: number;
  suggestedPrice: number;
  discountPrice: number;
  wholesalePrice: number;
  currentPrice: number;
  stock: number;
  minStock: number;
  reservedStock?: number;
  hasIva: boolean; // Si el precio incluye IVA o no
  categoryId: string;
  supplierId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type SaleItem = {
  productId: string;
  productName: string;
  description: string;
  cost: number;
  quantity: number;
  unitPrice: number;
  total: number;
  hasIva?: boolean; // Si el item tiene IVA incluido
  ivaAmount?: number; // Monto del IVA calculado
};

export type PaymentMethod = {
  id: string;
  name: string;
  type: 'cash' | 'electronic' | 'credit';
  isActive: boolean;
};

export type Advisor = {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: Date;
};

export type Category = {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
};

export type Supplier = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  createdAt: Date;
};

export type Expense = {
  id: string;
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

export type Sale = {
  id: string;
  saleNumber: string;
  advisorId: string;
  advisorName: string;
  items: SaleItem[];
  subtotal: number;
  discount?: number;
  total: number;
  ivaTotal?: number; // Total de IVA de la venta
  paymentMethod: PaymentMethod;
  customerName?: string;
  customerDocument?: string;
  customerPhone?: string;
  deposit?: number;
  deposits?: Deposit[];
  status: 'pending' | 'completed' | 'cancelled';
  type: 'sale' | 'quote' | 'reserved';
  createdAt: Date;
};

export type RecordType = 'ingreso' | 'egreso' | 'compra' | 'credito';

export type AccountingRecord = {
  id: number;
  tipo: RecordType;
  descripcion: string;
  proveedor?: string;
  factura?: string;
  monto: number;
  banco: string;
  fecha: string;
};

export type CardSettings = {
  // Configuración de retraso de acreditación
  delayEnabled: boolean; // Activar/desactivar retraso

  // Configuración de comisiones
  debitCommission: number; // Porcentaje de comisión para débito
  creditCommission: number; // Porcentaje de comisión para crédito
  reteiva: number; // Porcentaje de reteiva

  // Activar/desactivar descuentos
  commissionsEnabled: boolean;
  reteivaEnabled: boolean;
};

export type CompanyInfo = {
  name: string;
  nit: string;
  address: string;
  phone: string;
  email?: string;
};

export type TaxSettings = {
  ivaEnabled: boolean;
  ivaPercentage: number;
};

export type PurchaseItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
};

export type Purchase = {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  subtotal: number;
  tax?: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentDetails?: {
    // Para crédito
    creditDays?: number; // Deprecated: usar dueDate en su lugar
    dueDate?: string; // Fecha de vencimiento del crédito
    // Para transferencia
    bankId?: string;
    bankName?: string;
    // Para consignación (se resta del efectivo)
    isCashPayment?: boolean;
  };
  notes?: string;
  createdAt: Date;
};

export type Bank = {
  id: string;
  name: string;
  icon?: string;
  isActive: boolean;
};