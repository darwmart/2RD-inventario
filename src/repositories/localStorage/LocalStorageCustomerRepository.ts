import type { Customer } from '@/types/customer';
import type { ICustomerRepository, CreateCustomerInput } from '../interfaces/ICustomerRepository';
import { v4 as uuidv4 } from 'uuid';
import { LocalStorageRepository } from './base';

export class LocalStorageCustomerRepository
  extends LocalStorageRepository<Customer>
  implements ICustomerRepository
{
  constructor() {
    super('customers');
  }

  async create(data: CreateCustomerInput): Promise<Customer> {
    const customer: Customer = { ...data, id: uuidv4(), createdAt: new Date() };
    this.write([...this.read(), customer]);
    return customer;
  }

  async update(id: string, data: Partial<Customer>): Promise<Customer> {
    const updated = this.read().map(c =>
      c.id === id ? { ...c, ...data } : c
    );
    this.write(updated);
    const result = updated.find(c => c.id === id);
    if (!result) throw new Error(`Cliente ${id} no encontrado`);
    return result;
  }

  async findByDocument(document: string): Promise<Customer | null> {
    return this.read().find(c => c.document === document) ?? null;
  }

  async search(term: string): Promise<Customer[]> {
    const lower = term.toLowerCase();
    return this.read().filter(c =>
      c.name.toLowerCase().includes(lower) ||
      c.document?.toLowerCase().includes(lower) ||
      c.phone?.toLowerCase().includes(lower) ||
      c.email?.toLowerCase().includes(lower)
    );
  }
}
