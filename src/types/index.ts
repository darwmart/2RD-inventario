export interface Product {
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
  categoryId: string;
  supplierId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleItem {
  id?: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;  // Precio de venta unitario
  total: number;      // unitPrice * quantity
  cost: number;       // Costo unitario desde Product
  
}

export interface Category {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  createdAt: Date;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'cash' | 'electronic' | 'credit';
  isActive: boolean;
}

export interface Sale {
  id: string;
  saleNumber: string;
  advisorId: string;
  advisorName: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  // Datos del cliente (opcionales para cotización, usados en separado)
  customerName?: string;
  customerDocument?: string;
  customerPhone?: string;
  // Abono inicial (aplica para separados)
  deposit?: number;
  // Historial de abonos por método de pago
  deposits?: Array<{
    id: string;
    amount: number;
    method: PaymentMethod;
    createdAt: Date;
  }>;
  status: 'completed' | 'pending' | 'cancelled';
  type: 'sale' | 'quote' | 'reserved';
  createdAt: Date;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CashRegister {
  id: string;
  date: string;
  openingBalance: number;
  sales: Sale[];
  cashSales: number;
  electronicSales: number;
  creditSales: number;
  totalSales: number;
  closingBalance: number;
  isOpen: boolean;
}

export interface Advisor {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: Date;
}