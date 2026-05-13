import { TaxSettings } from '@/types';

/**
 * Calcula el IVA de un ítem según la configuración global y el flag del producto.
 *
 * Regla:
 *  - Si IVA está deshabilitado globalmente → 0
 *  - Si el producto tiene IVA incluido (hasIva=true) → extrae el IVA del precio
 *  - Si el producto NO tiene IVA               → ivaAmount = 0 (precio sin IVA)
 *
 * Retorna el IVA en pesos (redondeado) y el flag hasIva para el SaleItem.
 */
export function calculateItemIVA(
  product: { hasIva: boolean },
  unitPrice: number,
  quantity: number,
  taxSettings: TaxSettings
): { hasIva: boolean; ivaAmount: number } {
  if (!taxSettings.ivaEnabled) return { hasIva: false, ivaAmount: 0 };

  if (product.hasIva) {
    const rate = taxSettings.ivaPercentage / 100;
    const priceWithoutIva = unitPrice / (1 + rate);
    const ivaPerUnit = unitPrice - priceWithoutIva;
    return { hasIva: true, ivaAmount: Math.round(ivaPerUnit * quantity) };
  }

  return { hasIva: false, ivaAmount: 0 };
}

/**
 * Devuelve el costo unitario con IVA incluido.
 * Cuando el producto tiene IVA y está habilitado, el costo real de adquisición
 * incluye el IVA pagado al proveedor → se usa para calcular rentabilidad correcta.
 */
export function costWithIva(
  cost: number,
  hasIva: boolean | undefined,
  taxSettings: TaxSettings
): number {
  if (hasIva && taxSettings.ivaEnabled) {
    return Math.round(cost * (1 + taxSettings.ivaPercentage / 100));
  }
  return cost;
}

/**
 * Calcula la comisión bancaria cuando el pago es con tarjeta.
 *
 * Detecta automáticamente si es débito o crédito por el nombre del método de pago.
 * Retorna { commission (%), commissionAmount, reteivaAmount }.
 */
export function calculateCardCommission(
  paymentMethodName: string,
  paymentMethodType: string,
  total: number,
  cardSettings: {
    commissionsEnabled: boolean;
    debitCommission: number;
    creditCommission: number;
    reteivaEnabled: boolean;
    reteiva: number;
  }
): { commission: number; commissionAmount: number; reteivaAmount: number } {
  const none = { commission: 0, commissionAmount: 0, reteivaAmount: 0 };

  if (!cardSettings.commissionsEnabled) return none;
  if (paymentMethodType !== 'electronic') return none;

  const name = paymentMethodName.toLowerCase();
  let commission = 0;

  if (name.includes('déb') || name.includes('deb')) {
    commission = cardSettings.debitCommission;
  } else if (name.includes('cré') || name.includes('cre')) {
    commission = cardSettings.creditCommission;
  }

  if (commission <= 0) return none;

  const commissionAmount = Math.round(total * commission / 100);
  const reteivaAmount = cardSettings.reteivaEnabled
    ? Math.round(commissionAmount * cardSettings.reteiva / 100)
    : 0;

  return { commission, commissionAmount, reteivaAmount };
}
