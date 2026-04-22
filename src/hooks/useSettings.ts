import { useCallback } from 'react';
import { CardSettings, CompanyInfo, TaxSettings, Bank, Printer, LabelDesign } from '@/types';
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
  { id: 'caja-principal', name: 'Caja Fuerte', isActive: true, balance: 0 },
  { id: 'colpatria', name: 'Colpatria', isActive: true, balance: 0 },
  { id: 'bbva', name: 'BBVA', isActive: true, balance: 0 },
  { id: 'nequi', name: 'Nequi', isActive: true, balance: 0 },
  { id: 'daviplata', name: 'Daviplata', isActive: true, balance: 0 },
];

const defaultPrinters: Printer[] = [
  {
    id: 'send-to-onenote',
    name: 'Send To OneNote 2016',
    type: 'network',
    isActive: true,
    isDefault: true,
    paperSize: 'A4',
    createdAt: new Date()
  },
  {
    id: 'microsoft-pdf',
    name: 'Microsoft Print to PDF',
    type: 'network',
    isActive: true,
    isDefault: false,
    paperSize: 'A4',
    createdAt: new Date()
  }
];

const defaultLabelDesigns: LabelDesign[] = [
  {
    id: '1',
    code: '2',
    name: 'Copia de Cód. Barras',
    description: '',
    documentType: 'Etiquetas de artículos',
    printerName: 'Send To OneNote 2016',
    labelWidth: '75,00',
    labelHeight: '25,00',
    labelsPerRow: '3',
    labelsPerColumn: '9',
    topMargin: '12,00',
    leftMargin: '5,60',
    horizontalSpacing: '1,00',
    verticalSpacing: '2,00',
    createdAt: new Date()
  }
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

  const [printers, setPrinters] = useLocalStorage<Printer[]>(
    'printers',
    defaultPrinters
  );

  const [labelDesigns, setLabelDesigns] = useLocalStorage<LabelDesign[]>(
    'labelDesigns',
    defaultLabelDesigns
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

  const addPrinter = useCallback(
    (printer: Printer) => {
      setPrinters((prev) => [...prev, printer]);
    },
    [setPrinters]
  );

  const updatePrinter = useCallback(
    (printerId: string, updates: Partial<Printer>) => {
      setPrinters((prev) =>
        prev.map((printer) => (printer.id === printerId ? { ...printer, ...updates } : printer))
      );
    },
    [setPrinters]
  );

  const deletePrinter = useCallback(
    (printerId: string) => {
      setPrinters((prev) => prev.filter((printer) => printer.id !== printerId));
    },
    [setPrinters]
  );

  const setDefaultPrinter = useCallback(
    (printerId: string) => {
      setPrinters((prev) =>
        prev.map((printer) => ({
          ...printer,
          isDefault: printer.id === printerId
        }))
      );
    },
    [setPrinters]
  );

  const addLabelDesign = useCallback(
    (design: LabelDesign) => {
      setLabelDesigns((prev) => [...prev, design]);
    },
    [setLabelDesigns]
  );

  const updateLabelDesign = useCallback(
    (designId: string, updates: Partial<LabelDesign>) => {
      setLabelDesigns((prev) =>
        prev.map((design) => (design.id === designId ? { ...design, ...updates } : design))
      );
    },
    [setLabelDesigns]
  );

  const deleteLabelDesign = useCallback(
    (designId: string) => {
      setLabelDesigns((prev) => prev.filter((design) => design.id !== designId));
    },
    [setLabelDesigns]
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
    printers,
    addPrinter,
    updatePrinter,
    deletePrinter,
    setDefaultPrinter,
    labelDesigns,
    addLabelDesign,
    updateLabelDesign,
    deleteLabelDesign,
  };
}
