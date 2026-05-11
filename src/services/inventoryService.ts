import type { Product, Category } from '@/types/product';
import type { Supplier } from '@/types/supplier';
import type { IProductRepository } from '@/repositories/interfaces/IProductRepository';
import type { ICategoryRepository } from '@/repositories/interfaces/ICategoryRepository';
import type { ISupplierRepository } from '@/repositories/interfaces/ISupplierRepository';
import type { CreateProductInput } from '@/domain/inventory';

export class InventoryService {
  constructor(
    private readonly products: IProductRepository,
    private readonly categories: ICategoryRepository,
    private readonly suppliers: ISupplierRepository,
  ) {}

  // ─── PRODUCTOS ───────────────────────────────────────────────────────────────

  async getAllProducts(): Promise<Product[]> {
    return this.products.findAll();
  }

  async getProductById(id: string): Promise<Product> {
    const p = await this.products.findById(id);
    if (!p) throw new Error(`Producto ${id} no encontrado`);
    return p;
  }

  async addProduct(data: CreateProductInput): Promise<Product> {
    if (!data.name?.trim()) throw new Error('El nombre del producto es requerido');
    if (data.cost < 0) throw new Error('El costo no puede ser negativo');
    if (data.currentPrice < 0) throw new Error('El precio no puede ser negativo');
    return this.products.create(data);
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    if (updates.cost !== undefined && updates.cost < 0)
      throw new Error('El costo no puede ser negativo');
    if (updates.currentPrice !== undefined && updates.currentPrice < 0)
      throw new Error('El precio no puede ser negativo');
    return this.products.update(id, updates);
  }

  async deleteProduct(id: string): Promise<void> {
    return this.products.delete(id);
  }

  async updateStock(id: string, stock: number, reservedStock?: number): Promise<void> {
    if (stock < 0) throw new Error('El stock no puede ser negativo');
    return this.products.updateStock(id, stock, reservedStock);
  }

  async getLowStockProducts(): Promise<Product[]> {
    return this.products.getLowStock();
  }

  async findByBarcode(barcode: string): Promise<Product | null> {
    return this.products.findByBarcode(barcode);
  }

  async findByReference(reference: string): Promise<Product | null> {
    return this.products.findByReference(reference);
  }

  // ─── CATEGORÍAS ──────────────────────────────────────────────────────────────

  async getAllCategories(): Promise<Category[]> {
    return this.categories.findAll();
  }

  async addCategory(name: string, description: string): Promise<Category> {
    if (!name?.trim()) throw new Error('El nombre de la categoría es requerido');
    const existing = await this.categories.findByName(name.trim());
    if (existing) throw new Error(`Ya existe una categoría llamada "${name}"`);
    return this.categories.create({ name: name.trim(), description });
  }

  async updateCategory(id: string, name: string, description: string): Promise<Category> {
    return this.categories.update(id, { name, description });
  }

  async deleteCategory(id: string): Promise<void> {
    const products = await this.products.findByCategory(id);
    if (products.length > 0)
      throw new Error('No se puede eliminar una categoría con artículos asignados');
    return this.categories.delete(id);
  }

  // ─── PROVEEDORES ─────────────────────────────────────────────────────────────

  async getAllSuppliers(): Promise<Supplier[]> {
    return this.suppliers.findAll();
  }

  async addSupplier(data: Omit<Supplier, 'id' | 'createdAt' | 'code'>): Promise<Supplier> {
    if (!data.fiscalName?.trim()) throw new Error('El nombre fiscal es requerido');
    return this.suppliers.create(data);
  }

  async updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier> {
    return this.suppliers.update(id, updates);
  }

  async deleteSupplier(id: string): Promise<void> {
    const products = await this.products.findBySupplier(id);
    if (products.length > 0)
      throw new Error('No se puede eliminar un proveedor con artículos asignados');
    return this.suppliers.delete(id);
  }
}
