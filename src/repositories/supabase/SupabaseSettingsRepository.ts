import { supabase } from '@/lib/supabase';
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

async function getKey<T>(key: string, fallback: T): Promise<T> {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? (data.value as T) : fallback;
}

async function setKey<T>(key: string, value: T): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw new Error(error.message);
}

export class SupabaseSettingsRepository implements ISettingsRepository {
  async getCardSettings(): Promise<CardSettings> {
    return getKey('cardSettings', DEFAULTS.cardSettings);
  }
  async saveCardSettings(settings: CardSettings): Promise<void> {
    return setKey('cardSettings', settings);
  }

  async getCompanyInfo(): Promise<CompanyInfo> {
    return getKey('companyInfo', DEFAULTS.companyInfo);
  }
  async saveCompanyInfo(info: CompanyInfo): Promise<void> {
    return setKey('companyInfo', info);
  }

  async getTaxSettings(): Promise<TaxSettings> {
    return getKey('taxSettings', DEFAULTS.taxSettings);
  }
  async saveTaxSettings(settings: TaxSettings): Promise<void> {
    return setKey('taxSettings', settings);
  }
}
