import { useState, useMemo, useEffect } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSales } from '@/hooks/useSales';
import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Minus, Trash2, Calculator, Calendar, Printer } from 'lucide-react';
import { Product, SaleItem} from '@/types';
import { toast } from 'sonner';
import { printPOSInvoice } from '@/utils/printUtils';

export default function Sales() {
  const { products, findProductByBarcode, updateStock } = useInventory();
  const { sales, addSale, advisors, paymentMethods, updateSale } = useSales();
  const { companyInfo, taxSettings } = useSettings();
  
  const [isCreatingSale, setIsCreatingSale] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAdvisor, setSelectedAdvisor] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [discount, setDiscount] = useState(0);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [customPrice, setCustomPrice] = useState<{[key: string]: number}>({});

  // helper: convierte Date -> 'YYYY-MM-DD'
  const toKey = (d: Date | string) => {
    const date = new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  // Fecha seleccionada en formato local YYYY-MM-DD 
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  });

  // --- Preparar array con abonos realizados EN selectedDate ---
  // agrupados por sale.id + paymentMethod.id (para que métodos distintos sean filas separadas)
  const depositsGroupedForDay = useMemo(() => {
  const map = new Map<string, {
    key: string;
    saleId: string;
    saleNumber: string;
    advisorName: string;
    description: string;
    paymentMethodId: string;
    paymentMethodName: string;
    dayDepositSum: number;        // suma abonos del día (para este sale+method)
    totalPaidAllTime: number;     // total acumulado histórico (deposits[])
    saleTotal: number;
    initialDeposit: number;       // si existe sale.deposit como fallback
  }>();

    // recorrer todas las ventas (o usa getSalesByDate si prefieres filtrar antes)
    sales.forEach(sale => {
    const saleDescription = (sale.items || []).map(i => i.productName).join(', ');
    const saleTotal = sale.total ?? 0;

          
    // 1) Si hay deposits[] -> procesar cada deposit cuya createdAt === selectedDate
    const totalPaidAllTime = (sale.deposits ?? []).reduce((sum, d) => sum + (d.amount ?? 0), 0) || sale.deposit || 0;

    (sale.deposits ?? []).forEach(dep => {
      if (toKey(dep.createdAt) !== selectedDate) return;
      const methodId = dep.method?.id ?? sale.paymentMethod?.id ?? 'unknown';
      const key = `${sale.id}::${methodId}`;
      const existing = map.get(key);
      if (existing) {
        existing.dayDepositSum += (dep.amount ?? 0);
      } else {
        map.set(key, {
          key,
          saleId: sale.id,
          saleNumber: sale.saleNumber,
          advisorName: sale.advisorName,
          description: saleDescription,
          paymentMethodId: methodId,
          paymentMethodName: dep.method?.name ?? sale.paymentMethod?.name ?? '-',
          dayDepositSum: dep.amount ?? 0,
          totalPaidAllTime,
          saleTotal,
          initialDeposit: sale.deposit ?? 0
        });
      }
    });

    // 2) Caso fallback: si no hay deposits[] pero existe sale.deposit y fue creado hoy
    if ((sale.deposits ?? []).length === 0 && (sale.deposit ?? 0) > 0 && toKey(sale.createdAt) === selectedDate) {
      const methodId = sale.paymentMethod?.id ?? 'unknown';
      const key = `${sale.id}::${methodId}`;
      const existing = map.get(key);
      if (existing) {
        existing.dayDepositSum += (sale.deposit ?? 0);
      } else {
        map.set(key, {
          key,
          saleId: sale.id,
          saleNumber: sale.saleNumber,
          advisorName: sale.advisorName,
          description: saleDescription,
          paymentMethodId: methodId,
          paymentMethodName: sale.paymentMethod?.name ?? '-',
          dayDepositSum: sale.deposit ?? 0,
          totalPaidAllTime: sale.deposit ?? 0,
          saleTotal,
          initialDeposit: sale.deposit ?? 0
        });
      }
    }
  });

  return Array.from(map.values());
}, [sales, selectedDate]);

  // Opcional: si quieres marcar automáticamente como completed cuando el histórico >= total
  useEffect(() => {
    depositsGroupedForDay.forEach(entry => {
      if ((entry.totalPaidAllTime ?? 0) >= (entry.saleTotal ?? 0)) {
        try {
          updateSale(entry.saleId, { status: 'completed' });
        } catch (e) {
          // si updateSale no existe o falla, lo ignoramos
          // console.warn('No se pudo actualizar sale a completed', e);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositsGroupedForDay]);

  // ----------------------- carrito / venta -----------------------
  const calculateItemIVA = (product: Product, unitPrice: number, quantity: number) => {
    if (!taxSettings.ivaEnabled) {
      return { hasIva: false, ivaAmount: 0 };
    }

    // Si el producto tiene IVA incluido, calculamos el IVA del precio
    if (product.hasIva) {
      const ivaRate = taxSettings.ivaPercentage / 100;
      const priceWithoutIva = unitPrice / (1 + ivaRate);
      const ivaPerUnit = unitPrice - priceWithoutIva;
      return { hasIva: true, ivaAmount: ivaPerUnit * quantity };
    }

    return { hasIva: false, ivaAmount: 0 };
  };

  const addToCart = (product: Product, quantity: number = 1) => {
    if (product.stock < quantity) {
      toast.error(`Stock insuficiente. Solo hay ${product.stock} unidades disponibles.`);
      return;
    }
    const existingItemIndex = cart.findIndex(item => item.productId === product.id);
    const currentPrice = customPrice[product.id] || product.currentPrice;
    const { hasIva, ivaAmount } = calculateItemIVA(product, currentPrice, quantity);

    if (existingItemIndex >= 0) {
      const existingItem = cart[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.stock) {
        toast.error(`Stock insuficiente. Solo hay ${product.stock} unidades disponibles.`);
        return;
      }
      const newIVA = calculateItemIVA(product, currentPrice, newQuantity);
      const updatedCart = [...cart];
      updatedCart[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        unitPrice: currentPrice,
        total: newQuantity * currentPrice,
        hasIva: newIVA.hasIva,
        ivaAmount: newIVA.ivaAmount
      };
      setCart(updatedCart);
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice: currentPrice,
        total: quantity * currentPrice,
        cost: product.cost,
        description: product.name,
        hasIva,
        ivaAmount
      }]);
    }
  };

  const updateCartItemQuantity = (productId: string, newQuantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    if (newQuantity <= 0) { removeFromCart(productId); return; }
    if (newQuantity > product.stock) { toast.error(`Stock insuficiente. Solo hay ${product.stock} unidades disponibles.`); return; }

    setCart(cart.map(item => {
      if (item.productId === productId) {
        const { hasIva, ivaAmount } = calculateItemIVA(product, item.unitPrice, newQuantity);
        return {
          ...item,
          quantity: newQuantity,
          total: newQuantity * item.unitPrice,
          hasIva,
          ivaAmount
        };
      }
      return item;
    }));
  };

  const updateCartItemPrice = (productId: string, newPrice: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setCustomPrice({...customPrice, [productId]: newPrice});
    setCart(cart.map(item => {
      if (item.productId === productId) {
        const { hasIva, ivaAmount } = calculateItemIVA(product, newPrice, item.quantity);
        return {
          ...item,
          unitPrice: newPrice,
          total: item.quantity * newPrice,
          hasIva,
          ivaAmount
        };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
    const newCustomPrice = {...customPrice};
    delete newCustomPrice[productId];
    setCustomPrice(newCustomPrice);
  };

  const handleProductSearch = (searchValue: string) => {
    let foundProduct = findProductByBarcode(searchValue);
    if (!foundProduct) {
      const productsByReference = products.filter(p => p.reference.toLowerCase().includes(searchValue.toLowerCase()) || p.name.toLowerCase().includes(searchValue.toLowerCase()));
      if (productsByReference.length === 1) foundProduct = productsByReference[0];
    }
    if (foundProduct) {
      addToCart(foundProduct);
      setSearchTerm('');
      toast.success(`${foundProduct.name} agregado al carrito`);
    } else toast.error('Producto no encontrado');
  };

  const subtotal = Math.round(cart.reduce((sum, item) => sum + item.total, 0));
  const totalIVA = Math.round(cart.reduce((sum, item) => sum + (item.ivaAmount || 0), 0));
  const total = Math.round(subtotal - discount);

  const completeSale = () => {
    if (cart.length === 0) { toast.error('El carrito está vacío'); return; }
    if (!selectedAdvisor || !selectedPaymentMethod) { toast.error('Selecciona un asesor y método de pago'); return; }
    const paymentMethod = paymentMethods.find(pm => pm.id === selectedPaymentMethod);
    if (!paymentMethod) { toast.error('Método de pago no válido'); return; }
    for (const item of cart) {
      const product = products.find(p => p.id === item.productId);
      if (!product || product.stock < item.quantity) { toast.error(`Stock insuficiente para ${item.productName}`); return; }
    }
    const sale = addSale({
      advisorId: selectedAdvisor,
      items: cart,
      paymentMethod,
      discount,
      type: 'sale',
      ivaTotal: totalIVA
    });
    cart.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) updateStock(item.productId, product.stock - item.quantity);
    });
    toast.success(`Venta ${sale.saleNumber} completada exitosamente`);

    // Imprimir factura automáticamente
    printPOSInvoice(sale, companyInfo);

    setCart([]); setCustomPrice({}); setSelectedAdvisor(''); setSelectedPaymentMethod(''); setDiscount(0); setIsCreatingSale(false);
  };

  const availableProducts = products.filter(product =>
    product.stock > 0 && (
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm)
    )
  ).slice(0, 6);



  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-4">Ventas Diarias</h1>
        </div>
          <div className="flex justify-between items-center mb-6">
        <div>          
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
        </div>
      </div>
         
        <Dialog open={isCreatingSale} onOpenChange={setIsCreatingSale}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Venta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva Venta</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Panel izquierdo - Búsqueda y productos */}
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && searchTerm) {
                            handleProductSearch(searchTerm);
                          }
                        }}
                      />
                    </div>
                    <Button 
                      onClick={() => searchTerm && handleProductSearch(searchTerm)}
                      disabled={!searchTerm}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
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
                        <div className="text-sm font-medium">{product.name}</div>
                        <div className="text-xs text-gray-600">{product.reference}</div>
                        <div className="flex justify-between items-center mt-2">
                          <Badge variant="secondary">{product.stock} unid.</Badge>
                          <span className="text-sm font-bold">
                            ${product.currentPrice.toLocaleString('es-CO')}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Panel derecho - Carrito */}
              <div className="space-y-4">
                <div>
                  <Label>Carrito de Compras</Label>
                  <div className="border rounded-lg max-h-96 overflow-y-auto">
                    {cart.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        Carrito vacío
                      </div>
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
                                  value={item.unitPrice}
                                  onChange={(e) => updateCartItemPrice(item.productId, parseFloat(e.target.value) || 0)}
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
                                  onClick={() => removeFromCart(item.productId)}
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

                {/* Resumen de venta */}
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Asesor</Label>
                        <Select value={selectedAdvisor} onValueChange={setSelectedAdvisor}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar asesor" />
                          </SelectTrigger>
                          <SelectContent>
                            {advisors.map(advisor => (
                              <SelectItem key={advisor.id} value={advisor.id}>
                                {advisor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </div>
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
                          </SelectContent>75095213
                      </Select>
                      </div>
                    </div>
                    <div>
                        <Label>Descuento</Label>
                      <Input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
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

                    <Button 
                      className="w-full" 
                      onClick={completeSale}
                      disabled={cart.length === 0}>
                      <Calculator className="h-4 w-4 mr-2" />
                      Completar Venta
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
       <Card>
        <ScrollArea className="h-[51rem] p-6">
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 bg-white z-10">Fecha</TableHead>
                  <TableHead className="sticky top-0 bg-white z-10">Asesor</TableHead>
                  <TableHead className="sticky top-0 bg-white z-10">Descripción</TableHead>
                  <TableHead className="sticky top-0 bg-white z-10">Cantidad</TableHead>
                  <TableHead className="sticky top-0 bg-white z-10">Costo</TableHead>
                  <TableHead className="sticky top-0 bg-white z-10">Venta & Abonos</TableHead>
                  <TableHead className="sticky top-0 bg-white z-10">Utilidad</TableHead>
                  <TableHead className="sticky top-0 bg-white z-10">Estado</TableHead>
                  <TableHead className="sticky top-0 bg-white z-10">Método</TableHead>
                  <TableHead className="sticky top-0 bg-white z-10">Acciones</TableHead>
                </TableRow>

              </TableHeader>

                <TableBody>
                  {/*  Filas para abonos realizados hoy (agrupados por sale + método) */}
                  {depositsGroupedForDay.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-gray-500">
                        No hay abonos en la fecha seleccionada
                      </TableCell>
                    </TableRow>
                  ) : (
                    depositsGroupedForDay.map(entry => {
                      const isCompleted = (entry.totalPaidAllTime ?? 0) >= (entry.saleTotal ?? 0);
                      const fullSale = sales.find(s => s.id === entry.saleId);

                      return (
                        <TableRow key={entry.key}>
                          <TableCell>{selectedDate}</TableCell>
                          <TableCell>{entry.advisorName}</TableCell>
                          <TableCell>{`Abono - ${entry.description}`}</TableCell>
                          <TableCell>{/* Costo (si lo quieres aquí) */}</TableCell>

                          {/* Valor venta (total del separado)
                          <TableCell>${(entry.saleTotal ?? 0).toLocaleString('es-CO')}</TableCell>*/}
                          <TableCell>-</TableCell>

                          {/* Abono del día */}
                          <TableCell className="text-blue-600">${(entry.dayDepositSum ?? 0).toLocaleString('es-CO')}</TableCell>

                          {/* Total abonado hasta ahora (historico) */}
                          {/*<TableCell className="font-medium">${(entry.totalPaidAllTime ?? 0).toLocaleString('es-CO')}</TableCell>*/}

                          {/* Saldo restante
                          <TableCell className="text-red-600 font-bold">${remaining.toLocaleString('es-CO')}</TableCell>*/}
                          <TableCell></TableCell>
                          {/* Estado / Tipo */}
                          <TableCell>{isCompleted ? 'CANCELADO' : 'SEPARADO'}</TableCell>

                          {/* Método de pago */}
                          <TableCell>{entry.paymentMethodName}</TableCell>

                          {/* Acciones - Botón de imprimir */}
                          <TableCell>
                            {fullSale && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => printPOSInvoice(fullSale, companyInfo)}
                                title="Reimprimir factura"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}

                  {/*  Filas para ventas normales del día (una fila por item) */}
                  {sales
                    .filter(s => toKey(s.createdAt) === selectedDate && s.type === 'sale')
                    .flatMap(sale =>
                      sale.items.map((item, index) => {
                        const rent = (item.total ?? 0) - ((item.cost ?? 0) * (item.quantity ?? 0));
                        const isFirstItem = index === 0;
                        return (
                          <TableRow key={`${sale.id}-${item.productId}`}>
                            <TableCell>{toKey(sale.createdAt)}</TableCell>
                            <TableCell>{sale.advisorName}</TableCell>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>${(item.cost ?? 0).toLocaleString('es-CO')}</TableCell>
                            <TableCell>${(item.total ?? 0).toLocaleString('es-CO')}</TableCell>
                            <TableCell colSpan={2} className="text-green-600 font-bold">
                              ${rent.toLocaleString('es-CO')}
                            </TableCell>
                            <TableCell>{sale.paymentMethod?.name ?? '-'}</TableCell>
                            <TableCell>
                              {isFirstItem && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => printPOSInvoice(sale, companyInfo)}
                                  title="Reimprimir factura"
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                </TableBody>
            </Table>
          </CardContent>
        </ScrollArea>
      </Card>
    </div>
  );
}