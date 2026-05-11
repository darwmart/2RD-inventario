export type RecordType = 'ingreso' | 'egreso' | 'compra' | 'credito' | 'traspaso';

export type AccountingRecord = {
  id: number;
  tipo: RecordType;
  descripcion: string;
  proveedor?: string;
  factura?: string;
  monto: number;
  banco: string;
  fecha: string;
};

export type CashRegisterSession = {
  id: string;
  date: string;
  openingAmount: number;
  openingTime: string;
  closingAmount?: number;
  closingTime?: string;
  status: 'open' | 'closed';
  difference?: number;
  notes?: string;
};
