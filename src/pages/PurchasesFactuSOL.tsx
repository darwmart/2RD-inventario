import { useMemo, useState } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import { useProducts, useCategories, useSuppliers } from '@/hooks/queries/useProducts';
import { usePurchasesData } from '@/hooks/queries/usePurchasesData';
import { useBankSettings } from '@/hooks/queries/useBankSettings';
import { useCompanySettings } from '@/hooks/queries/useCompanySettings';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ScrollArea } from '@/components/ui/scroll-area';
import TableSkeleton from '@/components/ui/TableSkeleton';
import { PurchaseDocument, DocumentType, AccountingRecord, Supplier } from '@/types';
import { toast } from 'sonner';
import SupplierFormDialog from '@/components/SupplierFormDialog';
import DocumentListView from '@/components/purchasesFactuSOL/DocumentListView';
import PurchaseDocumentModal, { PurchaseDocumentFormData } from '@/components/purchasesFactuSOL/PurchaseDocumentModal';
import PayInvoiceDialog from '@/components/purchasesFactuSOL/PayInvoiceDialog';
import ImportPurchasesDialog from '@/components/purchasesFactuSOL/ImportPurchasesDialog';

export default function PurchasesFactuSOL() {
  const { products, updateStock, addProduct } = useProducts();
  const { categories, addCategory } = useCategories();
  const { suppliers, addSupplier, updateSupplier } = useSuppliers();
  const { purchases, isLoading: purchasesLoading, createDocument, updateDocument, deleteDocument, convertDeliveryToInvoice, markAsPaid } = usePurchasesData();
  const { banks, updateBankBalance } = useBankSettings();
  const { taxSettings } = useCompanySettings();
  const [, setAccountingRecords] = useLocalStorage<AccountingRecord[]>('accountingRecords', []);

  const { confirm, ConfirmDialog } = useConfirm();
  const [activeTab, setActiveTab] = useState<DocumentType>('delivery');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<PurchaseDocument | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<PurchaseDocument | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<PurchaseDocument | null>(null);

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const getSupplierName = (s: Supplier): string =>
    (s?.commercialName || '').trim() || (s?.fiscalName || '').trim() || (s?.name || '').trim() || '';

  const resolveSupplierName = (doc: PurchaseDocument): string => {
    if (doc.supplierName?.trim()) return doc.supplierName.trim();
    const s = suppliers.find(x => x.id === doc.supplierId);
    return s ? (getSupplierName(s) || 'Sin proveedor') : 'Sin proveedor';
  };

  const getPaidAmount = (doc: PurchaseDocument): number =>
    (doc.payments || []).reduce((sum, p) => sum + p.amount, 0);

  const getPendingAmount = (doc: PurchaseDocument): number =>
    Math.max(0, doc.total - getPaidAmount(doc));

  const filteredDocuments = useMemo(() => purchases.filter(doc => {
    if (doc.documentType !== activeTab) return false;
    if (doc.documentType === 'delivery' && doc.status === 'invoiced') return false;
    const docDate = new Date(doc.createdAt); docDate.setHours(0, 0, 0, 0);
    if (startDate) { const s = new Date(startDate); s.setHours(0, 0, 0, 0); if (docDate < s) return false; }
    if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59, 999); if (docDate > e) return false; }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match = doc.documentNumber?.toLowerCase().includes(q) ||
        doc.supplierName?.toLowerCase().includes(q) ||
        doc.supplierInvoiceNumber?.toLowerCase().includes(q) ||
        doc.items?.some(i => i.productName?.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  [purchases, activeTab, startDate, endDate, searchTerm]);

  const totals = useMemo(() => ({
    subtotal: filteredDocuments.reduce((s, d) => s + d.subtotal, 0),
    tax: filteredDocuments.reduce((s, d) => s + (d.tax || 0), 0),
    total: filteredDocuments.reduce((s, d) => s + d.total, 0),
  }), [filteredDocuments]);

  const handleSave = (data: PurchaseDocumentFormData) => {
    const supplier = suppliers.find(s => s.id === data.supplierId);
    if (!supplier) return;
    const subtotal = data.items.reduce((sum: number, item: any) => sum + item.total, 0);
    const tax = taxSettings.ivaEnabled ? (subtotal * taxSettings.ivaPercentage / 100) : 0;

    if (editingDocument) {
      const paidAmt = getPaidAmount(editingDocument);
      const newTotal = subtotal + tax;
      let newStatus: 'partial' | 'completed' | undefined;
      if (editingDocument.documentType === 'invoice') {
        if (paidAmt > 0 && newTotal > paidAmt) newStatus = 'partial';
        else if (paidAmt > 0 && newTotal <= paidAmt && editingDocument.status === 'partial') newStatus = 'completed';
      }
      updateDocument(editingDocument.id, {
        supplierId: supplier.id,
        supplierName: getSupplierName(supplier),
        items: data.items,
        subtotal,
        tax,
        total: subtotal + tax,
        notes: data.notes,
        paymentMethod: editingDocument.paymentMethod || { id: 'efectivo', name: 'Efectivo', type: 'cash', isActive: true },
        paymentDetails: editingDocument.paymentDetails,
        ...(newStatus !== undefined ? { status: newStatus } : {}),
      });
      toast.success(newStatus === 'partial' ? 'Documento actualizado — hay un saldo pendiente de pago' : 'Documento actualizado');
    } else {
      createDocument({
        documentType: activeTab,
        supplierId: supplier.id,
        supplierName: getSupplierName(supplier),
        warehouse: data.warehouse,
        items: data.items,
        tax,
        notes: data.notes,
        supplierInvoiceNumber: data.supplierInvoiceNumber,
      });
    }
    setIsModalOpen(false);
    setEditingDocument(null);
  };

  const handleDelete = async () => {
    if (!selectedDocument) return;
    if (!await confirm({ description: '¿Estás seguro de eliminar este documento?', confirmLabel: 'Eliminar' })) return;
    const doc = purchases.find(p => p.id === selectedDocument.id);
    if (doc) {
      if (doc.documentType === 'delivery' || doc.documentType === 'invoice') {
        doc.items.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          if (product) updateStock(item.productId, product.stock - item.quantity, product.reservedStock ?? 0);
        });
      }
      if (doc.documentType === 'invoice' && doc.paymentDetails?.bankId) {
        updateBankBalance(doc.paymentDetails.bankId, doc.total);
      }
      deleteDocument(selectedDocument.id);
      setSelectedDocument(null);
      toast.success('Documento eliminado');
    }
  };

  const handleMarkAsPaid = (bankId: string) => {
    if (!payingInvoice) return;
    try {
      const bankName = banks.find(b => b.id === bankId)?.name || 'Efectivo';
      const amount = getPendingAmount(payingInvoice);
      markAsPaid(payingInvoice.id, bankId, bankName, amount);
      updateBankBalance(bankId, -amount);
      toast.success(`Factura ${payingInvoice.documentNumber} marcada como pagada`);
      setIsPaymentModalOpen(false);
      setPayingInvoice(null);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleConvertToInvoice = (deliveryId: string) => {
    try {
      const invoice = convertDeliveryToInvoice(deliveryId, {
        paymentMethod: { id: 'pendiente', name: 'Pendiente', type: 'credit', isActive: true },
        paymentDetails: {},
      });
      toast.success(`Factura ${invoice.documentNumber} creada (pendiente de pago)`);
      setActiveTab('invoice');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <ScrollArea className="h-screen">
      <div className="p-6 max-w-[1400px] mx-auto">
        {purchasesLoading ? <TableSkeleton rows={8} cols={6} /> : <DocumentListView
          activeTab={activeTab}
          onTabChange={setActiveTab}
          filteredDocuments={filteredDocuments}
          selectedDocument={selectedDocument}
          purchases={purchases}
          totals={totals}
          startDate={startDate}
          endDate={endDate}
          searchTerm={searchTerm}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onSearchChange={setSearchTerm}
          onClearFilters={() => { setStartDate(''); setEndDate(''); setSearchTerm(''); }}
          onSelectDocument={setSelectedDocument}
          onNew={() => { setEditingDocument(null); setIsModalOpen(true); }}
          onImport={() => setIsImportOpen(true)}
          onEdit={() => { if (selectedDocument) { setEditingDocument(selectedDocument); setIsModalOpen(true); } }}
          onDelete={handleDelete}
          onConvertToInvoice={handleConvertToInvoice}
          onOpenPayment={(doc) => { setPayingInvoice(doc); setIsPaymentModalOpen(true); }}
          onOpenSupplier={() => { setEditingSupplier(null); setIsSupplierModalOpen(true); }}
          resolveSupplierName={resolveSupplierName}
        />}

        <PurchaseDocumentModal
          open={isModalOpen}
          editingDocument={editingDocument}
          activeTab={activeTab}
          products={products}
          suppliers={suppliers}
          categories={categories}
          taxSettings={taxSettings}
          onClose={() => { setIsModalOpen(false); setEditingDocument(null); }}
          onSave={handleSave}
          onAddSupplier={addSupplier}
          onAddProduct={addProduct}
          onAddCategory={addCategory}
        />

        <PayInvoiceDialog
          open={isPaymentModalOpen}
          invoice={payingInvoice}
          banks={banks}
          pendingAmount={payingInvoice ? getPendingAmount(payingInvoice) : 0}
          supplierName={payingInvoice ? resolveSupplierName(payingInvoice) : ''}
          onClose={() => { setIsPaymentModalOpen(false); setPayingInvoice(null); }}
          onConfirm={handleMarkAsPaid}
        />

        {ConfirmDialog}

        <ImportPurchasesDialog
          open={isImportOpen}
          onOpenChange={setIsImportOpen}
        />

        <SupplierFormDialog
          open={isSupplierModalOpen}
          onOpenChange={setIsSupplierModalOpen}
          supplier={editingSupplier}
          onSave={(data) => {
            if (editingSupplier) {
              updateSupplier(editingSupplier.id, data);
              toast.success('Proveedor actualizado correctamente');
            } else {
              addSupplier(data);
              toast.success('Proveedor creado correctamente');
            }
          }}
        />
      </div>
    </ScrollArea>
  );
}
