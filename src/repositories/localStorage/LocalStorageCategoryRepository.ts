import type { Category } from '@/types/product';
import type { ICategoryRepository, CreateCategoryInput } from '../interfaces/ICategoryRepository';
import { createCategory } from '@/domain/inventory';
import { LocalStorageRepository } from './base';

export class LocalStorageCategoryRepository
  extends LocalStorageRepository<Category>
  implements ICategoryRepository
{
  constructor() {
    super('categories');
  }

  async create(data: CreateCategoryInput): Promise<Category> {
    const categories = this.read();
    const category = createCategory(data.name, data.description);
    this.write([...categories, category]);
    return category;
  }

  async update(id: string, data: Partial<Category>): Promise<Category> {
    const updated = this.read().map(c =>
      c.id === id ? { ...c, ...data } : c
    );
    this.write(updated);
    const result = updated.find(c => c.id === id);
    if (!result) throw new Error(`Categoría ${id} no encontrada`);
    return result;
  }

  async findByName(name: string): Promise<Category | null> {
    const lower = name.toLowerCase();
    return this.read().find(c => c.name.toLowerCase() === lower) ?? null;
  }
}
