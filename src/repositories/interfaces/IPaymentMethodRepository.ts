import type { PaymentMethod } from '@/types/shared';
import type { IBaseRepository } from './IBaseRepository';

export type CreatePaymentMethodInput = Omit<PaymentMethod, 'id'>;

export interface IPaymentMethodRepository
  extends IBaseRepository<PaymentMethod, CreatePaymentMethodInput> {
  findActive(): Promise<PaymentMethod[]>;
  findByType(type: PaymentMethod['type']): Promise<PaymentMethod[]>;
}
