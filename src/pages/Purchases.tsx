import { useState } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { usePurchases } from '@/hooks/usePurchases';
import { useSettings } from '@/hooks/useSettings';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { AccountingRecord, Purchase } from '@/types';
import PurchaseFormDialog, { PurchaseFormData } from '@/components/purchases/PurchaseFormDialog';
import PurchaseList from '@/components/purchases/PurchaseList';
import PayCreditDialog from '@/components/purchases/PayCreditDialog';

export default function Purchases() {
  const { products, suppliers, categories, updateStock, addProduct, addCategory, addSupplier } = useInventory();
  const { purchases, addPurchase, updatePurchase, deletePurchase } = usePurchases();
  const { banks, taxSettings, updateBankBalance } = useSettings();
  const [accountingRecords, setAccountingRecords] = useLocalStorage<AccountingRecord[]>('accountingRecords', []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [payingPurchase, setPayingPurchase] = useState<Purchase | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const handleSave = (data: PurchaseFormData) => {
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

    if (editingPurchase) {
      // Revertir stock de items anteriores
      editingPurchase.items.forEach(old => {
        const p = products.find(p => p.id === old.productId);
        if (p) updateStock(old.productId, p.stock - old.quantity, p.reservedStock ?? 0);
      });

      // Aplicar stock de nuevos items
      cart.forEach(item => {
        const p = products.find(p => p.id === item.productId);
        if (p) updateStock(item.productId, p.stock + item.quantity, p.reservedStock ?? 0);
      });

      // Ajustar balances de bancos
      const oldWasCredit = editingPurchase.paymentMethod?.id === 'credito';
      if (!oldWasCredit && editingPurchase.paymentDetails?.bankId) {
        updateBankBalance(editingPurchase.paymentDetails.bankId as string, editingPurchase.total);
      } else if (!oldWasCredit && editingPurchase.paymentDetails?.isCashPayment) {
        updateBankBalance('efectivo', editingPurchase.total);
      }
      if (!isCredit) {
        updateBankBalance((selectedMethod.bankId || 'efectivo') as string, -total);
      }

      updatePurchase(editingPurchase.id, { invoiceNumber, supplierId, supplierName, items: cart, paymentMethod, paymentDetails: paymentDetails as any, tax, notes });
      toast.success(`Compra ${invoiceNumber} actualizada exitosamente`);
      setEditingPurchase(null);
      setIsFormOpen(false);
      return;
    }

    // Nueva compra
    const purchase = addPurchase({ invoiceNumber, supplierId, supplierName, items: cart, paymentMethod, paymentDetails: paymentDetails as any, tax, notes });

    cart.forEach(item => {
      const p = products.find(p => p.id === item.productId);
      if (p) updateStock(item.productId, p.stock + item.quantity, p.reservedStock ?? 0);
    });

    if (!isCredit) {
      const bankId = (selectedMethod.bankId || 'efectivo') as string;
      setAccountingRecords(prev => [...prev, {
        id: Date.now(),
        tipo: 'compra',
        descripcion: `Compra ${invoiceNumber} - ${supplierName}`,
        proveedor: supplierName,
        factura: invoiceNumber,
        monto: total,
        banco: bankId,
        fecha: new Date().toISOString(),
      }]);
      updateBankBalance(bankId, -total);
    }

    toast.success(`Compra ${purchase.documentNumber} registrada exitosamente`);
    setIsFormOpen(false);
  };

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingPurchase(null);
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

    deletePurchase(id);
    toast.success('Compra eliminada exitosamente');
  };

  const handleConfirmPayment = (bankId: string) => {
    if (!payingPurchase) return;
    const bank = banks.find(b => b.id === bankId);
    updateBankBalance(bankId, -payingPurchase.total);

    const supplierLabel = (payingPurchase.supplierName || '').trim() || 'Sin proveedor';
    setAccountingRecords(prev => [...prev, {
      id: Date.now(),
      tipo: 'compra',
      descripcion: `Pago crédito ${payingPurchase.documentNumber} - ${supplierLabel}`,
      proveedor: supplierLabel,
      factura: payingPurchase.documentNumber,
      monto: payingPurchase.total,
      banco: bankId,
      fecha: new Date().toISOString(),
    }]);

    updatePurchase(payingPurchase.id, {
      invoiceNumber: payingPurchase.documentNumber,
      supplierId: payingPurchase.supplierId,
      supplierName: supplierLabel,
      items: payingPurchase.items,
      paymentMethod: payingPurchase.paymentMethod ?? { id: 'credito', name: 'Crédito', type: 'credit' as const, isActive: true },
      paymentDetails: { bankId, bankName: bank?.name || '', paidAt: new Date().toISOString() },
      tax: payingPurchase.tax,
      notes: payingPurchase.notes,
    });

    toast.success(`Pago de $${payingPurchase.total.toLocaleString('es-CO')} registrado desde ${bank?.name || bankId}`);
    setPayingPurchase(null);
  };

  const handleAddCategory = (name: string, description = '') => {
    addCategory(name, description);
    toast.success('Categoría creada exitosamente');
  };

  const handleAddSupplier = (data: { name: string; contact: string; phone: string; email: string; address: string }) => {
    addSupplier(data);
    toast.success('Proveedor creado exitosamente');
  };

  return (
    <ScrollArea className="h-screen p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compras</h1>
          <p className="mt-2 text-gray-600">Registra facturas de compra e ingresa productos al inventario</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-auto" />
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Nueva Compra
          </Button>
        </div>
      </div>

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
        onClose={handleCloseForm}
        addProduct={addProduct}
        onAddCategory={handleAddCategory}
        onAddSupplier={handleAddSupplier}
      />

      <PurchaseList
        purchases={purchases}
        suppliers={suppliers}
        selectedDate={selectedDate}
        onEdit={handleEdit}
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
