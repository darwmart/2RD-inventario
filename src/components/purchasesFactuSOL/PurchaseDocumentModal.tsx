import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Package, FileText, Trash2 } from 'lucide-react';
import { fmtMoneyInput, parseMoney } from '@/utils/formatters';
import { PurchaseDocument, DocumentType, Product, Supplier } from '@/types';
import { toast } from 'sonner';
import SupplierFormDialog from '@/components/SupplierFormDialog';
import SupplierSearchDialog from '@/components/SupplierSearchDialog';
import ProductSearchDialog from '@/components/ProductSearchDialog';
import ProductFormDialog from '@/components/ProductFormDialog';

export interface PurchaseDocumentFormData {
  supplierId: string;
  supplierName: string;
  warehouse: string;
  supplierInvoiceNumber: string;
  /** Fecha del documento en formato YYYY-MM-DD */
  documentDate: string;
  items: any[];
  notes: string;
}

interface TaxSettings {
  ivaEnabled: boolean;
  ivaPercentage: number;
}

interface Props {
  open: boolean;
  editingDocument: PurchaseDocument | null;
  activeTab: DocumentType;
  products: Product[];
  suppliers: Supplier[];
  categories: { id: string; name: string; description: string }[];
  taxSettings: TaxSettings;
  existingDocuments: PurchaseDocument[];
  onClose: () => void;
  onSave: (data: PurchaseDocumentFormData) => void;
  onAddSupplier: (data: Omit<Supplier, 'id' | 'createdAt'>) => Supplier;
  onAddProduct: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'reservedStock'>) => Product;
  onAddCategory: (name: string, description: string) => void;
}

const DEFAULT_WAREHOUSE = 'Bodega Principal';

export default function PurchaseDocumentModal({
  open, editingDocument, activeTab, products, suppliers, categories, taxSettings,
  existingDocuments, onClose, onSave, onAddSupplier, onAddProduct, onAddCategory,
}: Props) {
  const [supplierId, setSupplierId] = useState('');
  const [supplierCode, setSupplierCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [warehouse, setWarehouse] = useState(DEFAULT_WAREHOUSE);
  const [documentDate, setDocumentDate] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [notes, setNotes] = useState('');

  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  const [isSupplierSearchOpen, setIsSupplierSearchOpen] = useState(false);
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editingDocument) {
      setSupplierId(editingDocument.supplierId);
      const supplier = suppliers.find(s => s.id === editingDocument.supplierId);
      if (supplier) {
        setSupplierCode(supplier.code || '');
        setSupplierName(supplier.commercialName || supplier.fiscalName);
      }
      setSupplierInvoiceNumber(editingDocument.supplierInvoiceNumber || '');
      setWarehouse(editingDocument.warehouse || DEFAULT_WAREHOUSE);
      const d = editingDocument.documentDate ?? editingDocument.createdAt;
      setDocumentDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      setItems(editingDocument.items.map((it: any) => ({
        ...it,
        quantityStr: it.quantity > 0 ? it.quantity.toLocaleString('es-CO') : '',
        unitCostStr: it.unitCost ? Math.round(it.unitCost).toLocaleString('es-CO') : '',
      })));
      setNotes(editingDocument.notes || '');
    } else {
      setSupplierId('');
      setSupplierCode('');
      setSupplierName('');
      setSupplierInvoiceNumber('');
      setWarehouse(DEFAULT_WAREHOUSE);
      setDocumentDate(todayStr);
      setItems([]);
      setNotes('');
    }
  }, [open, editingDocument, suppliers]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1' && !isProductSearchOpen && !isSupplierSearchOpen) {
        e.preventDefault();
        setIsProductSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isProductSearchOpen, isSupplierSearchOpen]);

  const addProductToItems = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const existingIndex = items.findIndex(i => i.productId === productId);
    if (existingIndex >= 0) {
      const next = [...items];
      next[existingIndex].quantity += 1;
      next[existingIndex].total = next[existingIndex].quantity * next[existingIndex].unitCost;
      setItems(next);
    } else {
      setItems(prev => [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        quantityStr: '1',
        unitCost: product.cost,
        unitCostStr: product.cost ? Math.round(product.cost).toLocaleString('es-CO') : '',
        total: product.cost,
      }]);
    }
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      setItems(items.filter((_, i) => i !== index));
    } else {
      const next = [...items];
      next[index].quantity = quantity;
      next[index].total = quantity * next[index].unitCost;
      setItems(next);
    }
  };

  const handleUpdateQuantityStr = (index: number, raw: string) => {
    const f = fmtMoneyInput(raw);
    const qty = parseMoney(f);
    if (qty <= 0 && f !== '') return;
    const next = [...items];
    next[index].quantityStr = f;
    next[index].quantity = qty || 0;
    next[index].total = (qty || 0) * next[index].unitCost;
    setItems(next);
  };

  const handleUpdatePrice = (index: number, priceStr: string) => {
    const raw = priceStr.replace(/\D/g, '');
    const formatted = raw === '' ? '' : raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const price = raw === '' ? 0 : parseInt(raw, 10);
    const next = [...items];
    next[index].unitCost = price;
    next[index].unitCostStr = formatted;
    next[index].total = next[index].quantity * price;
    setItems(next);
  };

  const handleSupplierCodeChange = (code: string) => {
    setSupplierCode(code);
    if (!code.trim()) { setSupplierId(''); setSupplierName(''); return; }
    const supplier = suppliers.find(s => s.code === code.trim());
    if (supplier) {
      setSupplierId(supplier.id);
      setSupplierName(supplier.commercialName || supplier.fiscalName);
    } else {
      setSupplierId('');
      setSupplierName('');
    }
  };

  const handleSelectSupplier = (supplier: Supplier) => {
    setSupplierId(supplier.id);
    setSupplierCode(supplier.code || '');
    setSupplierName(supplier.commercialName || supplier.fiscalName);
    setIsSupplierSearchOpen(false);
  };

  const handleSave = () => {
    if (!supplierId) { toast.error('Selecciona un proveedor'); return; }
    if (items.length === 0) { toast.error('Agrega al menos un artículo'); return; }
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) { toast.error('Proveedor no válido'); return; }

    if (supplierInvoiceNumber.trim()) {
      const num = supplierInvoiceNumber.trim().toLowerCase();
      const duplicate = existingDocuments.find(doc =>
        doc.id !== editingDocument?.id &&
        doc.supplierId === supplierId &&
        doc.supplierInvoiceNumber?.trim().toLowerCase() === num
      );
      if (duplicate) {
        toast.error(`La factura "${supplierInvoiceNumber}" ya existe para este proveedor (doc. ${duplicate.documentNumber})`);
        return;
      }
    }

    onSave({ supplierId, supplierName: supplier.commercialName || supplier.fiscalName || supplierName, warehouse, supplierInvoiceNumber, documentDate: documentDate || todayStr, items, notes });
  };

  const modalTotals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const isDelivery = (editingDocument?.documentType ?? activeTab) === 'delivery';
    const tax = !isDelivery && taxSettings.ivaEnabled ? (subtotal * taxSettings.ivaPercentage / 100) : 0;
    return { subtotal, tax, total: subtotal + tax };
  }, [items, taxSettings, activeTab, editingDocument]);

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-4 pb-2 border-b">
            <DialogTitle className="text-lg">
              {editingDocument
                ? `${editingDocument.documentType === 'delivery' ? 'Albarán' : 'Factura'} ${editingDocument.documentNumber}`
                : `Nuevo ${activeTab === 'delivery' ? 'Albarán' : 'Factura de Compra'}`
              }
            </DialogTitle>
          </DialogHeader>

          <div className="flex h-[calc(95vh-120px)]">
            {/* Panel izquierdo — búsqueda de artículos */}
            <div className="w-[350px] border-r bg-gray-50 flex flex-col">
              <div className="p-4 bg-white border-b">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">Agregar artículos</h3>
                <Button variant="outline" className="w-full justify-start gap-2"
                  onClick={() => setIsProductSearchOpen(true)}>
                  <Search className="h-4 w-4" />Buscar artículos (F1)
                </Button>
                <p className="text-xs text-gray-500 mt-2">Haz clic para buscar y agregar artículos al documento</p>
              </div>
              <div className="flex-1 p-4 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Package className="h-16 w-16 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Usa el botón de arriba<br />para buscar artículos</p>
                </div>
              </div>
            </div>

            {/* Panel derecho — datos del documento */}
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b bg-white space-y-3">
                <div className="grid grid-cols-6 gap-3">
                  <div>
                    <Label className="text-xs font-medium mb-1 block">ALMACÉN</Label>
                    <Input value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1 block">FECHA *</Label>
                    <Input
                      type="date"
                      value={documentDate}
                      onChange={(e) => setDocumentDate(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs font-medium mb-1 block">PROVEEDOR *</Label>
                    <div className="flex gap-2">
                      <Input
                        value={supplierCode}
                        onChange={(e) => handleSupplierCodeChange(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'F1') { e.preventDefault(); setIsSupplierSearchOpen(true); } }}
                        placeholder="Código"
                        className="h-8 text-sm w-24 font-mono"
                        title="Presiona F1 para buscar"
                      />
                      <Input value={supplierName} readOnly placeholder="Nombre comercial" className="h-8 text-sm flex-1 bg-gray-50" />
                      <Button type="button" variant="outline" size="sm" className="h-8 px-2"
                        onClick={() => setIsSupplierSearchOpen(true)} title="Buscar proveedor (F1)">
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs font-medium mb-1 block">Nº FACTURA PROVEEDOR</Label>
                    <Input value={supplierInvoiceNumber} onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                      placeholder="Ej: F-12345" className="h-8 font-mono text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1 block">DOCUMENTO</Label>
                    <Input value={editingDocument?.documentNumber || 'Autogenerado'} className="h-8 font-mono text-sm" disabled />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4">
                <div className="border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="h-8 text-xs">Referencia</TableHead>
                        <TableHead className="h-8 text-xs">Artículo</TableHead>
                        <TableHead className="h-8 text-xs w-[100px]">Cantidad</TableHead>
                        <TableHead className="h-8 text-xs w-[120px]">P. Unitario</TableHead>
                        <TableHead className="h-8 text-xs w-[120px] text-right">Importe</TableHead>
                        <TableHead className="h-8 w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-400 py-12 text-sm">
                            <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            Haz doble clic en un artículo para agregarlo
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item, index) => {
                          const product = products.find(p => p.id === item.productId);
                          return (
                            <TableRow key={index} className="hover:bg-gray-50">
                              <TableCell className="text-xs font-mono">{product?.reference}</TableCell>
                              <TableCell className="text-sm">{item.productName}</TableCell>
                              <TableCell>
                                <Input type="text" inputMode="numeric"
                                  value={item.quantityStr ?? item.quantity.toLocaleString('es-CO')}
                                  onChange={(e) => handleUpdateQuantityStr(index, e.target.value)}
                                  className="h-7 text-sm text-center" />
                              </TableCell>
                              <TableCell>
                                <Input type="text" inputMode="numeric"
                                  value={item.unitCostStr ?? (item.unitCost ? Math.round(item.unitCost).toLocaleString('es-CO') : '')}
                                  onChange={(e) => handleUpdatePrice(index, e.target.value)}
                                  className="h-7 text-sm text-right font-mono" />
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm font-medium">
                                ${item.total.toLocaleString('es-CO')}
                              </TableCell>
                              <TableCell>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                                  onClick={() => setItems(items.filter((_, i) => i !== index))}>
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="border-t bg-gray-50 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium mb-1 block">OBSERVACIONES</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notas internas del documento..." rows={3} className="text-sm resize-none" />
                  </div>
                  <div className="bg-white border rounded p-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-mono">${modalTotals.subtotal.toLocaleString('es-CO')}</span>
                      </div>
                      {taxSettings.ivaEnabled && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">IVA ({taxSettings.ivaPercentage}%):</span>
                          <span className="font-mono">${modalTotals.tax.toLocaleString('es-CO')}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                        <span>TOTAL:</span>
                        <span className="font-mono text-blue-600">${modalTotals.total.toLocaleString('es-CO')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center px-6 py-3 border-t bg-white">
            <div className="text-sm text-gray-500">
              {items.length} artículo{items.length !== 1 ? 's' : ''} agregado{items.length !== 1 ? 's' : ''}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleSave} className="min-w-[120px]">
                <FileText className="h-4 w-4 mr-2" />
                {editingDocument ? 'Actualizar' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SupplierSearchDialog
        open={isSupplierSearchOpen}
        onOpenChange={setIsSupplierSearchOpen}
        suppliers={suppliers}
        onSelect={handleSelectSupplier}
        onNewSupplier={() => { setIsSupplierSearchOpen(false); setIsSupplierFormOpen(true); }}
      />

      <SupplierFormDialog
        open={isSupplierFormOpen}
        onOpenChange={setIsSupplierFormOpen}
        supplier={null}
        onSave={(data) => {
          const newSupplier = onAddSupplier(data);
          toast.success('Proveedor creado correctamente');
          setSupplierId(newSupplier.id);
          setSupplierCode(newSupplier.code || '');
          setSupplierName(newSupplier.commercialName || newSupplier.fiscalName);
        }}
      />

      <ProductSearchDialog
        open={isProductSearchOpen}
        onOpenChange={setIsProductSearchOpen}
        products={products}
        categories={categories}
        onSelect={(product) => { addProductToItems(product.id); }}
        onNewProduct={() => { setIsProductSearchOpen(false); setEditingProduct(null); setIsProductFormOpen(true); }}
      />

      <ProductFormDialog
        open={isProductFormOpen}
        onOpenChange={setIsProductFormOpen}
        product={editingProduct}
        categories={categories}
        suppliers={suppliers}
        onSave={(data) => {
          const newProduct = onAddProduct(data);
          toast.success('Artículo creado correctamente');
          addProductToItems(newProduct.id);
        }}
        onAddCategory={onAddCategory}
      />
    </>
  );
}
