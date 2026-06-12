import type { Product } from '@/types/product';
import type { IBaseRepository } from './IBaseRepository';
import type { CreateProductInput } from '@/domain/inventory';

export interface IProductRepository extends IBaseRepository<Product, CreateProductInput> {
  findByBarcode(barcode: string): Promise<Product | null>;
  findByReference(reference: string): Promise<Product | null>;
  findByCategory(categoryId: string): Promise<Product[]>;
  findBySupplier(supplierId: string): Promise<Product[]>;
  getLowStock(): Promise<Product[]>;
  updateStock(id: string, delta: number, reservedDelta?: number): Promise<void>;
}
