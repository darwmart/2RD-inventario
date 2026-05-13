import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Minus, Trash2, FileText, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Bank, Category, Product, Purchase, PurchaseItem, Supplier, TaxSettings } from '@/types';
import { CreateProductInput } from '@/domain/inventory';
import ProductFormDialog from '@/components/ProductFormDialog';

export interface PurchaseFormData {
  cart: PurchaseItem[];
  supplierId: string;
  supplierName: string;
  selectedMethod: PurchasePaymentMethod;
  invoiceNumber: string;
  notes: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
}

export interface PurchasePaymentMethod {
  id: string;
  name: string;
  type: 'transfer' | 'cash' | 'credit';
  bankId: string | null;
}

interface Props {
  open: boolean;
  editingPurchase: Purchase | null;
  suppliers: Supplier[];
  products: Product[];
  categories: Category[];
  banks: Bank[];
  taxSettings: TaxSettings;
  purchases: Purchase[];
  onSave: (data: PurchaseFormData) => void;
  onClose: () => void;
  addProduct: (data: CreateProductInput) => Promise<Product>;
  onAddCategory: (name: string, description: string) => void;
  onAddSupplier: (data: { name: string; contact: string; phone: string; email: string; address: string }) => void;
}

const EMPTY_PRODUCT_FORM = {
  name: '', barcode: '', reference: '', description: '', image: '',
  cost: 0, suggestedPrice: 0, discountPrice: 0, wholesalePrice: 0, currentPrice: 0,
  stock: 0, minStock: 1, categoryId: '', supplierId: '', hasIva: false,
};

function getSupplierName(s: Supplier): string {
  return ((s.commercialName || '').trim() || (s.fiscalName || '').trim() || (s as any).name || '').trim() || '';
}

export default function PurchaseFormDialog({
  open, editingPurchase, suppliers, products, categories, banks,
  taxSettings, purchases, onSave, onClose, addProduct, onAddCategory, onAddSupplier,
}: Props) {
  const [cart, setCart] = useState<PurchaseItem[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [newProductForm, setNewProductForm] = useState({ ...EMPTY_PRODUCT_FORM });

  const purchasePaymentMethods = useMemo<PurchasePaymentMethod[]>(() => {
    const methods: PurchasePaymentMethod[] = [];
    banks.filter(b => b.isActive && b.id !== 'efectivo').forEach(b => {
      methods.push({ id: `transfer-${b.id}`, name: b.name, type: 'transfer', bankId: b.id });
    });
    methods.push({ id: 'consignacion', name: 'Consignación', type: 'cash', bankId: 'efectivo' });
    methods.push({ id: 'credito', name: 'Crédito', type: 'credit', bankId: null });
    return methods;
  }, [banks]);

  useEffect(() => {
    if (!open) return;
    if (editingPurchase) {
      setInvoiceNumber(editingPurchase.documentNumber || '');
      setSelectedSupplier(editingPurchase.supplierId);
      setCart(editingPurchase.items);
      setNotes(editingPurchase.notes || '');
      setSelectedPaymentMethod(editingPurchase.paymentMethod?.id || '');
      setDueDate(editingPurchase.paymentDetails?.dueDate || '');
    } else {
      resetForm();
    }
  }, [open, editingPurchase]);

  const resetForm = () => {
    setCart([]);
    setSelectedSupplier('');
    setSelectedPaymentMethod('');
    setInvoiceNumber('');
    setNotes('');
    setDueDate('');
    setSearchTerm('');
    setNewProductForm({ ...EMPTY_PRODUCT_FORM });
  };

  const addToCart = (product: Product, quantity = 1) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === product.id);
      if (idx >= 0) {
        const updated = [...prev];
        const qty = updated[idx].quantity + quantity;
        updated[idx] = { ...updated[idx], quantity: qty, total: qty * updated[idx].unitCost };
        return updated;
      }
      return [...prev, { productId: product.id, productName: product.name, quantity, unitCost: product.cost, total: quantity * product.cost }];
    });
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) { setCart(prev => prev.filter(i => i.productId !== productId)); return; }
    setCart(prev => prev.map(i => i.productId === productId ? { ...i, quantity: qty, total: qty * i.unitCost } : i));
  };

  const updateCost = (productId: string, cost: number) => {
    setCart(prev => prev.map(i => i.productId === productId ? { ...i, unitCost: cost, total: i.quantity * cost } : i));
  };

  const subtotal = cart.reduce((sum, i) => sum + i.total, 0);
  const tax = taxSettings.ivaEnabled ? (subtotal * taxSettings.ivaPercentage / 100) : 0;
  const total = subtotal + tax;

  const availableProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode.includes(searchTerm)
  ).slice(0, 8);

  const handleSave = () => {
    if (cart.length === 0) { toast.error('El carrito está vacío'); return; }
    if (!selectedSupplier || !selectedPaymentMethod || !invoiceNumber) {
      toast.error('Completa todos los campos requeridos'); return;
    }
    const zeroItem = cart.find(i => i.unitCost <= 0);
    if (zeroItem) { toast.error(`El costo de "${zeroItem.productName}" debe ser mayor a $0`); return; }

    const dupInvoice = purchases.find(p =>
      p.supplierId === selectedSupplier &&
      (p.documentNumber || '').trim().toLowerCase() === invoiceNumber.trim().toLowerCase() &&
      p.id !== editingPurchase?.id
    );
    if (dupInvoice) { toast.error(`Ya existe la factura "${invoiceNumber}" para este proveedor`); return; }

    const method = purchasePaymentMethods.find(pm => pm.id === selectedPaymentMethod);
    if (!method) { toast.error('Método de pago inválido'); return; }

    if (method.type === 'credit') {
      if (!dueDate) { toast.error('Ingresa la fecha de vencimiento del crédito'); return; }
      if (new Date(dueDate) < new Date(new Date().toDateString())) {
        toast.error('La fecha de vencimiento no puede ser en el pasado'); return;
      }
    }

    const supplier = suppliers.find(s => s.id === selectedSupplier);
    if (!supplier) { toast.error('Proveedor inválido'); return; }

    onSave({
      cart,
      supplierId: supplier.id,
      supplierName: getSupplierName(supplier),
      selectedMethod: method,
      invoiceNumber: invoiceNumber.trim(),
      notes,
      dueDate,
      subtotal,
      tax,
      total,
    });

    resetForm();
  };

  const handleCreateProduct = async () => {
    if (!newProductForm.name.trim() || !newProductForm.reference.trim()) {
      toast.error('El nombre y la referencia son requeridos'); return;
    }
    if (!newProductForm.categoryId || !newProductForm.supplierId) {
      toast.error('Selecciona una categoría y un proveedor'); return;
    }
    const created = await addProduct({
      name: newProductForm.name.trim(),
      barcode: newProductForm.barcode.trim(),
      reference: newProductForm.reference.trim(),
      description: newProductForm.description.trim(),
      image: '',
      cost: newProductForm.cost,
      suggestedPrice: newProductForm.currentPrice,
      discountPrice: 0,
      wholesalePrice: 0,
      currentPrice: newProductForm.currentPrice,
      stock: newProductForm.stock,
      minStock: newProductForm.minStock,
      categoryId: newProductForm.categoryId,
      supplierId: newProductForm.supplierId,
      hasIva: newProductForm.hasIva,
    });
    toast.success('Producto creado exitosamente');
    addToCart(created, newProductForm.stock || 1);
    setNewProductForm({ ...EMPTY_PRODUCT_FORM });
    setIsCreatingProduct(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingPurchase ? 'Editar Compra' : 'Registrar Factura de Compra'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel izquierdo */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Proveedor</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{getSupplierName(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>N° Factura</Label>
                <Input placeholder="F-001" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Buscar Productos</Label>
                <Button size="sm" variant="outline" onClick={() => setIsCreatingProduct(true)}>
                  <Plus className="h-3 w-3 mr-1" />Crear Producto
                </Button>
              </div>
              <ProductFormDialog
                open={isCreatingProduct}
                onOpenChange={setIsCreatingProduct}
                formData={newProductForm}
                onFormChange={setNewProductForm}
                onSubmit={handleCreateProduct}
                categories={categories}
                suppliers={suppliers}
                submitLabel="Crear y Agregar al Carrito"
                onAddCategory={onAddCategory}
                onAddSupplier={onAddSupplier}
                showCategoryCreate={true}
                showSupplierCreate={true}
              />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre o referencia..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
              {availableProducts.map(product => (
                <Card key={product.id} className="cursor-pointer hover:bg-gray-50" onClick={() => addToCart(product)}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{product.name}</div>
                        <div className="text-xs text-gray-600">{product.reference}</div>
                        <div className="text-xs font-bold mt-1">Costo: ${product.cost.toLocaleString('es-CO')}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Panel derecho */}
          <div className="space-y-4">
            <div>
              <Label>Productos en la Compra</Label>
              <div className="border rounded-lg max-h-96 overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">Sin productos agregados</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Producto</TableHead>
                        <TableHead className="w-[80px]">Cant.</TableHead>
                        <TableHead className="w-[100px]">Costo</TableHead>
                        <TableHead className="w-[100px]">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map(item => (
                        <TableRow key={item.productId}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="outline" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <Button size="sm" variant="outline" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.unitCost}
                              onChange={(e) => updateCost(item.productId, parseFloat(e.target.value) || 0)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>${item.total.toLocaleString('es-CO')}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => setCart(prev => prev.filter(c => c.productId !== item.productId))}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label>Método de Pago</Label>
                  <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                    <SelectTrigger><SelectValue placeholder="Método de pago" /></SelectTrigger>
                    <SelectContent>
                      {purchasePaymentMethods.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPaymentMethod === 'credito' && (
                  <div>
                    <Label>Fecha de Vencimiento</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                )}

                <div>
                  <Label>Notas</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observaciones adicionales..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2 border-t pt-4">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${subtotal.toLocaleString('es-CO')}</span>
                  </div>
                  {taxSettings.ivaEnabled && (
                    <div className="flex justify-between text-gray-600">
                      <span>IVA ({taxSettings.ivaPercentage}%):</span>
                      <span>${tax.toLocaleString('es-CO')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>${total.toLocaleString('es-CO')}</span>
                  </div>
                </div>

                <Button className="w-full" onClick={handleSave} disabled={cart.length === 0}>
                  <FileText className="h-4 w-4 mr-2" />
                  {editingPurchase ? 'Actualizar Compra' : 'Registrar Compra'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
