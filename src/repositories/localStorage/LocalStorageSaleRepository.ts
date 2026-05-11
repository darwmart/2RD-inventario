import type { Sale } from '@/types/sale';
import type { PaymentMethod } from '@/types/shared';
import type { ISaleRepository } from '../interfaces/ISaleRepository';
import type { CreateSaleInput } from '@/domain/sales';
import { buildSale, addDepositToSale, filterSalesByDate } from '@/domain/sales';
import { LocalStorageRepository } from './base';

export class LocalStorageSaleRepository
  extends LocalStorageRepository<Sale>
  implements ISaleRepository
{
  constructor() {
    super('sales');
  }

  async create(data: CreateSaleInput): Promise<Sale> {
    const sales = this.read();
    const sale = buildSale(data);
    this.write([...sales, sale]);
    return sale;
  }

  async update(id: string, data: Partial<Sale>): Promise<Sale> {
    const updated = this.read().map(s =>
      s.id === id ? { ...s, ...data } : s
    );
    this.write(updated);
    const result = updated.find(s => s.id === id);
    if (!result) throw new Error(`Venta ${id} no encontrada`);
    return result;
  }

  async findByDate(dateKey: string): Promise<Sale[]> {
    return filterSalesByDate(this.read(), dateKey);
  }

  async findByAdvisor(advisorId: string): Promise<Sale[]> {
    return this.read().filter(s => s.advisorId === advisorId);
  }

  async findByCustomer(customerId: string): Promise<Sale[]> {
    return this.read().filter(s => s.customerId === customerId);
  }

  async findByStatus(status: Sale['status']): Promise<Sale[]> {
    return this.read().filter(s => s.status === status);
  }

  async findByType(type: Sale['type']): Promise<Sale[]> {
    return this.read().filter(s => s.type === type);
  }

  async addDeposit(saleId: string, amount: number, method: PaymentMethod): Promise<Sale> {
    const sales = this.read();
    const sale = sales.find(s => s.id === saleId);
    if (!sale) throw new Error(`Venta ${saleId} no encontrada`);
    const updated = addDepositToSale(sale, amount, method);
    this.write(sales.map(s => (s.id === saleId ? updated : s)));
    return updated;
  }
}
