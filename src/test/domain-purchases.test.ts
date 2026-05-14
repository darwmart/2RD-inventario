import { describe, it, expect } from 'vitest';
import {
  generateDocumentNumber,
  buildDocument,
  applyPayment,
  convertDelivery,
  type CreateDocumentInput,
} from '@/domain/purchases';
import type { PurchaseDocument, PurchaseItem } from '@/types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const item1: PurchaseItem = {
  productId: 'p-1',
  productName: 'Casco MTB',
  quantity: 5,
  unitCost: 80000,
  total: 400000,
};

const item2: PurchaseItem = {
  productId: 'p-2',
  productName: 'Guante Pro',
  quantity: 10,
  unitCost: 20000,
  total: 200000,
};

const baseInput: CreateDocumentInput = {
  documentType: 'delivery',
  supplierId: 'sup-1',
  supplierName: 'Moto Distribuciones S.A.',
  items: [item1],
};

const pm = { id: 'efectivo', name: 'Efectivo', type: 'cash' as const, isActive: true };

// ─── generateDocumentNumber ───────────────────────────────────────────────────

const currentYear = new Date().getFullYear();

describe('generateDocumentNumber', () => {
  it('genera primer albarán del año con prefijo A y número 0001', () => {
    expect(generateDocumentNumber([], 'delivery')).toBe(`A-${currentYear}-0001`);
  });

  it('genera primera factura del año con prefijo F y número 0001', () => {
    expect(generateDocumentNumber([], 'invoice')).toBe(`F-${currentYear}-0001`);
  });

  it('incrementa el contador según los documentos del mismo tipo y año', () => {
    const existing = [
      buildDocument([], baseInput),
      buildDocument([], baseInput),
    ];
    expect(generateDocumentNumber(existing, 'delivery')).toBe(`A-${currentYear}-0003`);
  });

  it('los albaranes e facturas tienen contadores independientes', () => {
    const invoiceInput: CreateDocumentInput = { ...baseInput, documentType: 'invoice' };
    const existing = [
      buildDocument([], baseInput),            // albarán
      buildDocument([], invoiceInput),          // factura
    ];
    // Hay 1 albarán existente → próximo es 0002
    expect(generateDocumentNumber(existing, 'delivery')).toBe(`A-${currentYear}-0002`);
    // Hay 1 factura existente → próxima es 0002
    expect(generateDocumentNumber(existing, 'invoice')).toBe(`F-${currentYear}-0002`);
  });

  it('no cuenta documentos de años anteriores', () => {
    const oldDoc: PurchaseDocument = {
      ...buildDocument([], baseInput),
      createdAt: new Date('2024-01-15'),
    };
    expect(generateDocumentNumber([oldDoc], 'delivery')).toBe(`A-${currentYear}-0001`);
  });
});

// ─── buildDocument ────────────────────────────────────────────────────────────

describe('buildDocument', () => {
  it('calcula subtotal como suma de item.total', () => {
    const doc = buildDocument([], { ...baseInput, items: [item1, item2] });
    expect(doc.subtotal).toBe(600000); // 400000 + 200000
  });

  it('total = subtotal cuando no hay impuesto', () => {
    const doc = buildDocument([], baseInput);
    expect(doc.total).toBe(doc.subtotal);
  });

  it('total = subtotal + impuesto', () => {
    const doc = buildDocument([], { ...baseInput, tax: 76000 });
    expect(doc.total).toBe(doc.subtotal + 76000);
  });

  it('status inicial es "pending" por defecto', () => {
    expect(buildDocument([], baseInput).status).toBe('pending');
  });

  it('respeta status sobreescrito', () => {
    const doc = buildDocument([], { ...baseInput, status: 'completed' });
    expect(doc.status).toBe('completed');
  });

  it('usa documentNumber sobreescrito si se proporciona', () => {
    const doc = buildDocument([], { ...baseInput, documentNumber: 'F-CUSTOM-001' });
    expect(doc.documentNumber).toBe('F-CUSTOM-001');
  });

  it('genera documentNumber automático si no se proporciona', () => {
    const doc = buildDocument([], baseInput);
    expect(doc.documentNumber).toBeTruthy();
    expect(doc.documentNumber.startsWith('A-')).toBe(true);
  });

  it('genera id no vacío', () => {
    expect(buildDocument([], baseInput).id).toBeTruthy();
  });

  it('asigna createdAt como Date', () => {
    expect(buildDocument([], baseInput).createdAt).toBeInstanceOf(Date);
  });

  it('preserva supplierId y supplierName', () => {
    const doc = buildDocument([], baseInput);
    expect(doc.supplierId).toBe('sup-1');
    expect(doc.supplierName).toBe('Moto Distribuciones S.A.');
  });
});

// ─── applyPayment ─────────────────────────────────────────────────────────────

describe('applyPayment', () => {
  const invoice = buildDocument([], { ...baseInput, documentType: 'invoice' });

  it('cambia status a "completed"', () => {
    const paid = applyPayment(invoice, 'bank-1', 'Bancolombia', 400000);
    expect(paid.status).toBe('completed');
  });

  it('agrega el pago al arreglo payments', () => {
    const paid = applyPayment(invoice, 'bank-1', 'Bancolombia', 400000);
    expect(paid.payments).toHaveLength(1);
    expect(paid.payments![0].amount).toBe(400000);
    expect(paid.payments![0].bankId).toBe('bank-1');
  });

  it('guarda bankId y bankName en paymentDetails', () => {
    const paid = applyPayment(invoice, 'bank-1', 'Bancolombia', 400000);
    expect(paid.paymentDetails?.bankId).toBe('bank-1');
    expect(paid.paymentDetails?.bankName).toBe('Bancolombia');
  });

  it('registra paidAt en paymentDetails', () => {
    const paid = applyPayment(invoice, 'bank-1', 'Bancolombia', 400000);
    expect(paid.paymentDetails?.paidAt).toBeTruthy();
  });

  it('acumula pagos parciales en el arreglo', () => {
    const partial1 = applyPayment(invoice, 'bank-1', 'Bancolombia', 200000);
    const partial2 = applyPayment(partial1, 'bank-2', 'Davivienda', 200000);
    expect(partial2.payments).toHaveLength(2);
  });

  it('no modifica el documento original (inmutabilidad)', () => {
    applyPayment(invoice, 'bank-1', 'Bancolombia', 400000);
    expect(invoice.status).toBe('pending');
    expect(invoice.payments).toBeUndefined();
  });
});

// ─── convertDelivery ──────────────────────────────────────────────────────────

describe('convertDelivery', () => {
  const delivery = buildDocument([], baseInput);   // type=delivery, status=pending

  it('lanza error si el id no existe', () => {
    expect(() => convertDelivery([], 'id-inexistente', { paymentMethod: pm })).toThrow();
  });

  it('lanza error si el documento no es un albarán', () => {
    const invoice = buildDocument([], { ...baseInput, documentType: 'invoice' });
    expect(() => convertDelivery([invoice], invoice.id, { paymentMethod: pm })).toThrow();
  });

  it('crea una factura de tipo invoice', () => {
    const { invoice } = convertDelivery([delivery], delivery.id, { paymentMethod: pm });
    expect(invoice.documentType).toBe('invoice');
  });

  it('la factura tiene el mismo proveedor que el albarán', () => {
    const { invoice } = convertDelivery([delivery], delivery.id, { paymentMethod: pm });
    expect(invoice.supplierId).toBe(delivery.supplierId);
    expect(invoice.supplierName).toBe(delivery.supplierName);
  });

  it('la factura conserva los mismos items que el albarán', () => {
    const { invoice } = convertDelivery([delivery], delivery.id, { paymentMethod: pm });
    expect(invoice.items).toHaveLength(delivery.items.length);
    expect(invoice.items[0].productId).toBe(delivery.items[0].productId);
  });

  it('la factura conserva el mismo importe total', () => {
    const { invoice } = convertDelivery([delivery], delivery.id, { paymentMethod: pm });
    expect(invoice.total).toBe(delivery.total);
  });

  it('marca el albarán original como "invoiced" en la lista actualizada', () => {
    const { updatedList } = convertDelivery([delivery], delivery.id, { paymentMethod: pm });
    const updatedDelivery = updatedList.find(p => p.id === delivery.id);
    expect(updatedDelivery?.status).toBe('invoiced');
  });

  it('la lista actualizada contiene el albarán + la nueva factura', () => {
    const { updatedList } = convertDelivery([delivery], delivery.id, { paymentMethod: pm });
    expect(updatedList).toHaveLength(2);
  });

  it('referencia el albarán desde la factura (deliveryRef)', () => {
    const { invoice } = convertDelivery([delivery], delivery.id, { paymentMethod: pm });
    expect(invoice.deliveryRef).toBe(delivery.id);
  });
});
