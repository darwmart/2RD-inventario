import type { Category } from '@/types/product';
import type { IBaseRepository } from './IBaseRepository';

export type CreateCategoryInput = Pick<Category, 'name' | 'description'>;

export interface ICategoryRepository extends IBaseRepository<Category, CreateCategoryInput> {
  findByName(name: string): Promise<Category | null>;
}
