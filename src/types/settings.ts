export type CardSettings = {
  delayEnabled: boolean;
  debitCommission: number;
  creditCommission: number;
  reteiva: number;
  commissionsEnabled: boolean;
  reteivaEnabled: boolean;
};

export type CompanyInfo = {
  name: string;
  nit: string;
  address: string;
  phone: string;
  email?: string;
};

export type TaxSettings = {
  ivaEnabled: boolean;
  ivaPercentage: number;
};

export type Bank = {
  id: string;
  name: string;
  icon?: string;
  isActive: boolean;
  balance?: number;
};

export type Printer = {
  id: string;
  name: string;
  type: 'thermal' | 'laser' | 'inkjet' | 'network';
  isActive: boolean;
  isDefault: boolean;
  paperSize?: string;
  createdAt: Date;
};

export type LabelField = {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right';
  visible: boolean;
};

export type TitillaConfig = {
  paperWidth: 58 | 80;
  titleText: string;
  showAddress: boolean;
  showPhone: boolean;
  showNit: boolean;
  showAdvisor: boolean;
  showCustomer: boolean;
  showDiscount: boolean;
  showIva: boolean;
  showPaymentMethod: boolean;
  footerText: string;
  printerName?: string;
};

export const DEFAULT_TITILLA_CONFIG: TitillaConfig = {
  paperWidth: 80,
  titleText: 'FACTURA DE VENTA',
  showAddress: true,
  showPhone: true,
  showNit: true,
  showAdvisor: true,
  showCustomer: true,
  showDiscount: true,
  showIva: false,
  showPaymentMethod: true,
  footerText: '¡Gracias por su compra!',
  printerName: 'Generic / Text Only',
};

export function parseTitillaConfig(description: string): TitillaConfig {
  try { return { ...DEFAULT_TITILLA_CONFIG, ...JSON.parse(description) }; }
  catch { return { ...DEFAULT_TITILLA_CONFIG }; }
}

export type LabelDesign = {
  id: string;
  code: string;
  name: string;
  description?: string;
  documentType: string;
  printerName: string;
  labelWidth: string;
  labelHeight: string;
  labelsPerRow: string;
  labelsPerColumn: string;
  topMargin: string;
  leftMargin: string;
  horizontalSpacing: string;
  verticalSpacing: string;
  fields?: LabelField[];
  isDefault?: boolean;
  createdAt: Date;
};
