import type { Advisor } from '@/types/shared';
import type { IAdvisorRepository, CreateAdvisorInput } from '../interfaces/IAdvisorRepository';
import { createAdvisor } from '@/domain/sales';
import { LocalStorageRepository } from './base';

const DEFAULT_ADVISORS: Advisor[] = [
  { id: '1', name: 'Administrador', email: 'admin@tienda.com', phone: '', isActive: true, createdAt: new Date() },
];

export class LocalStorageAdvisorRepository
  extends LocalStorageRepository<Advisor>
  implements IAdvisorRepository
{
  constructor() {
    super('advisors');
  }

  protected read(): Advisor[] {
    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) return DEFAULT_ADVISORS;
    try { return JSON.parse(raw) as Advisor[]; } catch { return DEFAULT_ADVISORS; }
  }

  async create(data: CreateAdvisorInput): Promise<Advisor> {
    const advisor = createAdvisor(data);
    this.write([...this.read(), advisor]);
    return advisor;
  }

  async update(id: string, data: Partial<Advisor>): Promise<Advisor> {
    const updated = this.read().map(a => a.id === id ? { ...a, ...data } : a);
    this.write(updated);
    const result = updated.find(a => a.id === id);
    if (!result) throw new Error(`Asesor ${id} no encontrado`);
    return result;
  }

  async findActive(): Promise<Advisor[]> {
    return this.read().filter(a => a.isActive);
  }
}
