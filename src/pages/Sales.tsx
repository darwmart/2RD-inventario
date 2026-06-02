import { useState } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import { useSalesData, useProducts, useAdvisors, usePaymentMethods } from '@/hooks/queries';
import { useCompanySettings } from '@/hooks/queries/useCompanySettings';
import { useBankSettings } from '@/hooks/queries/useBankSettings';
import { useReturnsData as useReturns } from '@/hooks/queries/useReturnsData';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyDeposits } from '@/hooks/useDailyDeposits';
import { toast } from 'sonner';
import { Sale, SaleItem } from '@/types';
import { usePrintPOS } from '@/hooks/usePrintPOS';
import { calculateCardCommission } from '@/utils/ivaUtils';
import SaleFormDialog, { SaleFormData } from '@/components/sales/SaleFormDialog';
import SalesTable from '@/components/sales/SalesTable';
import SaleReturnDialog from '@/components/sales/SaleReturnDialog';
import SalesPageHeader from '@/components/sales/SalesPageHeader';


const toKey = (d: Date | string) => {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function Sales() {
  const { isAdmin } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();

  // ─── Datos (nueva arquitectura) ──────────────────────────────────────────────
  const { products, updateStock } = useProducts();
  const { sales, addSaleAsync, updateSale, deleteSale } = useSalesData();
  const { advisors } = useAdvisors();
  const { paymentMethods } = usePaymentMethods();

  // ─── Configuración ───────────────────────────────────────────────────────────
  const { companyInfo, taxSettings, cardSettings } = useCompanySettings();
  const { banks, updateBankBalance } = useBankSettings();
  const { addReturn } = useReturns();
  const printPOS = usePrintPOS();

  // ─── Estado UI ───────────────────────────────────────────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [returningSale, setReturningSale] = useState<Sale | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => toKey(new Date()));

  const { depositsGroupedForDay, salesOfDay, dailyTotals } = useDailyDeposits(sales, selectedDate, updateSale);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleSave = async (data: SaleFormData) => {
    const { cart, advisorId, paymentMethodId, discount, customerName,
            customerDocument, customerPhone, totalIVA, total } = data;

    const paymentMethod = paymentMethods.find(pm => pm.id === paymentMethodId);
    if (!paymentMethod) { toast.error('Método de pago no válido'); return; }

    // Validación de stock (síncrona sobre datos ya cargados)
    for (const item of cart) {
      const product = products.find(p => p.id === item.productId);
      if (!product || product.stock < item.quantity) {
        toast.error(`Stock insuficiente para ${item.productName}`); return;
      }
    }

    if (editingSale) {
      // Calcular delta neto por producto (devolver viejo − descontar nuevo)
      // Una sola actualización por producto evita condiciones de carrera con el caché.
      const deltas = new Map<string, number>();
      editingSale.items.forEach(i => deltas.set(i.productId, (deltas.get(i.productId) ?? 0) + i.quantity));
      cart.forEach(i => deltas.set(i.productId, (deltas.get(i.productId) ?? 0) - i.quantity));

      // Validar stock suficiente considerando el delta
      for (const item of cart) {
        const p = products.find(p => p.id === item.productId);
        const delta = deltas.get(item.productId) ?? 0;
        const stockDisponible = (p?.stock ?? 0) + Math.max(0, delta);
        if (!p || stockDisponible < item.quantity) {
          toast.error(`Stock insuficiente para ${item.productName}`); return;
        }
      }

      // Aplicar deltas: una sola llamada por producto
      for (const [productId, delta] of deltas.entries()) {
        if (delta === 0) continue;
        const p = products.find(p => p.id === productId);
        if (p) updateStock(productId, Math.max(0, p.stock + delta));
      }

      const { commission, commissionAmount, reteivaAmount } = calculateCardCommission(
        paymentMethod.name, paymentMethod.type, total, cardSettings
      );
      updateSale(editingSale.id, {
        advisorId,
        advisorName: advisors.find(a => a.id === advisorId)?.name ?? '',
        items: cart, paymentMethod, discount,
        subtotal: data.subtotal, total, ivaTotal: totalIVA,
        commission, commissionAmount, reteivaAmount,
        customerName: customerName || undefined,
        customerDocument: customerDocument || undefined,
        customerPhone: customerPhone || undefined,
      });
      toast.success('Venta actualizada exitosamente');
      setEditingSale(null);
      setIsFormOpen(false);
      return;
    }

    // Nueva venta — el servicio maneja la reducción de stock internamente
    const { commission, commissionAmount, reteivaAmount } = calculateCardCommission(
      paymentMethod.name, paymentMethod.type, total, cardSettings
    );

    try {
      const today = toKey(new Date());
      const saleDate = selectedDate !== today ? new Date(`${selectedDate}T12:00:00`) : undefined;

      const sale = await addSaleAsync({
        advisorId,
        advisorName: advisors.find(a => a.id === advisorId)?.name ?? 'Desconocido',
        items: cart, paymentMethod, discount, type: 'sale', ivaTotal: totalIVA,
        commission: commission || undefined,
        commissionAmount: commissionAmount || undefined,
        reteivaAmount: reteivaAmount || undefined,
        customerName: customerName || undefined,
        customerDocument: customerDocument || undefined,
        customerPhone: customerPhone || undefined,
        createdAt: saleDate,
      });

      const mappedBankId = paymentMethod.type === 'cash' ? 'efectivo' : (paymentMethod.bankId ?? null);
      if (mappedBankId && banks.find(b => b.id === mappedBankId)) {
        updateBankBalance(mappedBankId, total);
      }

      toast.success(`Venta ${sale.saleNumber} completada exitosamente`);
      printPOS(sale, companyInfo);
      setIsFormOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar la venta');
    }
  };

  const handleDelete = async (sale: Sale) => {
    if (!await confirm({ description: `¿Estás seguro de eliminar la venta ${sale.saleNumber}? Esta acción no se puede deshacer.`, confirmLabel: 'Eliminar' })) return;
    // Restaura stock
    sale.items.forEach(item => {
      const p = products.find(p => p.id === item.productId);
      if (p) updateStock(item.productId, p.stock + item.quantity);
    });
    const mappedBankId = sale.paymentMethod.type === 'cash' ? 'efectivo' : (sale.paymentMethod.bankId ?? null);
    if (mappedBankId && banks.find(b => b.id === mappedBankId)) {
      updateBankBalance(mappedBankId, -sale.total);
    }
    deleteSale(sale.id);
    toast.success('Venta eliminada exitosamente');
  };

  const handleConfirmReturn = (itemsToReturn: SaleItem[], reason: string, paymentMethodId: string) => {
    if (!returningSale) return;
    const returnPaymentMethod = paymentMethodId
      ? paymentMethods.find(pm => pm.id === paymentMethodId)
      : undefined;
    addReturn({
      saleId: returningSale.id, saleNumber: returningSale.saleNumber,
      advisorId: returningSale.advisorId, advisorName: returningSale.advisorName,
      items: itemsToReturn, reason, paymentMethod: returnPaymentMethod,
    });
    itemsToReturn.forEach(item => {
      const p = products.find(p => p.id === item.productId);
      if (p) updateStock(item.productId, p.stock + item.quantity);
    });
    const allReturned = returningSale.items.every(item => {
      const returnedQty = itemsToReturn.find(i => i.productId === item.productId)?.quantity ?? 0;
      return returnedQty >= item.quantity;
    });
    if (allReturned) updateSale(returningSale.id, { status: 'returned' });
    toast.success('Devolución registrada exitosamente');
    setReturningSale(null);
  };

  return (
    <div className="p-6">
      <SalesPageHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onNewSale={() => setIsFormOpen(true)}
      />

      <SaleFormDialog
        open={isFormOpen}
        editingSale={editingSale}
        products={products}
        advisors={advisors}
        paymentMethods={paymentMethods}
        taxSettings={taxSettings}
        onSave={handleSave}
        onClose={() => { setIsFormOpen(false); setEditingSale(null); }}
      />

      <SalesTable
        deposits={depositsGroupedForDay}
        salesOfDay={salesOfDay}
        allSales={sales}
        selectedDate={selectedDate}
        companyInfo={companyInfo}
        isAdmin={isAdmin()}
        dailyTotals={dailyTotals}
        onEdit={sale => { setEditingSale(sale); setIsFormOpen(true); }}
        onDelete={handleDelete}
        onReturn={setReturningSale}
      />

      <SaleReturnDialog
        sale={returningSale}
        paymentMethods={paymentMethods}
        onClose={() => setReturningSale(null)}
        onConfirm={handleConfirmReturn}
      />
      {ConfirmDialog}
    </div>
  );
}
