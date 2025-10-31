import { useState, useMemo } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { usePurchases } from '@/hooks/usePurchases';
import { useSales } from '@/hooks/useSales';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Minus, Trash2, FileText, Package, Calendar } from 'lucide-react';
import { Product, PurchaseItem, AccountingRecord } from '@/types';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

export default function Purchases() {
  const { products, suppliers, updateStock } = useInventory();
  const { purchases, addPurchase } = usePurchases();
  const { paymentMethods } = useSales();
  const [accountingRecords, setAccountingRecords] = useLocalStorage<AccountingRecord[]>('accountingRecords', []);

  const [isCreatingPurchase, setIsCreatingPurchase] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [tax, setTax] = useState(0);
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<PurchaseItem[]>([]);

  // Campos adicionales para métodos de pago
  const [creditDays, setCreditDays] = useState(0);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [searchPurchase, setSearchPurchase] = useState('');

  // Lista de bancos disponibles (debe coincidir con los nombres en Accounting)
  const banks = [
    { id: 'bancolombia', name: 'Bancolombia' },
    { id: 'colpatria', name: 'Colpatria' },
    { id: 'davivienda', name: 'Davivienda' },
    { id: 'nequi', name: 'Nequi' },
    { id: 'daviplata', name: 'Daviplata' }
  ];
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
    const paymentMethod = paymentMethods.find(pm => pm.id === selectedPaymentMethod);

    if (!supplier || !paymentMethod) {
      toast.error('Proveedor o método de pago inválido');
      return;
    }

    // Determinar tipo de pago y construir paymentDetails
    let paymentDetails: any = {};
    let bankName = '';

    if (paymentMethod.name.toLowerCase().includes('crédito') || paymentMethod.name.toLowerCase().includes('credito')) {
      if (creditDays <= 0) {
        toast.error('Ingresa el plazo del crédito');
        return;
      }
      paymentDetails.creditDays = creditDays;
    } else if (paymentMethod.name.toLowerCase().includes('transferencia')) {
      if (!selectedBankId) {
        toast.error('Selecciona el banco de transferencia');
        return;
      }
      const bank = banks.find(b => b.id === selectedBankId);
      paymentDetails.bankId = selectedBankId;
      paymentDetails.bankName = bank?.name || '';
      bankName = bank?.name || '';
    } else if (paymentMethod.name.toLowerCase().includes('consignación') || paymentMethod.name.toLowerCase().includes('consignacion')) {
      paymentDetails.isCashPayment = true;
    }

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
    if (!paymentDetails.creditDays) {
      const newRecord: AccountingRecord = {
        id: Date.now(),
        tipo: 'compra',
        descripcion: `Compra ${invoiceNumber} - ${supplier.name}`,
        proveedor: supplier.name,
        factura: invoiceNumber,
        monto: total,
        banco: paymentDetails.isCashPayment ? 'Efectivo' : (bankName || paymentMethod.name),
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
    setTax(0);
    setNotes('');
    setCreditDays(0);
    setSelectedBankId('');
    setIsCreatingPurchase(false);
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
                    <Label>Buscar Productos</Label>
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
                            {paymentMethods.map(method => (
                              <SelectItem key={method.id} value={method.id}>
                                {method.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Campos condicionales según método de pago */}
                      {selectedPaymentMethod && paymentMethods.find(pm => pm.id === selectedPaymentMethod)?.name.toLowerCase().includes('crédito') && (
                        <div>
                          <Label>Plazo del Crédito (días)</Label>
                          <Input
                            type="number"
                            value={creditDays}
                            onChange={(e) => setCreditDays(parseInt(e.target.value) || 0)}
                            placeholder="30"
                          />
                        </div>
                      )}

                      {selectedPaymentMethod && paymentMethods.find(pm => pm.id === selectedPaymentMethod)?.name.toLowerCase().includes('transferencia') && (
                        <div>
                          <Label>Banco de Transferencia</Label>
                          <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar banco" />
                            </SelectTrigger>
                            <SelectContent>
                              {banks.map(bank => (
                                <SelectItem key={bank.id} value={bank.id}>
                                  {bank.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div>
                        <Label>IVA / Impuestos</Label>
                        <Input
                          type="number"
                          value={tax}
                          onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
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
                        <div className="flex justify-between">
                          <span>IVA/Impuestos:</span>
                          <span>${tax.toLocaleString('es-CO')}</span>
                        </div>
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

                  <div className="border-t mt-3 pt-3 flex justify-between text-sm">
                    <span className="text-gray-600">Método de pago: {purchase.paymentMethod.name}</span>
                    <span className="text-gray-600">
                      Subtotal: ${purchase.subtotal.toLocaleString('es-CO')}
                      {purchase.tax && purchase.tax > 0 && ` + IVA: $${purchase.tax.toLocaleString('es-CO')}`}
                    </span>
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
