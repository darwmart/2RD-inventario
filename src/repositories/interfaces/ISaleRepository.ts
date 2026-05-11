import type { Sale } from '@/types/sale';
import type { PaymentMethod } from '@/types/shared';
import type { IBaseRepository } from './IBaseRepository';
import type { CreateSaleInput } from '@/domain/sales';

export interface ISaleRepository extends IBaseRepository<Sale, CreateSaleInput> {
  findByDate(dateKey: string): Promise<Sale[]>;
  findByAdvisor(advisorId: string): Promise<Sale[]>;
  findByCustomer(customerId: string): Promise<Sale[]>;
  findByStatus(status: Sale['status']): Promise<Sale[]>;
  findByType(type: Sale['type']): Promise<Sale[]>;
  addDeposit(saleId: string, amount: number, method: PaymentMethod): Promise<Sale>;
}
