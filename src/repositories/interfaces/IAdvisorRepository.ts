import type { Advisor } from '@/types/shared';
import type { IBaseRepository } from './IBaseRepository';

export type CreateAdvisorInput = Omit<Advisor, 'id' | 'createdAt'>;

export interface IAdvisorRepository extends IBaseRepository<Advisor, CreateAdvisorInput> {
  findActive(): Promise<Advisor[]>;
}
