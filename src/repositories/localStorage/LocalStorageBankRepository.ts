import type { Bank } from '@/types/settings';
import type { IBankRepository, CreateBankInput } from '../interfaces/IBankRepository';
import { v4 as uuidv4 } from 'uuid';
import { LocalStorageRepository } from './base';

const DEFAULT_BANKS: Bank[] = [
  { id: 'efectivo',    name: 'Efectivo',     isActive: true, balance: 0 },
  { id: 'caja-principal', name: 'Caja Fuerte', isActive: true, balance: 0 },
  { id: 'colpatria',  name: 'Colpatria',    isActive: true, balance: 0 },
  { id: 'bbva',       name: 'BBVA',         isActive: true, balance: 0 },
  { id: 'nequi',      name: 'Nequi',        isActive: true, balance: 0 },
  { id: 'daviplata',  name: 'Daviplata',    isActive: true, balance: 0 },
];

export class LocalStorageBankRepository
  extends LocalStorageRepository<Bank>
  implements IBankRepository
{
  constructor() {
    super('banks');
  }

  protected read(): Bank[] {
    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) return DEFAULT_BANKS;
    try { return JSON.parse(raw) as Bank[]; } catch { return DEFAULT_BANKS; }
  }

  async create(data: CreateBankInput): Promise<Bank> {
    const bank: Bank = { ...data, id: uuidv4() };
    this.write([...this.read(), bank]);
    return bank;
  }

  async update(id: string, data: Partial<Bank>): Promise<Bank> {
    const updated = this.read().map(b => b.id === id ? { ...b, ...data } : b);
    this.write(updated);
    const result = updated.find(b => b.id === id);
    if (!result) throw new Error(`Banco ${id} no encontrado`);
    return result;
  }

  async findActive(): Promise<Bank[]> {
    return this.read().filter(b => b.isActive);
  }

  async updateBalance(id: string, delta: number): Promise<Bank> {
    const banks = this.read();
    const bank = banks.find(b => b.id === id);
    if (!bank) throw new Error(`Banco ${id} no encontrado`);
    const newBalance = (bank.balance ?? 0) + delta;
    return this.update(id, { balance: newBalance });
  }

  async setBalance(id: string, amount: number): Promise<Bank> {
    return this.update(id, { balance: amount });
  }
}
