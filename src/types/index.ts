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

// Estados de documentos estilo FactuSOL
export type DocumentStatus = 'pending' | 'partial' | 'completed' | 'invoiced' | 'cancelled';

export type DocumentType = 'delivery' | 'invoice';

export type PurchaseItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
};

// Documento base de compra (común para Pedidos, Albaranes y Facturas)
export type PurchaseDocument = {
  id: string;
  documentType: DocumentType; // 'order' | 'delivery' | 'invoice'
  documentNumber: string; // P-2025-0001, A-2025-0001, F-2025-0001
  supplierInvoiceNumber?: string; // Número de factura del proveedor
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

  // Solo para facturas
  paymentMethod?: PaymentMethod;
  paymentDetails?: {
    dueDate?: string;
    bankId?: string;
    bankName?: string;
    isCashPayment?: boolean;
  };

  // Referencias a documentos relacionados
  orderRef?: string; // Referencia al pedido origen
  deliveryRef?: string; // Referencia al albarán origen
  invoiceRef?: string; // Referencia a la factura generada
};

// Tipo legacy para compatibilidad
export type Purchase = PurchaseDocument;

export type Bank = {
  id: string;
  name: string;
  icon?: string;
  isActive: boolean;
  balance?: number;
};