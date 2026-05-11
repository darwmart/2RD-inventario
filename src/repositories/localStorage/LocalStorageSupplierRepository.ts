import type { Supplier } from '@/types/supplier';
import type { ISupplierRepository, CreateSupplierInput } from '../interfaces/ISupplierRepository';
import { createSupplier } from '@/domain/inventory';
import { LocalStorageRepository } from './base';

export class LocalStorageSupplierRepository
  extends LocalStorageRepository<Supplier>
  implements ISupplierRepository
{
  constructor() {
    super('suppliers');
  }

  async create(data: CreateSupplierInput): Promise<Supplier> {
    const suppliers = this.read();
    const supplier = createSupplier(suppliers, data);
    this.write([...suppliers, supplier]);
    return supplier;
  }

  async update(id: string, data: Partial<Supplier>): Promise<Supplier> {
    const updated = this.read().map(s =>
      s.id === id ? { ...s, ...data } : s
    );
    this.write(updated);
    const result = updated.find(s => s.id === id);
    if (!result) throw new Error(`Proveedor ${id} no encontrado`);
    return result;
  }

  async findByTaxId(taxId: string): Promise<Supplier | null> {
    return this.read().find(s => s.taxId === taxId) ?? null;
  }

  async getNextCode(): Promise<string> {
    const suppliers = this.read();
    const maxCode = suppliers.reduce((max, s) => Math.max(max, parseInt(s.code ?? '0')), 0);
    return String(maxCode + 1);
  }
}
