import type { CardSettings, CompanyInfo, TaxSettings } from '@/types/settings';
import type { ISettingsRepository } from '@/repositories/interfaces/ISettingsRepository';

export class SettingsService {
  constructor(private readonly repo: ISettingsRepository) {}

  // ─── Card Settings ────────────────────────────────────────────────────────
  async getCardSettings(): Promise<CardSettings> {
    return this.repo.getCardSettings();
  }

  async updateCardSettings(updates: Partial<CardSettings>): Promise<void> {
    const current = await this.repo.getCardSettings();
    await this.repo.saveCardSettings({ ...current, ...updates });
  }

  // ─── Company Info ─────────────────────────────────────────────────────────
  async getCompanyInfo(): Promise<CompanyInfo> {
    return this.repo.getCompanyInfo();
  }

  async updateCompanyInfo(updates: Partial<CompanyInfo>): Promise<void> {
    const current = await this.repo.getCompanyInfo();
    await this.repo.saveCompanyInfo({ ...current, ...updates });
  }

  // ─── Tax Settings ─────────────────────────────────────────────────────────
  async getTaxSettings(): Promise<TaxSettings> {
    return this.repo.getTaxSettings();
  }

  async updateTaxSettings(updates: Partial<TaxSettings>): Promise<void> {
    const current = await this.repo.getTaxSettings();
    await this.repo.saveTaxSettings({ ...current, ...updates });
  }
}
