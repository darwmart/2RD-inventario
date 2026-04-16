import { describe, it, expect } from 'vitest';
import { WarehouseTransaction } from '@/types';

// ─── Lógica pura de getWarehouseStock (extraída para testear sin hooks) ──────

function calcStock(
  transactions: Pick<WarehouseTransaction, 'type' | 'items'>[],
): Record<string, number> {
  const stock: Record<string, { quantity: number }> = {};

  transactions.forEach(t => {
    t.items.forEach(item => {
      if (!stock[item.productId]) stock[item.productId] = { quantity: 0 };

      if (t.type === 'loan') {
        stock[item.productId].quantity += item.quantity;
      } else if (t.type === 'return') {
        stock[item.productId].quantity -= item.quantity;
      } else if (t.type === 'exchange') {
        if (item.direction === 'in') {
          // Artículo prestado que sale de bodega
          stock[item.productId].quantity -= item.quantity;
        }
        // direction 'out' = reemplazo de afuera → no afecta stock de bodega
      } else {
        stock[item.productId].quantity += item.quantity;
      }
    });
  });

  return Object.fromEntries(
    Object.entries(stock)
      .filter(([, v]) => v.quantity > 0)
      .map(([k, v]) => [k, v.quantity])
  );
}

// ─── Tests flujo de bodegas ───────────────────────────────────────────────────

describe('Stock de bodega externa — flujo completo', () => {

  it('Préstamo: el artículo aparece en bodega', () => {
    const txs = [{
      type: 'loan' as const,
      items: [{ productId: 'casco-1', productName: 'Casco', quantity: 2, direction: undefined }],
    }];
    const stock = calcStock(txs);
    expect(stock['casco-1']).toBe(2);
  });

  it('Devolución: el artículo desaparece de la bodega', () => {
    const txs = [
      { type: 'loan' as const, items: [{ productId: 'casco-1', productName: 'Casco', quantity: 2, direction: undefined }] },
      { type: 'return' as const, items: [{ productId: 'casco-1', productName: 'Casco', quantity: 2, direction: undefined }] },
    ];
    const stock = calcStock(txs);
    expect(stock['casco-1']).toBeUndefined();
  });

  it('Devolución parcial: queda el saldo restante en bodega', () => {
    const txs = [
      { type: 'loan' as const, items: [{ productId: 'casco-1', productName: 'Casco', quantity: 3, direction: undefined }] },
      { type: 'return' as const, items: [{ productId: 'casco-1', productName: 'Casco', quantity: 1, direction: undefined }] },
    ];
    const stock = calcStock(txs);
    expect(stock['casco-1']).toBe(2);
  });

  it('Cambio: el artículo prestado (in) desaparece de bodega', () => {
    const txs = [
      { type: 'loan' as const, items: [{ productId: 'casco-1', productName: 'Casco', quantity: 1, direction: undefined }] },
      {
        type: 'exchange' as const,
        items: [
          { productId: 'casco-1', productName: 'Casco', quantity: 1, direction: 'in' as const },     // sale de bodega
          { productId: 'guante-1', productName: 'Guante', quantity: 1, direction: 'out' as const },  // reemplazo de afuera
        ],
      },
    ];
    const stock = calcStock(txs);
    expect(stock['casco-1']).toBeUndefined(); // casco desaparece ✓
  });

  it('Cambio: el artículo de reemplazo (out) NO aparece en bodega', () => {
    const txs = [
      { type: 'loan' as const, items: [{ productId: 'casco-1', productName: 'Casco', quantity: 1, direction: undefined }] },
      {
        type: 'exchange' as const,
        items: [
          { productId: 'casco-1', productName: 'Casco', quantity: 1, direction: 'in' as const },
          { productId: 'guante-1', productName: 'Guante', quantity: 1, direction: 'out' as const },
        ],
      },
    ];
    const stock = calcStock(txs);
    expect(stock['guante-1']).toBeUndefined(); // guante NO aparece en bodega ✓
  });

  it('Cambio: la bodega queda vacía después del intercambio', () => {
    const txs = [
      { type: 'loan' as const, items: [{ productId: 'casco-1', productName: 'Casco', quantity: 1, direction: undefined }] },
      {
        type: 'exchange' as const,
        items: [
          { productId: 'casco-1', productName: 'Casco', quantity: 1, direction: 'in' as const },
          { productId: 'guante-1', productName: 'Guante', quantity: 1, direction: 'out' as const },
        ],
      },
    ];
    const stock = calcStock(txs);
    expect(Object.keys(stock)).toHaveLength(0); // bodega vacía ✓
  });

  it('Múltiples préstamos: se acumula stock correctamente', () => {
    const txs = [
      { type: 'loan' as const, items: [{ productId: 'casco-1', productName: 'Casco', quantity: 2, direction: undefined }] },
      { type: 'loan' as const, items: [{ productId: 'casco-1', productName: 'Casco', quantity: 3, direction: undefined }] },
    ];
    const stock = calcStock(txs);
    expect(stock['casco-1']).toBe(5);
  });

  it('Ajuste positivo: aumenta el stock de bodega', () => {
    const txs = [
      { type: 'loan' as const, items: [{ productId: 'casco-1', productName: 'Casco', quantity: 2, direction: undefined }] },
      { type: 'adjustment' as const, items: [{ productId: 'casco-1', productName: 'Casco', quantity: 1, direction: undefined }] },
    ];
    const stock = calcStock(txs);
    expect(stock['casco-1']).toBe(3);
  });
});
