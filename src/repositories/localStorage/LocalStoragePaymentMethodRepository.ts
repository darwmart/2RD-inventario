import type { PaymentMethod } from '@/types/shared';
import type {
  IPaymentMethodRepository,
  CreatePaymentMethodInput,
} from '../interfaces/IPaymentMethodRepository';
import { createPaymentMethod } from '@/domain/sales';
import { LocalStorageRepository } from './base';

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { id: '1', name: 'Efectivo',       type: 'cash',       isActive: true },
  { id: '2', name: 'Tarjeta Débito', type: 'electronic', isActive: true },
  { id: '3', name: 'Tarjeta Crédito',type: 'electronic', isActive: true },
  { id: '4', name: 'Transferencia',  type: 'electronic', isActive: true },
  { id: '5', name: 'Nequi',          type: 'electronic', isActive: true },
  { id: '6', name: 'Daviplata',      type: 'electronic', isActive: true },
  { id: '7', name: 'Transfiya',      type: 'electronic', isActive: true },
  { id: '8', name: 'Sistecredito',   type: 'credit',     isActive: true },
  { id: '9', name: 'Addi',           type: 'credit',     isActive: true },
  { id: '10', name: 'Esmiopcion',    type: 'credit',     isActive: true },
];

export class LocalStoragePaymentMethodRepository
  extends LocalStorageRepository<PaymentMethod>
  implements IPaymentMethodRepository
{
  constructor() {
    super('paymentMethods');
  }

  protected read(): PaymentMethod[] {
    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) return DEFAULT_PAYMENT_METHODS;
    try { return JSON.parse(raw) as PaymentMethod[]; } catch { return DEFAULT_PAYMENT_METHODS; }
  }

  async create(data: CreatePaymentMethodInput): Promise<PaymentMethod> {
    const pm = createPaymentMethod(
      data.name, data.type, data.bankId, data.commission, data.paymentPeriod, data.paymentDays
    );
    this.write([...this.read(), pm]);
    return pm;
  }

  async update(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod> {
    const updated = this.read().map(m => m.id === id ? { ...m, ...data } : m);
    this.write(updated);
    const result = updated.find(m => m.id === id);
    if (!result) throw new Error(`Método de pago ${id} no encontrado`);
    return result;
  }

  async findActive(): Promise<PaymentMethod[]> {
    return this.read().filter(m => m.isActive);
  }

  async findByType(type: PaymentMethod['type']): Promise<PaymentMethod[]> {
    return this.read().filter(m => m.type === type);
  }
}
