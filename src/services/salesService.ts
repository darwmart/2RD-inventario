import type { Sale } from '@/types/sale';
import type { Advisor, PaymentMethod } from '@/types/shared';
import type { ISaleRepository } from '@/repositories/interfaces/ISaleRepository';
import type { IProductRepository } from '@/repositories/interfaces/IProductRepository';
import type { CreateSaleInput } from '@/domain/sales';
import { createAdvisor, createPaymentMethod } from '@/domain/sales';

export class SalesService {
  constructor(
    private readonly sales: ISaleRepository,
    private readonly products: IProductRepository,
  ) {}

  // ─── VENTAS ──────────────────────────────────────────────────────────────────

  async getAllSales(): Promise<Sale[]> {
    return this.sales.findAll();
  }

  async addSale(data: CreateSaleInput): Promise<Sale> {
    if (!data.items?.length) throw new Error('La venta debe tener al menos un artículo');
    if (!data.advisorId) throw new Error('La venta debe tener un asesor asignado');

    const sale = await this.sales.create(data);

    // Reduce stock para ventas completadas
    if (data.type === 'sale') {
      await Promise.all(
        data.items.map(item =>
          this.products.findById(item.productId).then(product => {
            if (!product) return;
            const newStock = Math.max(0, product.stock - item.quantity);
            return this.products.updateStock(product.id, newStock, product.reservedStock);
          })
        )
      );
    }

    // Reserva stock para separados
    if (data.type === 'reserved') {
      await Promise.all(
        data.items.map(item =>
          this.products.findById(item.productId).then(product => {
            if (!product) return;
            const reserved = (product.reservedStock ?? 0) + item.quantity;
            return this.products.updateStock(product.id, product.stock, reserved);
          })
        )
      );
    }

    return sale;
  }

  async updateSale(id: string, updates: Partial<Sale>): Promise<Sale> {
    return this.sales.update(id, updates);
  }

  async deleteSale(id: string): Promise<void> {
    return this.sales.delete(id);
  }

  async getSalesByDate(dateKey: string): Promise<Sale[]> {
    return this.sales.findByDate(dateKey);
  }

  async getSalesByAdvisor(advisorId: string): Promise<Sale[]> {
    return this.sales.findByAdvisor(advisorId);
  }

  async addDeposit(saleId: string, amount: number, method: PaymentMethod): Promise<Sale> {
    if (amount <= 0) throw new Error('El monto del abono debe ser mayor a cero');
    return this.sales.addDeposit(saleId, amount, method);
  }

  async convertToSale(saleId: string): Promise<Sale> {
    const sale = await this.sales.findById(saleId);
    if (!sale) throw new Error('Venta no encontrada');

    if (sale.type === 'reserved') {
      await Promise.all(
        sale.items.map(item =>
          this.products.findById(item.productId).then(product => {
            if (!product) return;
            const newStock = Math.max(0, product.stock - item.quantity);
            return this.products.updateStock(product.id, newStock, 0);
          })
        )
      );
    }

    return this.sales.update(saleId, { status: 'completed', type: 'sale' });
  }

  async cancelSale(saleId: string): Promise<Sale> {
    const sale = await this.sales.findById(saleId);
    if (!sale) throw new Error('Venta no encontrada');

    if (sale.type === 'reserved') {
      await Promise.all(
        sale.items.map(item =>
          this.products.findById(item.productId).then(product => {
            if (!product) return;
            const reserved = Math.max(0, (product.reservedStock ?? 0) - item.quantity);
            return this.products.updateStock(product.id, product.stock, reserved);
          })
        )
      );
    }

    return this.sales.update(saleId, { status: 'cancelled' });
  }

  // ─── HELPERS DE DOMINIO (sin persistencia) ───────────────────────────────────

  buildAdvisor(data: Omit<Advisor, 'id' | 'createdAt'>): Advisor {
    return createAdvisor(data);
  }

  buildPaymentMethod(
    name: string,
    type: PaymentMethod['type'],
    bankId?: string,
    commission?: number,
    paymentPeriod?: PaymentMethod['paymentPeriod'],
    paymentDays?: number,
  ): PaymentMethod {
    return createPaymentMethod(name, type, bankId, commission, paymentPeriod, paymentDays);
  }
}
