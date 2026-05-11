import type { Expense } from '@/types/shared';
import type { IExpenseRepository, CreateExpenseInput } from '../interfaces/IExpenseRepository';
import { v4 as uuidv4 } from 'uuid';
import { LocalStorageRepository } from './base';

const toDateKey = (d: Date | string): string => {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export class LocalStorageExpenseRepository
  extends LocalStorageRepository<Expense>
  implements IExpenseRepository
{
  constructor() {
    // La clave 'expenses' es la misma que usaba useExpenses — compatibilidad total.
    // La clave redundante 'expensesMap' queda obsoleta y puede eliminarse en limpieza futura.
    super('expenses');
  }

  async create(data: CreateExpenseInput): Promise<Expense> {
    const expense: Expense = { ...data, id: uuidv4() };
    this.write([...this.read(), expense]);
    return expense;
  }

  async update(id: string, data: Partial<Expense>): Promise<Expense> {
    const updated = this.read().map(e => e.id === id ? { ...e, ...data } : e);
    this.write(updated);
    const result = updated.find(e => e.id === id);
    if (!result) throw new Error(`Gasto ${id} no encontrado`);
    return result;
  }

  async findByDate(dateKey: string): Promise<Expense[]> {
    return this.read().filter(e => toDateKey(e.createdAt) === dateKey);
  }

  async findByAdvisorId(advisorId: string): Promise<Expense[]> {
    return this.read().filter(e => e.advisorId === advisorId);
  }

  async findByAdvisorName(name: string): Promise<Expense[]> {
    return this.read().filter(e => e.advisor === name);
  }
}
