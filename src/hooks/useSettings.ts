import { useCallback } from 'react';
import { CardSettings, CompanyInfo, TaxSettings } from '@/types';
import { useLocalStorage } from './useLocalStorage';

const defaultCardSettings: CardSettings = {
  delayEnabled: false,
  debitCommission: 1.9, // 1.9% por defecto
  creditCommission: 2.9, // 2.9% por defecto
  reteiva: 0.4, // 0.4% por defecto
  commissionsEnabled: false,
  reteivaEnabled: false,
};

const defaultCompanyInfo: CompanyInfo = {
  name: 'Mi Tienda',
  nit: '000000000-0',
  address: 'Dirección de la tienda',
  phone: '(000) 000-0000',
  email: '',
};

const defaultTaxSettings: TaxSettings = {
  ivaEnabled: true,
  ivaPercentage: 19,
};

export function useSettings() {
  const [cardSettings, setCardSettings] = useLocalStorage<CardSettings>(
    'cardSettings',
    defaultCardSettings
  );

  const [companyInfo, setCompanyInfo] = useLocalStorage<CompanyInfo>(
    'companyInfo',
    defaultCompanyInfo
  );

  const [taxSettings, setTaxSettings] = useLocalStorage<TaxSettings>(
    'taxSettings',
    defaultTaxSettings
  );

  const updateCardSettings = useCallback(
    (updates: Partial<CardSettings>) => {
      setCardSettings((prev) => ({ ...prev, ...updates }));
    },
    [setCardSettings]
  );

  const updateCompanyInfo = useCallback(
    (updates: Partial<CompanyInfo>) => {
      setCompanyInfo((prev) => ({ ...prev, ...updates }));
    },
    [setCompanyInfo]
  );

  const updateTaxSettings = useCallback(
    (updates: Partial<TaxSettings>) => {
      setTaxSettings((prev) => ({ ...prev, ...updates }));
    },
    [setTaxSettings]
  );

  return {
    cardSettings,
    updateCardSettings,
    companyInfo,
    updateCompanyInfo,
    taxSettings,
    updateTaxSettings,
  };
}
