import type { CardSettings, CompanyInfo, TaxSettings } from '@/types/settings';
import type { ISettingsRepository } from '../interfaces/ISettingsRepository';

const DEFAULTS = {
  cardSettings: {
    delayEnabled: false,
    debitCommission: 1.9,
    creditCommission: 2.9,
    reteiva: 0.4,
    commissionsEnabled: false,
    reteivaEnabled: false,
  } satisfies CardSettings,

  companyInfo: {
    name: '2Ruedas Shop',
    nit: '',
    address: '',
    phone: '',
    email: '',
  } satisfies CompanyInfo,

  taxSettings: {
    ivaEnabled: true,
    ivaPercentage: 19,
  } satisfies TaxSettings,
};

function readKey<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeKey<T>(key: string, value: T): void {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('ls-change', { detail: key }));
}

export class LocalStorageSettingsRepository implements ISettingsRepository {
  async getCardSettings(): Promise<CardSettings> {
    return readKey('cardSettings', DEFAULTS.cardSettings);
  }
  async saveCardSettings(settings: CardSettings): Promise<void> {
    writeKey('cardSettings', settings);
  }

  async getCompanyInfo(): Promise<CompanyInfo> {
    return readKey('companyInfo', DEFAULTS.companyInfo);
  }
  async saveCompanyInfo(info: CompanyInfo): Promise<void> {
    writeKey('companyInfo', info);
  }

  async getTaxSettings(): Promise<TaxSettings> {
    return readKey('taxSettings', DEFAULTS.taxSettings);
  }
  async saveTaxSettings(settings: TaxSettings): Promise<void> {
    writeKey('taxSettings', settings);
  }
}
