import type { Product } from '@/types/product';
import type { IProductRepository } from '../interfaces/IProductRepository';
import type { CreateProductInput } from '@/domain/inventory';
import { createProduct, applyProductUpdate, applyStockUpdate } from '@/domain/inventory';
import { LocalStorageRepository } from './base';

export class LocalStorageProductRepository
  extends LocalStorageRepository<Product>
  implements IProductRepository
{
  constructor() {
    super('products');
  }

  async create(data: CreateProductInput): Promise<Product> {
    const products = this.read();
    const product = createProduct(data);
    this.write([...products, product]);
    return product;
  }

  async update(id: string, data: Partial<Product>): Promise<Product> {
    const products = this.read();
    const updated = applyProductUpdate(products, id, data);
    this.write(updated);
    const result = updated.find(p => p.id === id);
    if (!result) throw new Error(`Producto ${id} no encontrado`);
    return result;
  }

  async findByBarcode(barcode: string): Promise<Product | null> {
    return this.read().find(p => p.barcode === barcode) ?? null;
  }

  async findByReference(reference: string): Promise<Product | null> {
    return this.read().find(p => p.reference === reference) ?? null;
  }

  async findByCategory(categoryId: string): Promise<Product[]> {
    return this.read().filter(p => p.categoryId === categoryId);
  }

  async findBySupplier(supplierId: string): Promise<Product[]> {
    return this.read().filter(p => p.supplierId === supplierId);
  }

  async getLowStock(): Promise<Product[]> {
    return this.read().filter(p => p.stock > 0 && p.stock <= p.minStock);
  }

  async updateStock(id: string, delta: number, reservedDelta?: number): Promise<void> {
    const products = this.read();
    const current = products.find(p => p.id === id);
    if (!current) return;
    const newStock = Math.max(0, current.stock + delta);
    const newReserved = reservedDelta !== undefined
      ? Math.max(0, (current.reservedStock ?? 0) + reservedDelta)
      : undefined;
    const updated = applyStockUpdate(products, id, newStock, newReserved);
    this.write(updated);
  }
}
