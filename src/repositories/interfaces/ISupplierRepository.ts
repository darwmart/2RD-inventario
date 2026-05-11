import type { Supplier } from '@/types/supplier';
import type { IBaseRepository } from './IBaseRepository';

export type CreateSupplierInput = Omit<Supplier, 'id' | 'createdAt' | 'code'>;

export interface ISupplierRepository extends IBaseRepository<Supplier, CreateSupplierInput> {
  findByTaxId(taxId: string): Promise<Supplier | null>;
  getNextCode(): Promise<string>;
}
