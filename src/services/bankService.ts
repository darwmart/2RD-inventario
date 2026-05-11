import type { Bank } from '@/types/settings';
import type { IBankRepository } from '@/repositories/interfaces/IBankRepository';

export class BankService {
  constructor(private readonly banks: IBankRepository) {}

  async getAll(): Promise<Bank[]> {
    return this.banks.findAll();
  }

  async getActive(): Promise<Bank[]> {
    return this.banks.findActive();
  }

  async add(data: Omit<Bank, 'id'>): Promise<Bank> {
    if (!data.name?.trim()) throw new Error('El nombre del banco es requerido');
    return this.banks.create(data);
  }

  async update(id: string, data: Partial<Bank>): Promise<Bank> {
    return this.banks.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.banks.delete(id);
  }

  // Suma o resta al balance actual (delta positivo = ingreso, negativo = egreso)
  async applyDelta(id: string, delta: number): Promise<Bank> {
    return this.banks.updateBalance(id, delta);
  }

  // Setea el balance absoluto (útil para reconciliaciones)
  async setBalance(id: string, amount: number): Promise<Bank> {
    return this.banks.setBalance(id, amount);
  }
}
