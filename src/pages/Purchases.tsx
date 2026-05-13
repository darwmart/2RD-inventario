import { useState } from 'react';
import { useProducts, useCategories, useSuppliers } from '@/hooks/queries/useProducts';
import { usePurchasesData } from '@/hooks/queries/usePurchasesData';
import { useBankSettings } from '@/hooks/queries/useBankSettings';
import { useCompanySettings } from '@/hooks/queries/useCompanySettings';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { AccountingRecord, Purchase } from '@/types';
import PurchaseFormDialog, { PurchaseFormData } from '@/components/purchases/PurchaseFormDialog';
import PurchaseList from '@/components/purchases/PurchaseList';
import PayCreditDialog from '@/components/purchases/PayCreditDialog';
import PurchasesHeader from '@/components/purchases/PurchasesHeader';

const toDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function Purchases() {
  const { products, updateStock, addProductAsync } = useProducts();
  const { categories, addCategory } = useCategories();
  const { suppliers, addSupplier } = useSuppliers();
  const { purchases, createDocumentAsync, updateDocument, deleteDocument } = usePurchasesData();
  const { banks, updateBankBalance } = useBankSettings();
  const { taxSettings } = useCompanySettings();
  const [accountingRecords, setAccountingRecords] = useLocalStorage<AccountingRecord[]>('accountingRecords', []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [payingPurchase, setPayingPurchase] = useState<Purchase | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => toDateKey());

  const handleSave = async (data: PurchaseFormData) => {
    const { cart, supplierId, supplierName, selectedMethod, invoiceNumber, notes, dueDate, tax, total } = data;

    let paymentDetails: Record<string, unknown> = {};
    let isCredit = false;

    if (selectedMethod.type === 'credit') {
      paymentDetails.dueDate = dueDate;
      isCredit = true;
    } else if (selectedMethod.type === 'transfer') {
      const bank = banks.find(b => b.id === selectedMethod.bankId);
      paymentDetails.bankId = selectedMethod.bankId;
      paymentDetails.bankName = bank?.name || '';
    } else {
      paymentDetails.isCashPayment = true;
      paymentDetails.bankId = 'efectivo';
    }

    const paymentMethod = { id: selectedMethod.id, name: selectedMethod.name, type: 'electronic' as const, isActive: true };
    const subtotal = cart.reduce((s, i) => s + i.total, 0);

    if (editingPurchase) {
      // Revertir stock anterior
      editingPurchase.items.forEach(old => {
        const p = products.find(p => p.id === old.productId);
        if (p) updateStock(old.productId, p.stock - old.quantity, p.reservedStock ?? 0);
      });
      // Aplicar stock nuevo
      cart.forEach(item => {
        const p = products.find(p => p.id === item.productId);
        if (p) updateStock(item.productId, p.stock + item.quantity, p.reservedStock ?? 0);
      });
      // Revertir banco anterior
      const oldWasCredit = editingPurchase.paymentMethod?.id === 'credito';
      if (!oldWasCredit && editingPurchase.paymentDetails?.bankId)
        updateBankBalance(editingPurchase.paymentDetails.bankId as string, editingPurchase.total);
      else if (!oldWasCredit && editingPurchase.paymentDetails?.isCashPayment)
        updateBankBalance('efectivo', editingPurchase.total);
      // Aplicar banco nuevo
      if (!isCredit) updateBankBalance((selectedMethod.bankId || 'efectivo') as string, -total);

      updateDocument(editingPurchase.id, {
        documentNumber: invoiceNumber,
        supplierId,
        supplierName,
        items: cart,
        subtotal,
        tax,
        total: subtotal + (tax || 0),
        paymentMethod,
        paymentDetails: paymentDetails as Purchase['paymentDetails'],
        notes,
      });
      toast.success(`Compra ${invoiceNumber} actualizada exitosamente`);
      setEditingPurchase(null);
      setIsFormOpen(false);
      return;
    }

    // Compra nueva
    const purchase = await createDocumentAsync({
      documentType: 'invoice',
      documentNumber: invoiceNumber,
      status: isCredit ? 'pending' : 'completed',
      supplierId,
      supplierName,
      items: cart,
      tax,
      notes,
      paymentMethod,
      paymentDetails: paymentDetails as Purchase['paymentDetails'],
    });

    if (!isCredit) {
      const bankId = (selectedMethod.bankId || 'efectivo') as string;
      setAccountingRecords(prev => [...prev, {
        id: Date.now(), tipo: 'compra',
        descripcion: `Compra ${invoiceNumber} - ${supplierName}`,
        proveedor: supplierName, factura: invoiceNumber,
        monto: total, banco: bankId, fecha: new Date().toISOString(),
      }]);
      updateBankBalance(bankId, -total);
    }

    toast.success(`Compra ${purchase.documentNumber} registrada exitosamente`);
    setIsFormOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta compra?')) return;
    const purchase = purchases.find(p => p.id === id);
    if (!purchase) return;
    purchase.items.forEach(item => {
      const p = products.find(p => p.id === item.productId);
      if (p) updateStock(item.productId, p.stock - item.quantity, p.reservedStock ?? 0);
    });
    const wasCredit = purchase.paymentMethod?.id === 'credito';
    if (!wasCredit) {
      const bankId = (purchase.paymentDetails?.bankId as string) || 'efectivo';
      updateBankBalance(bankId, purchase.total);
    }
    deleteDocument(id);
    toast.success('Compra eliminada exitosamente');
  };

  const handleConfirmPayment = (bankId: string) => {
    if (!payingPurchase) return;
    const bank = banks.find(b => b.id === bankId);
    updateBankBalance(bankId, -payingPurchase.total);
    const supplierLabel = (payingPurchase.supplierName || '').trim() || 'Sin proveedor';
    setAccountingRecords(prev => [...prev, {
      id: Date.now(), tipo: 'compra',
      descripcion: `Pago crédito ${payingPurchase.documentNumber} - ${supplierLabel}`,
      proveedor: supplierLabel, factura: payingPurchase.documentNumber,
      monto: payingPurchase.total, banco: bankId, fecha: new Date().toISOString(),
    }]);
    updateDocument(payingPurchase.id, {
      paymentMethod: payingPurchase.paymentMethod ?? { id: 'credito', name: 'Crédito', type: 'credit' as const, isActive: true },
      paymentDetails: { bankId, bankName: bank?.name || '', paidAt: new Date().toISOString() },
      status: 'completed',
    });
    toast.success(`Pago de $${payingPurchase.total.toLocaleString('es-CO')} registrado desde ${bank?.name || bankId}`);
    setPayingPurchase(null);
  };

  return (
    <ScrollArea className="h-screen p-6">
      <PurchasesHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onNewPurchase={() => setIsFormOpen(true)}
      />

      <PurchaseFormDialog
        open={isFormOpen || !!editingPurchase}
        editingPurchase={editingPurchase}
        suppliers={suppliers}
        products={products}
        categories={categories}
        banks={banks}
        taxSettings={taxSettings}
        purchases={purchases}
        onSave={handleSave}
        onClose={() => { setIsFormOpen(false); setEditingPurchase(null); }}
        addProduct={addProductAsync}
        onAddCategory={(name, description = '') => { addCategory(name, description); toast.success('Categoría creada exitosamente'); }}
        onAddSupplier={data => { addSupplier(data); toast.success('Proveedor creado exitosamente'); }}
      />

      <PurchaseList
        purchases={purchases}
        suppliers={suppliers}
        selectedDate={selectedDate}
        onEdit={purchase => { setEditingPurchase(purchase); setIsFormOpen(true); }}
        onDelete={handleDelete}
        onPayCredit={setPayingPurchase}
      />

      <PayCreditDialog
        purchase={payingPurchase}
        banks={banks}
        onClose={() => setPayingPurchase(null)}
        onConfirm={handleConfirmPayment}
      />
    </ScrollArea>
  );
}
