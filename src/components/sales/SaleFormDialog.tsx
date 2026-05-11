import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Minus, Trash2, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { Advisor, PaymentMethod, Product, Sale, SaleItem, TaxSettings } from '@/types';
import { calculateItemIVA } from '@/utils/ivaUtils';

export interface SaleFormData {
  cart: SaleItem[];
  advisorId: string;
  paymentMethodId: string;
  discount: number;
  customerName: string;
  customerDocument: string;
  customerPhone: string;
  subtotal: number;
  totalIVA: number;
  total: number;
}

interface Props {
  open: boolean;
  editingSale: Sale | null;
  products: Product[];
  advisors: Advisor[];
  paymentMethods: PaymentMethod[];
  taxSettings: TaxSettings;
  onSave: (data: SaleFormData) => void;
  onClose: () => void;
}

export default function SaleFormDialog({ open, editingSale, products, advisors, paymentMethods, taxSettings, onSave, onClose }: Props) {
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [customPrice, setCustomPrice] = useState<{ [key: string]: number }>({});
  const [selectedAdvisor, setSelectedAdvisor] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [discount, setDiscount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerDocument, setCustomerDocument] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editingSale) {
      setCart(editingSale.items);
      setSelectedAdvisor(editingSale.advisorId);
      setSelectedPaymentMethod(editingSale.paymentMethod.id);
      setDiscount(editingSale.discount || 0);
      setCustomerName(editingSale.customerName || '');
      setCustomerDocument(editingSale.customerDocument || '');
      setCustomerPhone(editingSale.customerPhone || '');
      setCustomerEmail('');
    } else {
      resetForm();
    }
  }, [open, editingSale]);

  const resetForm = () => {
    setCart([]); setCustomPrice({}); setSelectedAdvisor(''); setSelectedPaymentMethod('');
    setDiscount(0); setSearchTerm('');
    setCustomerName(''); setCustomerDocument(''); setCustomerPhone(''); setCustomerEmail('');
  };

  const subtotal = Math.round(cart.reduce((sum, item) => sum + item.total, 0));
  const totalIVA = Math.round(cart.reduce((sum, item) => sum + (item.ivaAmount || 0), 0));
  const total = Math.round(subtotal - discount);

  const addToCart = (product: Product, quantity = 1) => {
    if (product.stock < quantity) { toast.error(`Stock insuficiente. Solo hay ${product.stock} unidades disponibles.`); return; }
    const price = customPrice[product.id] || product.currentPrice;
    const { hasIva, ivaAmount } = calculateItemIVA(product, price, quantity, taxSettings);
    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === product.id);
      if (idx >= 0) {
        const newQty = prev[idx].quantity + quantity;
        if (newQty > product.stock) { toast.error(`Stock insuficiente. Solo hay ${product.stock} unidades disponibles.`); return prev; }
        const iva = calculateItemIVA(product, prev[idx].unitPrice, newQty, taxSettings);
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: newQty, total: newQty * updated[idx].unitPrice, hasIva: iva.hasIva, ivaAmount: iva.ivaAmount };
        return updated;
      }
      return [...prev, { productId: product.id, productName: product.name, quantity, unitPrice: price, total: quantity * price, cost: product.cost, description: product.name, hasIva, ivaAmount }];
    });
  };

  const updateQuantity = (productId: string, qty: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    if (qty <= 0) { removeFromCart(productId); return; }
    if (qty > product.stock) { toast.error(`Stock insuficiente. Solo hay ${product.stock} unidades disponibles.`); return; }
    setCart(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      const { hasIva, ivaAmount } = calculateItemIVA(product, item.unitPrice, qty, taxSettings);
      return { ...item, quantity: qty, total: qty * item.unitPrice, hasIva, ivaAmount };
    }));
  };

  const updatePrice = (productId: string, newPrice: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    setCustomPrice(prev => ({ ...prev, [productId]: newPrice }));
    setCart(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      const { hasIva, ivaAmount } = calculateItemIVA(product, newPrice, item.quantity, taxSettings);
      return { ...item, unitPrice: newPrice, total: item.quantity * newPrice, hasIva, ivaAmount };
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
    setCustomPrice(prev => { const n = { ...prev }; delete n[productId]; return n; });
  };

  const handleSearch = (value: string) => {
    const byBarcode = products.find(p => p.barcode === value);
    if (byBarcode) { addToCart(byBarcode); setSearchTerm(''); toast.success(`${byBarcode.name} agregado al carrito`); return; }
    const byRef = products.filter(p => p.reference.toLowerCase().includes(value.toLowerCase()) || p.name.toLowerCase().includes(value.toLowerCase()));
    if (byRef.length === 1) { addToCart(byRef[0]); setSearchTerm(''); toast.success(`${byRef[0].name} agregado al carrito`); return; }
    toast.error('Producto no encontrado');
  };

  const handleSave = () => {
    if (cart.length === 0) { toast.error('El carrito está vacío'); return; }
    if (!selectedAdvisor || !selectedPaymentMethod) { toast.error('Selecciona un asesor y método de pago'); return; }
    if (discount < 0) { toast.error('El descuento no puede ser negativo'); return; }
    if (discount > subtotal) { toast.error('El descuento no puede superar el subtotal'); return; }
    if (!paymentMethods.find(pm => pm.id === selectedPaymentMethod)) { toast.error('Método de pago no válido'); return; }
    onSave({ cart, advisorId: selectedAdvisor, paymentMethodId: selectedPaymentMethod, discount, customerName: customerName.trim(), customerDocument: customerDocument.trim(), customerPhone: customerPhone.trim(), subtotal, totalIVA, total });
    resetForm();
  };

  const handleClose = () => { resetForm(); onClose(); };

  const availableProducts = products.filter(p =>
    p.stock > 0 && (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm)
    )
  ).slice(0, 6);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingSale ? 'Editar Venta' : 'Nueva Venta'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel izquierdo */}
          <div className="space-y-4">
            <div>
              <Label>Búsqueda de Productos</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Código de barras o referencia..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && searchTerm) handleSearch(searchTerm); }}
                  />
                </div>
                <Button onClick={() => searchTerm && handleSearch(searchTerm)} disabled={!searchTerm}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
              {availableProducts.map(product => (
                <Card key={product.id} className="cursor-pointer hover:bg-gray-50" onClick={() => addToCart(product)}>
                  <CardContent className="p-3">
                    <div className="text-sm font-medium">{product.name}</div>
                    <div className="text-xs text-gray-600">{product.reference}</div>
                    <div className="flex justify-between items-center mt-2">
                      <Badge variant="secondary">{product.stock} unid.</Badge>
                      <span className="text-sm font-bold">${product.currentPrice.toLocaleString('es-CO')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Panel derecho */}
          <div className="space-y-4">
            <div>
              <Label>Carrito de Compras</Label>
              <div className="border rounded-lg max-h-96 overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">Carrito vacío</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Producto</TableHead>
                        <TableHead className="w-[80px]">Cant.</TableHead>
                        <TableHead className="w-[100px]">Precio</TableHead>
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
                              <Button size="sm" variant="outline" onClick={() => updateQuantity(item.productId, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <Button size="sm" variant="outline" onClick={() => updateQuantity(item.productId, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={item.unitPrice.toLocaleString('es-CO')}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                                updatePrice(item.productId, Number(raw) || 0);
                              }}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>${item.total.toLocaleString('es-CO')}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => removeFromCart(item.productId)}>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Asesor</Label>
                    <Select value={selectedAdvisor} onValueChange={setSelectedAdvisor}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar asesor" /></SelectTrigger>
                      <SelectContent>
                        {advisors.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Método de Pago</Label>
                    <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                      <SelectTrigger><SelectValue placeholder="Método de pago" /></SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <Label className="text-sm font-medium">Información del Cliente (Opcional)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Nombre</Label>
                      <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nombre del cliente" />
                    </div>
                    <div>
                      <Label className="text-xs">Cédula/NIT</Label>
                      <Input value={customerDocument} onChange={(e) => setCustomerDocument(e.target.value)} placeholder="Documento" />
                    </div>
                    <div>
                      <Label className="text-xs">Teléfono</Label>
                      <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Teléfono" />
                    </div>
                    <div>
                      <Label className="text-xs">Email</Label>
                      <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Email" />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Descuento</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={discount ? discount.toLocaleString('es-CO') : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                      setDiscount(Number(raw) || 0);
                    }}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2 border-t pt-4">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${subtotal.toLocaleString('es-CO')}</span>
                  </div>
                  {totalIVA > 0 && taxSettings.ivaEnabled && (
                    <div className="flex justify-between text-gray-600">
                      <span>IVA ({taxSettings.ivaPercentage}%):</span>
                      <span>${totalIVA.toLocaleString('es-CO')}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Descuento:</span>
                      <span>-${discount.toLocaleString('es-CO')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>${total.toLocaleString('es-CO')}</span>
                  </div>
                </div>

                <Button className="w-full" onClick={handleSave} disabled={cart.length === 0}>
                  <Calculator className="h-4 w-4 mr-2" />
                  {editingSale ? 'Actualizar Venta' : 'Completar Venta'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
