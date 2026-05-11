import type { Customer } from '@/types/customer';
import type { ICustomerRepository } from '@/repositories/interfaces/ICustomerRepository';

export type CreateCustomerInput = Omit<Customer, 'id' | 'createdAt'>;

export class CustomerService {
  constructor(private readonly customers: ICustomerRepository) {}

  async getAll(): Promise<Customer[]> {
    return this.customers.findAll();
  }

  async getById(id: string): Promise<Customer> {
    const c = await this.customers.findById(id);
    if (!c) throw new Error(`Cliente ${id} no encontrado`);
    return c;
  }

  async add(data: CreateCustomerInput): Promise<Customer> {
    if (!data.name?.trim()) throw new Error('El nombre del cliente es requerido');
    if (data.document) {
      const existing = await this.customers.findByDocument(data.document);
      if (existing) throw new Error(`Ya existe un cliente con el documento ${data.document}`);
    }
    if (data.creditLimit !== undefined && data.creditLimit < 0)
      throw new Error('El cupo de crédito no puede ser negativo');
    return this.customers.create(data);
  }

  async update(id: string, data: Partial<Customer>): Promise<Customer> {
    if (data.creditLimit !== undefined && data.creditLimit < 0)
      throw new Error('El cupo de crédito no puede ser negativo');
    return this.customers.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.customers.delete(id);
  }

  async addCreditBalance(id: string, amount: number): Promise<Customer> {
    if (amount === 0) throw new Error('El monto no puede ser cero');
    const customer = await this.getById(id);
    const newBalance = (customer.balance ?? 0) + amount;
    return this.customers.update(id, { balance: newBalance });
  }

  async search(term: string): Promise<Customer[]> {
    if (!term.trim()) return this.customers.findAll();
    return this.customers.search(term);
  }
}
