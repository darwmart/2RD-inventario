import { useEffect, useMemo, useState } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { useSales } from '@/hooks/useSales';
import { useSettings } from '@/hooks/useSettings';
import { useReturns } from '@/hooks/useReturns';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Sale, SaleItem } from '@/types';
import { printPOSInvoice } from '@/utils/printUtils';
import { calculateCardCommission } from '@/utils/ivaUtils';
import SaleFormDialog, { SaleFormData } from '@/components/sales/SaleFormDialog';
import SalesTable, { DepositEntry } from '@/components/sales/SalesTable';
import SaleReturnDialog from '@/components/sales/SaleReturnDialog';

const toKey = (d: Date | string) => {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const PAYMENT_TO_BANK: { [key: string]: string | null } = {
  '1': 'efectivo', '2': 'colpatria', '3': 'colpatria',
  '4': 'bbva', '5': 'nequi', '6': 'daviplata', '7': 'bbva',
  '8': null, '9': null, '10': null,
};

export default function Sales() {
  const { isAdmin } = useAuth();
  const { products, findProductByBarcode, updateStock } = useInventory();
  const { sales, addSale, advisors, paymentMethods, updateSale, deleteSale } = useSales();
  const { companyInfo, taxSettings, cardSettings, updateBankBalance, banks } = useSettings();
  const { addReturn } = useReturns();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [returningSale, setReturningSale] = useState<Sale | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => toKey(new Date()));

  const depositsGroupedForDay = useMemo<DepositEntry[]>(() => {
    const map = new Map<string, DepositEntry>();
    sales.forEach(sale => {
      const saleDescription = (sale.items || []).map(i => i.productName).join(', ');
      const saleTotal = sale.total ?? 0;
      const totalPaidAllTime = (sale.deposits ?? []).reduce((sum, d) => sum + (d.amount ?? 0), 0) || sale.deposit || 0;

      (sale.deposits ?? []).forEach(dep => {
        if (toKey(dep.createdAt) !== selectedDate) return;
        const methodId = dep.method?.id ?? sale.paymentMethod?.id ?? 'unknown';
        const key = `${sale.id}::${methodId}`;
        const existing = map.get(key);
        if (existing) {
          existing.dayDepositSum += dep.amount ?? 0;
        } else {
          map.set(key, {
            key, saleId: sale.id, saleNumber: sale.saleNumber, advisorName: sale.advisorName,
            description: saleDescription, paymentMethodId: methodId,
            paymentMethodName: dep.method?.name ?? sale.paymentMethod?.name ?? '-',
            dayDepositSum: dep.amount ?? 0, totalPaidAllTime, saleTotal, initialDeposit: sale.deposit ?? 0,
          });
        }
      });

      if ((sale.deposits ?? []).length === 0 && (sale.deposit ?? 0) > 0 && toKey(sale.createdAt) === selectedDate) {
        const methodId = sale.paymentMethod?.id ?? 'unknown';
        const key = `${sale.id}::${methodId}`;
        const existing = map.get(key);
        if (existing) {
          existing.dayDepositSum += sale.deposit ?? 0;
        } else {
          map.set(key, {
            key, saleId: sale.id, saleNumber: sale.saleNumber, advisorName: sale.advisorName,
            description: saleDescription, paymentMethodId: methodId,
            paymentMethodName: sale.paymentMethod?.name ?? '-',
            dayDepositSum: sale.deposit ?? 0, totalPaidAllTime: sale.deposit ?? 0,
            saleTotal, initialDeposit: sale.deposit ?? 0,
          });
        }
      }
    });
    return Array.from(map.values());
  }, [sales, selectedDate]);

  useEffect(() => {
    depositsGroupedForDay.forEach(entry => {
      if ((entry.totalPaidAllTime ?? 0) >= (entry.saleTotal ?? 0)) {
        try { updateSale(entry.saleId, { status: 'completed' }); } catch { /* ignored */ }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositsGroupedForDay]);

  const salesOfDay = useMemo(
    () => sales.filter(s => toKey(s.createdAt) === selectedDate && s.type === 'sale'),
    [sales, selectedDate]
  );

  const dailyTotals = useMemo(() => {
    const salesTotal = salesOfDay.reduce((sum, sale) => sum + sale.items.reduce((s, i) => s + (i.total ?? 0), 0), 0);
    const costsTotal = salesOfDay.reduce((sum, sale) => sum + sale.items.reduce((s, i) => s + ((i.cost ?? 0) * (i.quantity ?? 0)), 0), 0);
    const depositsTotal = depositsGroupedForDay.reduce((sum, e) => sum + (e.dayDepositSum ?? 0), 0);
    const totalVentas = salesTotal + depositsTotal;
    return { totalVentas, totalCostos: costsTotal, utilidad: totalVentas - costsTotal };
  }, [salesOfDay, depositsGroupedForDay]);

  const handleSave = (data: SaleFormData) => {
    const { cart, advisorId, paymentMethodId, discount, customerName, customerDocument, customerPhone, totalIVA, total } = data;
    const paymentMethod = paymentMethods.find(pm => pm.id === paymentMethodId);
    if (!paymentMethod) { toast.error('Método de pago no válido'); return; }

    for (const item of cart) {
      const product = products.find(p => p.id === item.productId);
      if (!product || product.stock < item.quantity) { toast.error(`Stock insuficiente para ${item.productName}`); return; }
    }

    if (editingSale) {
      // Revertir stock anterior
      editingSale.items.forEach(item => {
        const p = products.find(p => p.id === item.productId);
        if (p) updateStock(item.productId, p.stock + item.quantity);
      });
      // Verificar y aplicar nuevo stock
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
        advisorId, advisorName: advisors.find(a => a.id === advisorId)?.name || '',
        items: cart, paymentMethod, discount, subtotal: data.subtotal, total, ivaTotal: totalIVA,
        customerName: customerName || undefined, customerDocument: customerDocument || undefined,
        customerPhone: customerPhone || undefined,
      });
      toast.success('Venta actualizada exitosamente');
      setEditingSale(null);
      setIsFormOpen(false);
      return;
    }

    // Nueva venta
    const { commission, commissionAmount, reteivaAmount } = calculateCardCommission(
      paymentMethod.name, paymentMethod.type, total, cardSettings
    );
    const sale = addSale({
      advisorId, items: cart, paymentMethod, discount, type: 'sale', ivaTotal: totalIVA,
      commission: commission || undefined, commissionAmount: commissionAmount || undefined,
      reteivaAmount: reteivaAmount || undefined,
      customerName: customerName || undefined, customerDocument: customerDocument || undefined,
      customerPhone: customerPhone || undefined,
    });

    cart.forEach(item => {
      const p = products.find(p => p.id === item.productId);
      if (p) updateStock(item.productId, p.stock - item.quantity);
    });

    const mappedBankId = PAYMENT_TO_BANK[paymentMethod.id];
    if (mappedBankId !== null && mappedBankId !== undefined) {
      const bankExists = banks.find(b => b.id === mappedBankId);
      if (bankExists) updateBankBalance(mappedBankId, total);
    }

    toast.success(`Venta ${sale.saleNumber} completada exitosamente`);
    printPOSInvoice(sale, companyInfo);
    setIsFormOpen(false);
  };

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setIsFormOpen(true);
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditingSale(null);
  };

  const handleDelete = (sale: Sale) => {
    if (!confirm(`¿Estás seguro de eliminar la venta ${sale.saleNumber}? Esta acción no se puede deshacer.`)) return;
    sale.items.forEach(item => {
      const p = products.find(p => p.id === item.productId);
      if (p) updateStock(item.productId, p.stock + item.quantity);
    });
    const mappedBankId = PAYMENT_TO_BANK[sale.paymentMethod.id];
    if (mappedBankId !== null && mappedBankId !== undefined) {
      const bankExists = banks.find(b => b.id === mappedBankId);
      if (bankExists) updateBankBalance(mappedBankId, -sale.total);
    }
    deleteSale(sale.id);
    toast.success('Venta eliminada exitosamente');
  };

  const handleConfirmReturn = (itemsToReturn: SaleItem[], reason: string, paymentMethodId: string) => {
    if (!returningSale) return;
    const returnPaymentMethod = paymentMethodId ? paymentMethods.find(pm => pm.id === paymentMethodId) : undefined;
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-4">Ventas Diarias</h1>
        </div>
        <div className="flex justify-between items-center mb-6">
          <div />
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-auto" />
          </div>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Venta
        </Button>
      </div>

      <SaleFormDialog
        open={isFormOpen}
        editingSale={editingSale}
        products={products}
        advisors={advisors}
        paymentMethods={paymentMethods}
        taxSettings={taxSettings}
        onSave={handleSave}
        onClose={handleClose}
      />

      <SalesTable
        deposits={depositsGroupedForDay}
        salesOfDay={salesOfDay}
        allSales={sales}
        selectedDate={selectedDate}
        companyInfo={companyInfo}
        isAdmin={isAdmin()}
        dailyTotals={dailyTotals}
        onEdit={handleEdit}
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
