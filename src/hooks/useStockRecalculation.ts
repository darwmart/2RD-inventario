import { useState } from 'react';
import { purchasesService, inventoryService, repositories } from '@/infrastructure/container';

export function useStockRecalculation() {
  const [isRunning, setIsRunning] = useState(false);

  const recalculate = async (): Promise<{ applied: number; errors: number }> => {
    setIsRunning(true);
    let applied = 0;
    let errors = 0;

    try {
      const [purchases, sales] = await Promise.all([
        purchasesService.getAll(),
        repositories.sales.findAll(),
      ]);

      // Stock neto por producto: compras (+) y ventas completadas (-)
      const stockDeltas = new Map<string, number>();
      const reservedDeltas = new Map<string, number>();

      for (const doc of purchases) {
        if (doc.status === 'cancelled') continue;
        for (const item of doc.items) {
          stockDeltas.set(item.productId, (stockDeltas.get(item.productId) ?? 0) + item.quantity);
        }
      }

      for (const sale of sales) {
        if (sale.status === 'cancelled' || sale.status === 'returned') continue;
        for (const item of sale.items) {
          // Solo ventas completadas restan stock; quotes y pending no cuentan
          if (sale.type === 'sale' && sale.status === 'completed') {
            stockDeltas.set(item.productId, (stockDeltas.get(item.productId) ?? 0) - item.quantity);
          // Separados activos (pending) suman a reservedStock
          } else if (sale.type === 'reserved' && sale.status === 'pending') {
            reservedDeltas.set(item.productId, (reservedDeltas.get(item.productId) ?? 0) + item.quantity);
          }
        }
      }

      const allIds = new Set([...stockDeltas.keys(), ...reservedDeltas.keys()]);

      await Promise.all(
        Array.from(allIds).map(async (productId) => {
          const delta = stockDeltas.get(productId) ?? 0;
          const reservedDelta = reservedDeltas.get(productId) ?? 0;
          try {
            await inventoryService.updateStock(productId, delta, reservedDelta || undefined);
            applied++;
          } catch {
            errors++;
          }
        })
      );
    } finally {
      setIsRunning(false);
    }

    return { applied, errors };
  };

  return { recalculate, isRunning };
}
