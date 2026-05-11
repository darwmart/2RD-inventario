import { useState } from 'react';
import { useSalesData, useProducts, useAdvisors, usePaymentMethods } from '@/hooks/queries';
import { useSettings } from '@/hooks/useSettings';
import { useReturns } from '@/hooks/useReturns';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyDeposits } from '@/hooks/useDailyDeposits';
import { toast } from 'sonner';
import { Sale, SaleItem } from '@/types';
import { printPOSInvoice } from '@/utils/printUtils';
import { calculateCardCommission } from '@/utils/ivaUtils';
import SaleFormDialog, { SaleFormData } from '@/components/sales/SaleFormDialog';
import SalesTable from '@/components/sales/SalesTable';
import SaleReturnDialog from '@/components/sales/SaleReturnDialog';
import SalesPageHeader from '@/components/sales/SalesPageHeader';

// TODO: Migrar a salesService cuando se implemente mapeo dinámico bankId por método de pago.
// Este mapa usa IDs fijos de paymentMethods localStorage — será removido al migrar a Supabase.
const PAYMENT_TO_BANK: Record<string, string | null> = {
  '1': 'efectivo', '2': 'colpatria', '3': 'colpatria',
  '4': 'bbva',     '5': 'nequi',     '6': 'daviplata',
  '7': 'bbva',     '8': null,        '9': null, '10': null,
};

const toKey = (d: Date | string) => {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function Sales() {
  const { isAdmin } = useAuth();

  // ─── Datos (nueva arquitectura) ──────────────────────────────────────────────
  const { products, updateStock } = useProducts();
  const { sales, addSaleAsync, updateSale, deleteSale } = useSalesData();
  const { advisors } = useAdvisors();
  const { paymentMethods } = usePaymentMethods();

  // ─── Datos (hooks legacy no migrados aún) ────────────────────────────────────
  const { companyInfo, taxSettings, cardSettings, updateBankBalance, banks } = useSettings();
  const { addReturn } = useReturns();

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
      // Edición: revierte stock viejo, valida y aplica nuevo
      editingSale.items.forEach(item => {
        const p = products.find(p => p.id === item.productId);
        if (p) updateStock(item.productId, p.stock + item.quantity);
      });
      for (const item of cart) {
        const p = products.find(p => p.id === item.productId);
        if (!p || p.stock < item.quantity) {
          toast.error(`Stock insuficiente para ${item.productName}`);
          editingSale.items.forEach(old => {
            const prod = products.find(p => p.id === old.productId);
            if (prod) updateStock(old.productId, prod.stock - old.quantity);
          });
          return;
        }
      }
      cart.forEach(item => {
        const p = products.find(p => p.id === item.productId);
        if (p) updateStock(item.productId, p.stock - item.quantity);
      });
      updateSale(editingSale.id, {
        advisorId,
        advisorName: advisors.find(a => a.id === advisorId)?.name ?? '',
        items: cart, paymentMethod, discount,
        subtotal: data.subtotal, total, ivaTotal: totalIVA,
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
      });

      // Actualiza balance del banco destino (pendiente de mover a salesService)
      const mappedBankId = PAYMENT_TO_BANK[paymentMethod.id];
      if (mappedBankId) {
        const bankExists = banks.find(b => b.id === mappedBankId);
        if (bankExists) updateBankBalance(mappedBankId, total);
      }

      toast.success(`Venta ${sale.saleNumber} completada exitosamente`);
      printPOSInvoice(sale, companyInfo);
      setIsFormOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar la venta');
    }
  };

  const handleDelete = (sale: Sale) => {
    if (!confirm(`¿Estás seguro de eliminar la venta ${sale.saleNumber}? Esta acción no se puede deshacer.`)) return;
    // Restaura stock
    sale.items.forEach(item => {
      const p = products.find(p => p.id === item.productId);
      if (p) updateStock(item.productId, p.stock + item.quantity);
    });
    // Revierte balance de banco
    const mappedBankId = PAYMENT_TO_BANK[sale.paymentMethod.id];
    if (mappedBankId) {
      const bankExists = banks.find(b => b.id === mappedBankId);
      if (bankExists) updateBankBalance(mappedBankId, -sale.total);
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
    </div>
  );
}
