import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Minus, Trash2 } from 'lucide-react';
import { Product, SaleItem, PaymentMethod } from '@/types';
import { calculateItemIVA } from '@/utils/ivaUtils';
import { fmtMoneyInput, parseMoney } from '@/utils/formatters';

type CartItem = SaleItem & { unitPriceStr?: string };

export interface CreateQuoteFormData {
  advisorId: string;
  type: 'quote' | 'reserved';
  items: SaleItem[];
  totalIVA: number;
  paymentMethodId?: string;
  deposit?: number;
  customerName?: string;
  customerDocument?: string;
  customerPhone?: string;
}

interface TaxSettings {
  ivaEnabled: boolean;
  ivaPercentage: number;
  ivaAppliesTo: string;
}

interface Advisor { id: string; name: string }

interface Props {
  open: boolean;
  products: Product[];
  advisors: Advisor[];
  paymentMethods: PaymentMethod[];
  taxSettings: TaxSettings;
  onClose: () => void;
  onSave: (data: CreateQuoteFormData) => void;
}

export default function CreateQuoteDialog({ open, products, advisors, paymentMethods, taxSettings, onClose, onSave }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAdvisor, setSelectedAdvisor] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quoteType, setQuoteType] = useState<'quote' | 'reserved'>('quote');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('');
  const [deposit, setDeposit] = useState<number>(0);
  const [depositStr, setDepositStr] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerDocument, setCustomerDocument] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const availableProducts = useMemo(() =>
    products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm)
    ).slice(0, 8),
  [products, searchTerm]);

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const totalIVA = cart.reduce((sum, item) => sum + (item.ivaAmount || 0), 0);

  const addToCart = (product: Product) => {
    const idx = cart.findIndex(item => item.productId === product.id);
    const { hasIva, ivaAmount } = calculateItemIVA(product, product.currentPrice, 1, taxSettings);
    if (idx >= 0) {
      const existing = cart[idx];
      const newQty = existing.quantity + 1;
      const newIVA = calculateItemIVA(product, existing.unitPrice, newQty, taxSettings);
      setCart(cart.map((item, i) => i === idx
        ? { ...item, quantity: newQty, total: newQty * item.unitPrice, hasIva: newIVA.hasIva, ivaAmount: newIVA.ivaAmount }
        : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id, productName: product.name, description: product.description,
        cost: product.cost, quantity: 1, unitPrice: product.currentPrice,
        total: product.currentPrice, hasIva, ivaAmount,
        unitPriceStr: product.currentPrice.toLocaleString('es-CO'),
      }]);
    }
  };

  const updateQty = (productId: string, newQty: number) => {
    if (newQty <= 0) { setCart(cart.filter(item => item.productId !== productId)); return; }
    const product = products.find(p => p.id === productId);
    if (!product) return;
    setCart(cart.map(item => {
      if (item.productId !== productId) return item;
      const { hasIva, ivaAmount } = calculateItemIVA(product, item.unitPrice, newQty, taxSettings);
      return { ...item, quantity: newQty, total: newQty * item.unitPrice, hasIva, ivaAmount };
    }));
  };

  const updatePrice = (productId: string, newPrice: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    setCart(cart.map(item => {
      if (item.productId !== productId) return item;
      const { hasIva, ivaAmount } = calculateItemIVA(product, newPrice, item.quantity, taxSettings);
      return { ...item, unitPrice: newPrice, total: item.quantity * newPrice, hasIva, ivaAmount };
    }));
  };

  const updatePriceStr = (productId: string, raw: string) => {
    const f = fmtMoneyInput(raw);
    const price = parseMoney(f);
    const product = products.find(p => p.id === productId);
    if (!product) return;
    setCart(cart.map(item => {
      if (item.productId !== productId) return item;
      const { hasIva, ivaAmount } = calculateItemIVA(product, price, item.quantity, taxSettings);
      return { ...item, unitPriceStr: f, unitPrice: price, total: item.quantity * price, hasIva, ivaAmount };
    }));
  };

  const reset = () => {
    setCart([]); setSelectedAdvisor(''); setSelectedPaymentMethodId('');
    setDeposit(0); setDepositStr(''); setCustomerName(''); setCustomerDocument(''); setCustomerPhone('');
    setQuoteType('quote'); setSearchTerm('');
  };

  const handleSave = () => {
    onSave({
      advisorId: selectedAdvisor,
      type: quoteType,
      items: cart,
      totalIVA,
      ...(quoteType === 'reserved' ? {
        paymentMethodId: selectedPaymentMethodId,
        deposit,
        customerName: customerName || undefined,
        customerDocument: customerDocument || undefined,
        customerPhone: customerPhone || undefined,
      } : {}),
    });
    reset();
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Cotización/Separado</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={quoteType} onValueChange={(v: 'quote' | 'reserved') => setQuoteType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quote">Cotización</SelectItem>
                  <SelectItem value="reserved">Separado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Asesor</Label>
              <Select value={selectedAdvisor} onValueChange={setSelectedAdvisor}>
                <SelectTrigger><SelectValue placeholder="Seleccionar asesor" /></SelectTrigger>
                <SelectContent>
                  {advisors.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {quoteType === 'reserved' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Método de Pago</Label>
                <Select value={selectedPaymentMethodId} onValueChange={setSelectedPaymentMethodId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar método" /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods.filter(pm => pm.isActive).map(pm => (
                      <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Abono</Label>
                <Input type="text" inputMode="numeric" value={depositStr} onChange={e => { const f = fmtMoneyInput(e.target.value); setDepositStr(f); setDeposit(parseMoney(f)); }} placeholder="0" />
              </div>
              <div>
                <Label>Nombre del Cliente</Label>
                <Input placeholder="Nombre completo" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div>
                <Label>Documento</Label>
                <Input placeholder="CC/NIT" value={customerDocument} onChange={e => setCustomerDocument(e.target.value)} />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input placeholder="Celular" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <Label>Buscar Productos</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input placeholder="Buscar por nombre, referencia..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
            {availableProducts.map(product => (
              <Card key={product.id} className="cursor-pointer hover:bg-gray-50" onClick={() => addToCart(product)}>
                <CardContent className="p-2">
                  <div className="text-xs font-medium">{product.name}</div>
                  <div className="text-xs text-gray-600">{product.reference}</div>
                  <div className="text-xs font-bold mt-1">${product.currentPrice.toLocaleString('es-CO')}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            <Label>Productos Seleccionados</Label>
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="p-4 text-center text-gray-500">Sin productos seleccionados</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map(item => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" onClick={() => updateQty(item.productId, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button size="sm" variant="outline" onClick={() => updateQty(item.productId, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input type="text" inputMode="numeric" value={item.unitPriceStr ?? item.unitPrice.toLocaleString('es-CO')} onChange={e => updatePriceStr(item.productId, e.target.value)} className="w-20" />
                        </TableCell>
                        <TableCell>${item.total.toLocaleString('es-CO')}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => setCart(cart.filter(c => c.productId !== item.productId))}>
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

          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${subtotal.toLocaleString('es-CO')}</span>
            </div>
            {totalIVA > 0 && taxSettings.ivaEnabled && (
              <div className="flex justify-between text-gray-600 text-sm">
                <span>IVA ({taxSettings.ivaPercentage}% incluido):</span>
                <span>${totalIVA.toLocaleString('es-CO')}</span>
              </div>
            )}
            <div className="flex justify-between items-center font-bold text-lg pt-2 border-t">
              <span>Total:</span>
              <span>${subtotal.toLocaleString('es-CO')}</span>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleSave}>Crear {quoteType === 'quote' ? 'Cotización' : 'Separado'}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
