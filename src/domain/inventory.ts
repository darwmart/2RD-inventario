import { Product, Category, Supplier } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export type CreateProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'reservedStock'>;

export function createProduct(data: CreateProductInput): Product {
  return { ...data, id: uuidv4(), createdAt: new Date(), updatedAt: new Date(), reservedStock: 0 };
}

export function applyProductUpdate(products: Product[], id: string, updates: Partial<Product>): Product[] {
  return products.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p);
}

export function applyStockUpdate(
  products: Product[],
  productId: string,
  newStock: number,
  newReservedStock?: number,
): Product[] {
  return products.map(p =>
    p.id === productId
      ? { ...p, stock: newStock, reservedStock: newReservedStock ?? p.reservedStock ?? 0, updatedAt: new Date() }
      : p,
  );
}

export function createCategory(name: string, description: string): Category {
  return { id: uuidv4(), name, description, createdAt: new Date() };
}

export function createSupplier(suppliers: Supplier[], data: Omit<Supplier, 'id' | 'createdAt'>): Supplier {
  const maxCode = suppliers.reduce((max, s) => Math.max(max, parseInt(s.code || '0')), 0);
  return { ...data, code: String(maxCode + 1), id: uuidv4(), createdAt: new Date() };
}
