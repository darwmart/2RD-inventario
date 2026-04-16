import { describe, it, expect } from 'vitest';
import { calculateItemIVA, calculateCardCommission } from '@/utils/ivaUtils';

const taxEnabled = { ivaEnabled: true, ivaPercentage: 19 };
const taxDisabled = { ivaEnabled: false, ivaPercentage: 19 };

// ─── calculateItemIVA ────────────────────────────────────────────────────────

describe('calculateItemIVA', () => {
  it('retorna 0 si IVA está deshabilitado globalmente', () => {
    const result = calculateItemIVA({ hasIva: true }, 119000, 1, taxDisabled);
    expect(result.hasIva).toBe(false);
    expect(result.ivaAmount).toBe(0);
  });

  it('extrae IVA correctamente de precio que ya lo incluye (19%)', () => {
    // Precio con IVA: $119.000 → IVA = $19.000
    const result = calculateItemIVA({ hasIva: true }, 119000, 1, taxEnabled);
    expect(result.hasIva).toBe(true);
    expect(result.ivaAmount).toBe(19000);
  });

  it('multiplica el IVA por la cantidad de unidades', () => {
    // $119.000 × 3 unidades → IVA = $57.000
    const result = calculateItemIVA({ hasIva: true }, 119000, 3, taxEnabled);
    expect(result.hasIva).toBe(true);
    expect(result.ivaAmount).toBe(57000);
  });

  it('retorna 0 si el producto no tiene IVA (hasIva=false)', () => {
    const result = calculateItemIVA({ hasIva: false }, 50000, 2, taxEnabled);
    expect(result.hasIva).toBe(false);
    expect(result.ivaAmount).toBe(0);
  });

  it('redondea el IVA al peso más cercano', () => {
    // Precio con IVA: $10.000 → IVA = $10.000 * 19/119 ≈ $1.596.638...
    const result = calculateItemIVA({ hasIva: true }, 10000, 1, taxEnabled);
    expect(result.ivaAmount).toBe(Math.round(10000 * 19 / 119));
  });
});

// ─── calculateCardCommission ─────────────────────────────────────────────────

const cardSettings = {
  commissionsEnabled: true,
  debitCommission: 1.9,
  creditCommission: 2.9,
  reteivaEnabled: true,
  reteiva: 15,
};

describe('calculateCardCommission', () => {
  it('retorna 0 si las comisiones están deshabilitadas', () => {
    const result = calculateCardCommission('Tarjeta Débito', 'electronic', 100000, {
      ...cardSettings,
      commissionsEnabled: false,
    });
    expect(result.commission).toBe(0);
    expect(result.commissionAmount).toBe(0);
  });

  it('retorna 0 para método de pago en efectivo', () => {
    const result = calculateCardCommission('Efectivo', 'cash', 100000, cardSettings);
    expect(result.commissionAmount).toBe(0);
  });

  it('aplica comisión de débito correctamente (1.9%)', () => {
    const result = calculateCardCommission('Tarjeta Débito', 'electronic', 100000, cardSettings);
    expect(result.commission).toBe(1.9);
    expect(result.commissionAmount).toBe(1900);
  });

  it('aplica comisión de crédito correctamente (2.9%)', () => {
    const result = calculateCardCommission('Tarjeta Crédito', 'electronic', 100000, cardSettings);
    expect(result.commission).toBe(2.9);
    expect(result.commissionAmount).toBe(2900);
  });

  it('calcula reteiva sobre la comisión (15% de la comisión)', () => {
    // Comisión débito: $1.900 → Reteiva 15% = $285
    const result = calculateCardCommission('Tarjeta Débito', 'electronic', 100000, cardSettings);
    expect(result.reteivaAmount).toBe(285);
  });

  it('retorna 0 de reteiva si está deshabilitada', () => {
    const result = calculateCardCommission('Tarjeta Débito', 'electronic', 100000, {
      ...cardSettings,
      reteivaEnabled: false,
    });
    expect(result.reteivaAmount).toBe(0);
  });

  it('retorna 0 si el tipo electrónico no es débito ni crédito (ej: Nequi)', () => {
    const result = calculateCardCommission('Nequi', 'electronic', 100000, cardSettings);
    expect(result.commissionAmount).toBe(0);
  });
});
