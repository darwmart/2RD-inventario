import { describe, it, expect } from 'vitest';
import {
  buildSale,
  createPaymentMethod,
  addDepositToSale,
  filterSalesByDate,
  type CreateSaleInput,
} from '@/domain/sales';
import type { SaleItem, Sale } from '@/types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const pm = createPaymentMethod('Efectivo', 'cash');

const item1: SaleItem = {
  productId: 'p-1',
  productName: 'Casco MTB',
  cost: 60000,
  quantity: 2,
  unitPrice: 120000,
  total: 240000,
};

const item2: SaleItem = {
  productId: 'p-2',
  productName: 'Guante Pro',
  cost: 15000,
  quantity: 1,
  unitPrice: 35000,
  total: 35000,
};

const baseSaleInput: CreateSaleInput = {
  advisorId: 'adv-1',
  advisorName: 'Pedro Gómez',
  items: [item1],
  paymentMethod: pm,
  type: 'sale',
};

// ─── buildSale ────────────────────────────────────────────────────────────────

describe('buildSale', () => {
  it('genera un id no vacío', () => {
    const sale = buildSale(baseSaleInput);
    expect(sale.id).toBeTruthy();
  });

  it('calcula subtotal como suma de items.total', () => {
    const sale = buildSale({ ...baseSaleInput, items: [item1, item2] });
    expect(sale.subtotal).toBe(275000); // 240000 + 35000
  });

  it('total = subtotal cuando no hay descuento', () => {
    const sale = buildSale(baseSaleInput);
    expect(sale.total).toBe(sale.subtotal);
  });

  it('total = subtotal − descuento', () => {
    const sale = buildSale({ ...baseSaleInput, discount: 20000 });
    expect(sale.total).toBe(sale.subtotal - 20000);
  });

  it('status es "completed" para type=sale', () => {
    expect(buildSale({ ...baseSaleInput, type: 'sale' }).status).toBe('completed');
  });

  it('status es "pending" para type=quote', () => {
    expect(buildSale({ ...baseSaleInput, type: 'quote' }).status).toBe('pending');
  });

  it('status es "pending" para type=reserved', () => {
    expect(buildSale({ ...baseSaleInput, type: 'reserved' }).status).toBe('pending');
  });

  it('crea depósito inicial para type=reserved con abono > 0', () => {
    const sale = buildSale({ ...baseSaleInput, type: 'reserved', deposit: 50000 });
    expect(sale.deposits).toHaveLength(1);
    expect(sale.deposits![0].amount).toBe(50000);
  });

  it('no crea depósitos para type=sale', () => {
    const sale = buildSale({ ...baseSaleInput, type: 'sale', deposit: 50000 });
    expect(sale.deposits).toBeUndefined();
  });

  it('preserva advisorId y advisorName', () => {
    const sale = buildSale(baseSaleInput);
    expect(sale.advisorId).toBe('adv-1');
    expect(sale.advisorName).toBe('Pedro Gómez');
  });

  it('asigna createdAt como Date', () => {
    expect(buildSale(baseSaleInput).createdAt).toBeInstanceOf(Date);
  });

  it('dos ventas tienen ids distintos', () => {
    const s1 = buildSale(baseSaleInput);
    const s2 = buildSale(baseSaleInput);
    expect(s1.id).not.toBe(s2.id);
  });
});

// ─── createPaymentMethod ──────────────────────────────────────────────────────

describe('createPaymentMethod', () => {
  it('crea método con nombre, tipo y isActive=true', () => {
    const pm = createPaymentMethod('Efectivo', 'cash');
    expect(pm.name).toBe('Efectivo');
    expect(pm.type).toBe('cash');
    expect(pm.isActive).toBe(true);
  });

  it('genera id no vacío', () => {
    expect(createPaymentMethod('Efectivo', 'cash').id).toBeTruthy();
  });

  it('incluye bankId si se proporciona', () => {
    const pm = createPaymentMethod('Bancolombia', 'electronic', 'bank-1');
    expect(pm.bankId).toBe('bank-1');
  });

  it('no incluye bankId si no se proporciona', () => {
    const pm = createPaymentMethod('Efectivo', 'cash');
    expect(pm.bankId).toBeUndefined();
  });

  it('incluye commission si se proporciona', () => {
    const pm = createPaymentMethod('Crédito', 'electronic', undefined, 2.5);
    expect(pm.commission).toBe(2.5);
  });

  it('dos métodos creados tienen ids distintos', () => {
    const pm1 = createPaymentMethod('A', 'cash');
    const pm2 = createPaymentMethod('B', 'cash');
    expect(pm1.id).not.toBe(pm2.id);
  });
});

// ─── addDepositToSale ─────────────────────────────────────────────────────────

describe('addDepositToSale', () => {
  const sale: Sale = buildSale({
    ...baseSaleInput,
    type: 'reserved',
    deposit: 50000,
  });

  it('incrementa el monto total de depósito', () => {
    const updated = addDepositToSale(sale, 30000, pm);
    expect(updated.deposit).toBe(80000); // 50000 + 30000
  });

  it('agrega un nuevo registro al arreglo deposits', () => {
    const updated = addDepositToSale(sale, 30000, pm);
    expect(updated.deposits!.length).toBe((sale.deposits?.length ?? 0) + 1);
  });

  it('el nuevo registro tiene el monto correcto', () => {
    const updated = addDepositToSale(sale, 30000, pm);
    const lastDeposit = updated.deposits![updated.deposits!.length - 1];
    expect(lastDeposit.amount).toBe(30000);
  });

  it('no modifica la venta original (inmutabilidad)', () => {
    const originalDeposit = sale.deposit;
    addDepositToSale(sale, 30000, pm);
    expect(sale.deposit).toBe(originalDeposit);
  });

  it('funciona cuando la venta no tiene depósitos previos', () => {
    const newSale: Sale = { ...buildSale(baseSaleInput), deposits: undefined, deposit: undefined };
    const updated = addDepositToSale(newSale, 10000, pm);
    expect(updated.deposit).toBe(10000);
    expect(updated.deposits).toHaveLength(1);
  });
});

// ─── filterSalesByDate ────────────────────────────────────────────────────────

describe('filterSalesByDate', () => {
  const makeSale = (dateStr: string): Sale =>
    ({ ...buildSale(baseSaleInput), createdAt: new Date(dateStr) });

  const sales: Sale[] = [
    makeSale('2026-05-13T10:00:00'),
    makeSale('2026-05-13T18:30:00'),
    makeSale('2026-05-14T09:00:00'),
    makeSale('2026-05-01T12:00:00'),
  ];

  it('filtra solo las ventas del día indicado', () => {
    expect(filterSalesByDate(sales, '2026-05-13')).toHaveLength(2);
  });

  it('retorna vacío si no hay ventas en esa fecha', () => {
    expect(filterSalesByDate(sales, '2026-04-01')).toHaveLength(0);
  });

  it('retorna una venta para una fecha con un solo registro', () => {
    expect(filterSalesByDate(sales, '2026-05-14')).toHaveLength(1);
  });

  it('retorna todas las ventas si todas son del mismo día', () => {
    const sameDaySales = [makeSale('2026-05-13T08:00:00'), makeSale('2026-05-13T20:00:00')];
    expect(filterSalesByDate(sameDaySales, '2026-05-13')).toHaveLength(2);
  });

  it('retorna vacío para arreglo vacío', () => {
    expect(filterSalesByDate([], '2026-05-13')).toHaveLength(0);
  });
});
