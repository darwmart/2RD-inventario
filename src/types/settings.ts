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
  createdAt: Date;
};
