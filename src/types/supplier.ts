export type Supplier = {
  id: string;
  code?: string;
  accountingCode?: string;

  taxIdType: string;
  taxId: string;
  fiscalName: string;
  commercialName?: string;

  address: string;
  postalCode?: string;
  city?: string;
  province?: string;
  country?: string;

  phone: string;
  mobile?: string;
  fax?: string;
  contactPerson?: string;
  email: string;
  twitter?: string;
  facebook?: string;

  iban?: string;
  ccc?: string;
  bankName?: string;

  observations?: string;
  isProvider?: boolean;
  isCreditor?: boolean;

  createdAt: Date;
};
