import type { Expense } from '@/types/shared';
import type { IBaseRepository } from './IBaseRepository';

export type CreateExpenseInput = Omit<Expense, 'id'>;

export interface IExpenseRepository extends IBaseRepository<Expense, CreateExpenseInput> {
  findByDate(dateKey: string): Promise<Expense[]>;
  findByAdvisorId(advisorId: string): Promise<Expense[]>;
  findByAdvisorName(name: string): Promise<Expense[]>;
}
