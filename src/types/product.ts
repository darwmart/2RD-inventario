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
  hasIva: boolean;
  categoryId: string;
  supplierId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Category = {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
};

export type StockCountItem = {
  productId: string;
  productName: string;
  barcode?: string;
  reference?: string;
  systemStock: number;
  countedStock: number;
  difference: number;
};

export type StockCount = {
  id: string;
  countNumber: string;
  status: 'draft' | 'completed';
  items: StockCountItem[];
  notes?: string;
  createdAt: Date;
  completedAt?: Date;
};
