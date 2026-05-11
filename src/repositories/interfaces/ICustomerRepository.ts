import type { Customer } from '@/types/customer';
import type { IBaseRepository } from './IBaseRepository';

export type CreateCustomerInput = Omit<Customer, 'id' | 'createdAt'>;

export interface ICustomerRepository extends IBaseRepository<Customer, CreateCustomerInput> {
  findByDocument(document: string): Promise<Customer | null>;
  search(term: string): Promise<Customer[]>;
}
