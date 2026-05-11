import type { Printer } from '@/types/settings';
import type { IBaseRepository } from './IBaseRepository';

export type CreatePrinterInput = Omit<Printer, 'id' | 'createdAt'>;

export interface IPrinterRepository extends IBaseRepository<Printer, CreatePrinterInput> {
  findDefault(): Promise<Printer | null>;
  setDefault(id: string): Promise<void>;
}
