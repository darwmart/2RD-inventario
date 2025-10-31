import { useState, useMemo } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { usePurchases } from '@/hooks/usePurchases';
import { useSales } from '@/hooks/useSales';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useSettings } from '@/hooks/useSettings';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Plus, Search, Minus, Trash2, FileText, Package, Calendar } from 'lucide-react';
import { Product, PurchaseItem, AccountingRecord } from '@/types';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

export default function Purchases() {
  const { products, suppliers, categories, updateStock, addProduct } = useInventory();
  const { purchases, addPurchase } = usePurchases();
  const { banks, taxSettings } = useSettings();
  const [accountingRecords, setAccountingRecords] = useLocalStorage<AccountingRecord[]>('accountingRecords', []);

  const [isCreatingPurchase, setIsCreatingPurchase] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<PurchaseItem[]>([]);

  // Campos adicionales para métodos de pago
  const [dueDate, setDueDate] = useState('');
  const [searchPurchase, setSearchPurchase] = useState('');

  // Estado para crear producto rápido
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    barcode: '',
    reference: '',
    description: '',
    cost: 0,
    currentPrice: 0,
    stock: 0,
    minStock: 1,
    categoryId: '',
    supplierId: '',
    hasIva: false
  });

  // Generar métodos de pago dinámicamente desde bancos
  const purchasePaymentMethods = useMemo(() => {
    const methods = [];

    // Agregar bancos activos (excepto efectivo) como transferencias
    banks
      .filter(bank => bank.isActive && bank.id !== 'efectivo')
      .forEach(bank => {
        methods.push({
          id: `transfer-${bank.id}`,
          name: bank.name,
          type: 'transfer' as const,
          bankId: bank.id
        });
      });

    // Agregar Consignación (efectivo)
    methods.push({
      id: 'consignacion',
      name: 'Consignación',
      type: 'cash' as const,
      bankId: 'efectivo'
    });

    // Agregar Crédito
    methods.push({
      id: 'credito',
      name: 'Crédito',
      type: 'credit' as const,
      bankId: null
    });

    return methods;
  }, [banks]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  });

  // Filtrar compras por fecha y búsqueda
  const filteredPurchases = useMemo(() => {
    return purchases.filter(purchase => {
      const purchaseDate = new Date(purchase.createdAt);
      const y = purchaseDate.getFullYear();
      const m = String(purchaseDate.getMonth() + 1).padStart(2, '0');
      const d = String(purchaseDate.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${d}`;

      const matchesDate = dateKey === selectedDate;

      // Filtro de búsqueda por proveedor o factura
      const searchLower = searchPurchase.toLowerCase();
      const matchesSearch = searchPurchase === '' ||
        purchase.supplierName.toLowerCase().includes(searchLower) ||
        purchase.invoiceNumber.toLowerCase().includes(searchLower);

      return matchesDate && matchesSearch;
    });
  }, [purchases, selectedDate, searchPurchase]);

  const addToCart = (product: Product, quantity: number = 1) => {
    const existingItemIndex = cart.findIndex(item => item.productId === product.id);

    if (existingItemIndex >= 0) {
      const existingItem = cart[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;
      const updatedCart = [...cart];
      updatedCart[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        total: newQuantity * existingItem.unitCost
      };
      setCart(updatedCart);
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity,
        unitCost: product.cost,
        total: quantity * product.cost
      }]);
    }
  };

  const updateCartItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.productId !== productId));
      return;
    }
    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity, total: newQuantity * item.unitCost }
        : item
    ));
  };

  const updateCartItemCost = (productId: string, newCost: number) => {
    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, unitCost: newCost, total: item.quantity * newCost }
        : item
    ));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);

  // Calcular IVA automáticamente basado en la configuración
  const tax = taxSettings.ivaEnabled ? (subtotal * taxSettings.ivaPercentage / 100) : 0;

  const total = subtotal + tax;

  const completePurchase = () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }
    if (!selectedSupplier || !selectedPaymentMethod || !invoiceNumber) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplier);
    const selectedMethod = purchasePaymentMethods.find(pm => pm.id === selectedPaymentMethod);

    if (!supplier || !selectedMethod) {
      toast.error('Proveedor o método de pago inválido');
      return;
    }

    // Determinar tipo de pago y construir paymentDetails
    let paymentDetails: any = {};
    let bankName = '';
    let isCredit = false;

    if (selectedMethod.type === 'credit') {
      // Crédito
      if (!dueDate) {
        toast.error('Ingresa la fecha de vencimiento del crédito');
        return;
      }
      paymentDetails.dueDate = dueDate;
      isCredit = true;
    } else if (selectedMethod.type === 'transfer') {
      // Transferencia bancaria
      const bank = banks.find(b => b.id === selectedMethod.bankId);
      paymentDetails.bankId = selectedMethod.bankId;
      paymentDetails.bankName = bank?.name || '';
      bankName = bank?.name || '';
    } else if (selectedMethod.type === 'cash') {
      // Consignación (efectivo)
      paymentDetails.isCashPayment = true;
      bankName = 'Efectivo';
    }

    // Crear objeto de método de pago compatible
    const paymentMethod = {
      id: selectedMethod.id,
      name: selectedMethod.name,
      type: 'electronic' as const,
      isActive: true
    };

    // Crear la compra
    const purchase = addPurchase({
      invoiceNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      items: cart,
      paymentMethod,
      paymentDetails,
      tax,
      notes
    });

    // Actualizar inventario automáticamente
    cart.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        const newStock = product.stock + item.quantity;
        updateStock(item.productId, newStock, product.reservedStock);
      }
    });

    // Registrar en contabilidad solo si NO es crédito
    if (!isCredit) {
      const newRecord: AccountingRecord = {
        id: Date.now(),
        tipo: 'compra',
        descripcion: `Compra ${invoiceNumber} - ${supplier.name}`,
        proveedor: supplier.name,
        factura: invoiceNumber,
        monto: total,
        banco: selectedMethod.bankId || 'efectivo',
        fecha: new Date().toISOString()
      };

      setAccountingRecords(prev => [...prev, newRecord]);
    }

    toast.success(`Compra ${purchase.invoiceNumber} registrada exitosamente`);

    // Limpiar formulario
    setCart([]);
    setSelectedSupplier('');
    setSelectedPaymentMethod('');
    setInvoiceNumber('');
    setNotes('');
    setDueDate('');
    setIsCreatingPurchase(false);
  };

  const handleCreateProduct = () => {
    if (!newProductForm.name.trim() || !newProductForm.reference.trim()) {
      toast.error('El nombre y la referencia son requeridos');
      return;
    }

    if (!newProductForm.categoryId || !newProductForm.supplierId) {
      toast.error('Selecciona una categoría y un proveedor');
      return;
    }

    // Crear el producto con todos los campos necesarios
    const newProduct = addProduct({
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
      hasIva: newProductForm.hasIva
    });

    toast.success('Producto creado exitosamente');

    // Agregar automáticamente al carrito
    addToCart(newProduct, newProductForm.stock || 1);

    // Resetear formulario
    setNewProductForm({
      name: '',
      barcode: '',
      reference: '',
      description: '',
      cost: 0,
      currentPrice: 0,
      stock: 0,
      minStock: 1,
      categoryId: '',
      supplierId: '',
      hasIva: false
    });

    setIsCreatingProduct(false);
  };

  const availableProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode.includes(searchTerm)
  ).slice(0, 8);

  return (
    <ScrollArea className="h-screen p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compras</h1>
          <p className="mt-2 text-gray-600">
            Registra facturas de compra e ingresa productos al inventario
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <Dialog open={isCreatingPurchase} onOpenChange={setIsCreatingPurchase}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Compra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Factura de Compra</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Panel izquierdo - Búsqueda y productos */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Proveedor</Label>
                      <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar proveedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map(supplier => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>N° Factura</Label>
                      <Input
                        placeholder="F-001"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>Buscar Productos</Label>
                      <Dialog open={isCreatingProduct} onOpenChange={setIsCreatingProduct}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Plus className="h-3 w-3 mr-1" />
                            Crear Producto
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Crear Nuevo Producto</DialogTitle>
                          </DialogHeader>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Nombre *</Label>
                              <Input
                                value={newProductForm.name}
                                onChange={(e) => setNewProductForm({...newProductForm, name: e.target.value})}
                                placeholder="Nombre del producto"
                              />
                            </div>
                            <div>
                              <Label>Referencia *</Label>
                              <Input
                                value={newProductForm.reference}
                                onChange={(e) => setNewProductForm({...newProductForm, reference: e.target.value})}
                                placeholder="REF-001"
                              />
                            </div>
                            <div>
                              <Label>Código de Barras</Label>
                              <Input
                                value={newProductForm.barcode}
                                onChange={(e) => setNewProductForm({...newProductForm, barcode: e.target.value})}
                                placeholder="123456789"
                              />
                            </div>
                            <div>
                              <Label>Categoría *</Label>
                              <Select
                                value={newProductForm.categoryId}
                                onValueChange={(value) => setNewProductForm({...newProductForm, categoryId: value})}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                      {cat.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Proveedor *</Label>
                              <Select
                                value={newProductForm.supplierId}
                                onValueChange={(value) => setNewProductForm({...newProductForm, supplierId: value})}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar proveedor" />
                                </SelectTrigger>
                                <SelectContent>
                                  {suppliers.map(sup => (
                                    <SelectItem key={sup.id} value={sup.id}>
                                      {sup.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Costo</Label>
                              <Input
                                type="number"
                                value={newProductForm.cost || ''}
                                onChange={(e) => setNewProductForm({...newProductForm, cost: parseFloat(e.target.value) || 0})}
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <Label>Precio de Venta</Label>
                              <Input
                                type="number"
                                value={newProductForm.currentPrice || ''}
                                onChange={(e) => setNewProductForm({...newProductForm, currentPrice: parseFloat(e.target.value) || 0})}
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <Label>Stock Inicial</Label>
                              <Input
                                type="number"
                                value={newProductForm.stock || ''}
                                onChange={(e) => setNewProductForm({...newProductForm, stock: parseInt(e.target.value) || 0})}
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <Label>Stock Mínimo</Label>
                              <Input
                                type="number"
                                value={newProductForm.minStock || ''}
                                onChange={(e) => setNewProductForm({...newProductForm, minStock: parseInt(e.target.value) || 1})}
                                placeholder="1"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label>Descripción</Label>
                              <Textarea
                                value={newProductForm.description}
                                onChange={(e) => setNewProductForm({...newProductForm, description: e.target.value})}
                                placeholder="Descripción del producto"
                                rows={2}
                              />
                            </div>
                            <div className="col-span-2">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={newProductForm.hasIva}
                                  onCheckedChange={(checked) => setNewProductForm({...newProductForm, hasIva: checked})}
                                />
                                <Label>El precio incluye IVA</Label>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={() => setIsCreatingProduct(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleCreateProduct}>
                              Crear y Agregar al Carrito
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
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
                      <Card
                        key={product.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => addToCart(product)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-400" />
                            <div className="flex-1">
                              <div className="text-sm font-medium">{product.name}</div>
                              <div className="text-xs text-gray-600">{product.reference}</div>
                              <div className="text-xs font-bold mt-1">
                                Costo: ${product.cost.toLocaleString('es-CO')}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Panel derecho - Carrito */}
                <div className="space-y-4">
                  <div>
                    <Label>Productos en la Compra</Label>
                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                      {cart.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          Sin productos agregados
                        </div>
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
                            {cart.map((item) => (
                              <TableRow key={item.productId}>
                                <TableCell className="font-medium">
                                  {item.productName}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateCartItemQuantity(item.productId, item.quantity - 1)}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="w-8 text-center">{item.quantity}</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateCartItemQuantity(item.productId, item.quantity + 1)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={item.unitCost}
                                    onChange={(e) => updateCartItemCost(item.productId, parseFloat(e.target.value) || 0)}
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell>
                                  ${item.total.toLocaleString('es-CO')}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setCart(cart.filter(c => c.productId !== item.productId))}
                                  >
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

                  {/* Resumen de compra */}
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div>
                        <Label>Método de Pago</Label>
                        <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                          <SelectTrigger>
                            <SelectValue placeholder="Método de pago" />
                          </SelectTrigger>
                          <SelectContent>
                            {purchasePaymentMethods.map(method => (
                              <SelectItem key={method.id} value={method.id}>
                                {method.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Campo de fecha de vencimiento para Crédito */}
                      {selectedPaymentMethod === 'credito' && (
                        <div>
                          <Label>Fecha de Vencimiento</Label>
                          <Input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                          />
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

                      <Button
                        className="w-full"
                        onClick={completePurchase}
                        disabled={cart.length === 0}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Registrar Compra
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lista de compras */}
      <Card>
        <CardHeader>
          <CardTitle>Compras del {new Date(selectedDate).toLocaleDateString('es-CO')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label>Buscar por proveedor o número de factura</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar proveedor o factura..."
                className="pl-10"
                value={searchPurchase}
                onChange={(e) => setSearchPurchase(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-4">
            {filteredPurchases.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {searchPurchase
                  ? 'No se encontraron compras con ese criterio de búsqueda'
                  : 'No hay compras registradas para esta fecha'
                }
              </p>
            ) : (
              filteredPurchases.map(purchase => (
                <div key={purchase.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-lg">Factura: {purchase.invoiceNumber}</h4>
                      <p className="text-sm text-gray-600">Proveedor: {purchase.supplierName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(purchase.createdAt).toLocaleString('es-CO')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${purchase.total.toLocaleString('es-CO')}
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-2">Productos:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {purchase.items.map((item, idx) => (
                        <div key={idx} className="text-sm bg-gray-50 p-2 rounded">
                          <span className="font-medium">{item.productName}</span>
                          <span className="text-gray-600"> - {item.quantity} unidades × ${item.unitCost.toLocaleString('es-CO')}</span>
                          <span className="float-right font-bold">${item.total.toLocaleString('es-CO')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {purchase.notes && (
                    <div className="border-t mt-3 pt-3">
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Notas:</span> {purchase.notes}
                      </p>
                    </div>
                  )}

                  <div className="border-t mt-3 pt-3">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">
                        Método de pago: <span className="font-medium">{purchase.paymentMethod.name}</span>
                        {purchase.paymentDetails?.dueDate && (
                          <span className="ml-2 text-orange-600">
                            (Vence: {new Date(purchase.paymentDetails.dueDate).toLocaleDateString('es-CO')})
                          </span>
                        )}
                      </span>
                      <span className="text-gray-600">
                        Subtotal: ${purchase.subtotal.toLocaleString('es-CO')}
                        {purchase.tax && purchase.tax > 0 && ` + IVA: $${purchase.tax.toLocaleString('es-CO')}`}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </ScrollArea>
  );
}
