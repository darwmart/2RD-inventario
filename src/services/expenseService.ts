import type { Expense } from '@/types/shared';
import type { IExpenseRepository } from '@/repositories/interfaces/IExpenseRepository';

export type CreateExpenseInput = {
  advisorId: string;
  advisorName: string;
  type: Expense['type'];
  amount: number;
  description: string;
};

export class ExpenseService {
  constructor(private readonly expenses: IExpenseRepository) {}

  async getAll(): Promise<Expense[]> {
    return this.expenses.findAll();
  }

  async add(data: CreateExpenseInput): Promise<Expense> {
    if (data.amount <= 0) throw new Error('El monto debe ser mayor a cero');
    if (!data.description?.trim()) throw new Error('La descripción es requerida');
    return this.expenses.create({
      advisorId: data.advisorId,
      advisor: data.advisorName,
      type: data.type,
      amount: data.amount,
      description: data.description,
      createdAt: new Date().toISOString(),
    });
  }

  async getByDate(dateKey: string): Promise<Expense[]> {
    return this.expenses.findByDate(dateKey);
  }

  async getByAdvisorId(advisorId: string): Promise<Expense[]> {
    return this.expenses.findByAdvisorId(advisorId);
  }

  async getByAdvisorName(name: string): Promise<Expense[]> {
    return this.expenses.findByAdvisorName(name);
  }
}
