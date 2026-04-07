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

// Tipo de proveedor expandido - basado en estructura similar a sistema de gestión comercial
export type Supplier = {
  id: string;
  code?: string; // Código del proveedor
  accountingCode?: string; // Código contabilidad

  // Identificación fiscal
  taxIdType: string; // N.I.T., C.C., etc.
  taxId: string; // Número de identificación
  fiscalName: string; // Nombre fiscal (legal)
  commercialName?: string; // Nombre comercial

  // Domicilio
  address: string; // Calle/dirección
  postalCode?: string;
  city?: string; // Población
  province?: string;
  country?: string;

  // Contacto
  phone: string;
  mobile?: string;
  fax?: string;
  contactPerson?: string; // Persona de contacto
  email: string;
  twitter?: string; // Perfil de Twitter
  facebook?: string; // Página de Facebook

  // Datos bancarios
  iban?: string;
  ccc?: string; // Código cuenta cliente
  bankName?: string;

  // Otros
  observations?: string; // Observaciones/notas
  isProvider?: boolean; // Es proveedor
  isCreditor?: boolean; // Es acreedor

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

export type RecordType = 'ingreso' | 'egreso' | 'compra' | 'credito' | 'traspaso';

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

export type CashRegisterSession = {
  id: string;
  date: string; // YYYY-MM-DD
  openingAmount: number; // Monto con el que se abre la caja
  openingTime: string; // ISO timestamp
  closingAmount?: number; // Monto contado al cerrar
  closingTime?: string; // ISO timestamp
  status: 'open' | 'closed';
  difference?: number; // Diferencia entre lo esperado y lo contado
  notes?: string;
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
  warehouse?: string; // Almacén
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

export type Printer = {
  id: string;
  name: string;
  type: 'thermal' | 'laser' | 'inkjet' | 'network';
  isActive: boolean;
  isDefault: boolean;
  paperSize?: string; // A4, Letter, 80mm, etc.
  createdAt: Date;
};

export type ExternalWarehouse = {
  id: string;
  code: string;
  name: string;
  location?: string;
  contact?: string;
  phone?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type WarehouseTransactionType = 'loan' | 'return' | 'adjustment';

export type WarehouseTransactionItem = {
  productId: string;
  productName: string;
  barcode?: string;
  reference?: string;
  quantity: number;
};

export type WarehouseTransaction = {
  id: string;
  warehouseId: string;
  warehouseName: string;
  type: WarehouseTransactionType;
  items: WarehouseTransactionItem[];
  notes?: string;
  createdAt: Date;
  createdBy: string;
};

export type LabelDesign = {
  id: string;
  code: string; // Código del modelo (ej: 10002, 10003, 2)
  name: string; // Nombre del modelo (ej: "Copia de Cód. Barras")
  description?: string;
  documentType: string; // Tipo de documento (ej: "Etiquetas de artículos")
  printerName: string;
  labelWidth: string; // mm
  labelHeight: string; // mm
  labelsPerRow: string;
  labelsPerColumn: string;
  topMargin: string; // mm
  leftMargin: string; // mm
  horizontalSpacing: string; // mm
  verticalSpacing: string; // mm
  createdAt: Date;
};