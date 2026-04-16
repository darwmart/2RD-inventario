import { describe, it, expect } from 'vitest';
import { calculateItemIVA, calculateCardCommission } from '@/utils/ivaUtils';

const taxSettings = { ivaEnabled: true, ivaPercentage: 19 };
const cardSettings = {
  commissionsEnabled: true,
  debitCommission: 1.9,
  creditCommission: 2.9,
  reteivaEnabled: true,
  reteiva: 15,
};

// ─── Simulación del flujo completeSale ───────────────────────────────────────

function simulateSale(items: { unitPrice: number; quantity: number; hasIva: boolean }[], paymentMethodName: string, paymentMethodType: string, discount = 0) {
  const cartItems = items.map(item => {
    const { ivaAmount } = calculateItemIVA({ hasIva: item.hasIva }, item.unitPrice, item.quantity, taxSettings);
    return {
      total: item.unitPrice * item.quantity,
      ivaAmount,
    };
  });

  const subtotal = cartItems.reduce((s, i) => s + i.total, 0);
  const totalIVA = cartItems.reduce((s, i) => s + (i.ivaAmount || 0), 0);
  const total = subtotal - discount;

  const { commission, commissionAmount, reteivaAmount } = calculateCardCommission(
    paymentMethodName, paymentMethodType, total, cardSettings
  );

  return { subtotal, totalIVA, total, commission, commissionAmount, reteivaAmount };
}

// ─── Tests flujo de ventas ────────────────────────────────────────────────────

describe('Flujo de venta completo', () => {

  it('Venta en efectivo sin IVA — sin comisión bancaria', () => {
    const result = simulateSale(
      [{ unitPrice: 50000, quantity: 2, hasIva: false }],
      'Efectivo', 'cash'
    );
    expect(result.subtotal).toBe(100000);
    expect(result.totalIVA).toBe(0);
    expect(result.commissionAmount).toBe(0);
  });

  it('Venta con IVA incluido — IVA se extrae correctamente', () => {
    const result = simulateSale(
      [{ unitPrice: 119000, quantity: 1, hasIva: true }],
      'Efectivo', 'cash'
    );
    expect(result.totalIVA).toBe(19000);
    expect(result.subtotal).toBe(119000);
  });

  it('Venta con tarjeta débito — aplica comisión 1.9%', () => {
    const result = simulateSale(
      [{ unitPrice: 100000, quantity: 1, hasIva: false }],
      'Tarjeta Débito', 'electronic'
    );
    expect(result.commissionAmount).toBe(1900);
    expect(result.commission).toBe(1.9);
  });

  it('Venta con tarjeta crédito — aplica comisión 2.9%', () => {
    const result = simulateSale(
      [{ unitPrice: 100000, quantity: 1, hasIva: false }],
      'Tarjeta Crédito', 'electronic'
    );
    expect(result.commissionAmount).toBe(2900);
    expect(result.commission).toBe(2.9);
  });

  it('Descuento se resta del total antes de calcular comisión', () => {
    const result = simulateSale(
      [{ unitPrice: 100000, quantity: 1, hasIva: false }],
      'Tarjeta Débito', 'electronic',
      10000 // descuento
    );
    expect(result.total).toBe(90000);
    expect(result.commissionAmount).toBe(Math.round(90000 * 1.9 / 100));
  });

  it('Varios items — subtotal es la suma de todos', () => {
    const result = simulateSale([
      { unitPrice: 50000, quantity: 2, hasIva: false },
      { unitPrice: 30000, quantity: 1, hasIva: false },
    ], 'Efectivo', 'cash');
    expect(result.subtotal).toBe(130000);
  });

  it('Varios items con IVA — totalIVA suma todos los ítems', () => {
    const result = simulateSale([
      { unitPrice: 119000, quantity: 1, hasIva: true },
      { unitPrice: 59500, quantity: 2, hasIva: true },
    ], 'Efectivo', 'cash');
    const ivaItem1 = Math.round(119000 * 19 / 119);
    const ivaItem2 = Math.round(59500 * 19 / 119 * 2);
    expect(result.totalIVA).toBe(ivaItem1 + ivaItem2);
  });
});

// ─── Tests cálculo de totales de caja ─────────────────────────────────────────

describe('Cálculo de caja diaria', () => {

  it('Utilidad = ventas totales − costos', () => {
    const sales = [
      { total: 100000, cost: 60000, qty: 1 },
      { total: 50000, cost: 30000, qty: 2 },
    ];
    const totalVentas = sales.reduce((s, sale) => s + sale.total, 0);
    const totalCostos = sales.reduce((s, sale) => s + sale.cost * sale.qty, 0);
    const utilidad = totalVentas - totalCostos;

    expect(totalVentas).toBe(150000);
    expect(totalCostos).toBe(120000);
    expect(utilidad).toBe(30000);
  });
});
