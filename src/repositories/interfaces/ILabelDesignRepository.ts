import type { LabelDesign } from '@/types/settings';
import type { IBaseRepository } from './IBaseRepository';

export type CreateLabelDesignInput = Omit<LabelDesign, 'id' | 'createdAt'>;

export interface ILabelDesignRepository extends IBaseRepository<LabelDesign, CreateLabelDesignInput> {
  findByDocumentType(type: string): Promise<LabelDesign[]>;
}
