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

export type WarehouseTransactionType = 'loan' | 'return' | 'adjustment' | 'exchange';

export type WarehouseTransactionItem = {
  productId: string;
  productName: string;
  barcode?: string;
  reference?: string;
  quantity: number;
  color?: string;
  brand?: string;
  size?: string;
  direction?: 'out' | 'in';
};

export type WarehouseTransaction = {
  id: string;
  warehouseId: string;
  warehouseName: string;
  type: WarehouseTransactionType;
  items: WarehouseTransactionItem[];
  notes?: string;
  evidenceImages?: string[];
  createdAt: Date;
  createdBy: string;
};
