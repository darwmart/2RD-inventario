export type Customer = {
  id: string;
  name: string;
  document?: string;
  documentType?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  creditLimit?: number;
  balance?: number;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
};
