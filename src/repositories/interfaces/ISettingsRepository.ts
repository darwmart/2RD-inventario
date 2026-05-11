import type { CardSettings, CompanyInfo, TaxSettings } from '@/types/settings';

// Repositorio de configuración escalar (valores únicos, no colecciones).
// Usa un patrón get/set en lugar de IBaseRepository<T> porque no son arrays.
export interface ISettingsRepository {
  getCardSettings(): Promise<CardSettings>;
  saveCardSettings(settings: CardSettings): Promise<void>;

  getCompanyInfo(): Promise<CompanyInfo>;
  saveCompanyInfo(info: CompanyInfo): Promise<void>;

  getTaxSettings(): Promise<TaxSettings>;
  saveTaxSettings(settings: TaxSettings): Promise<void>;
}
