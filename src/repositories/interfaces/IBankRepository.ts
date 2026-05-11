import type { Bank } from '@/types/settings';
import type { IBaseRepository } from './IBaseRepository';

export type CreateBankInput = Omit<Bank, 'id'>;

export interface IBankRepository extends IBaseRepository<Bank, CreateBankInput> {
  findActive(): Promise<Bank[]>;
  updateBalance(id: string, delta: number): Promise<Bank>;
  setBalance(id: string, amount: number): Promise<Bank>;
}
