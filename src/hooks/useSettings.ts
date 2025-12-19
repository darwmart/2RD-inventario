import { useCallback } from 'react';
import { CardSettings, CompanyInfo, TaxSettings, Bank } from '@/types';
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

const defaultBanks: Bank[] = [
  { id: 'efectivo', name: 'Efectivo', isActive: true, balance: 0 },
  { id: 'colpatria', name: 'Colpatria', isActive: true, balance: 0 },
  { id: 'bbva', name: 'BBVA', isActive: true, balance: 0 },
  { id: 'nequi', name: 'Nequi', isActive: true, balance: 0 },
  { id: 'daviplata', name: 'Daviplata', isActive: true, balance: 0 },
];

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

  const [banks, setBanks] = useLocalStorage<Bank[]>(
    'banks',
    defaultBanks
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

  const addBank = useCallback(
    (bank: Bank) => {
      setBanks((prev) => [...prev, bank]);
    },
    [setBanks]
  );

  const updateBank = useCallback(
    (bankId: string, updates: Partial<Bank>) => {
      setBanks((prev) =>
        prev.map((bank) => (bank.id === bankId ? { ...bank, ...updates } : bank))
      );
    },
    [setBanks]
  );

  const deleteBank = useCallback(
    (bankId: string) => {
      setBanks((prev) => prev.filter((bank) => bank.id !== bankId));
    },
    [setBanks]
  );

  const updateBankBalance = useCallback(
    (bankId: string, amount: number) => {
      setBanks((prev) =>
        prev.map((bank) =>
          bank.id === bankId
            ? { ...bank, balance: (bank.balance || 0) + amount }
            : bank
        )
      );
    },
    [setBanks]
  );

  return {
    cardSettings,
    updateCardSettings,
    companyInfo,
    updateCompanyInfo,
    taxSettings,
    updateTaxSettings,
    banks,
    addBank,
    updateBank,
    deleteBank,
    updateBankBalance,
  };
}
