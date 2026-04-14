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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Plus, Search, Minus, Trash2, Calculator, Calendar, Printer, Edit2, RotateCcw } from 'lucide-react';
import { Product, SaleItem, Sale} from '@/types';
import { toast } from 'sonner';
import { printPOSInvoice } from '@/utils/printUtils';
import { useAuth } from '@/contexts/AuthContext';
import { calculateItemIVA, calculateCardCommission } from '@/utils/ivaUtils';
import { useReturns } from '@/hooks/useReturns';

export default function Sales() {
  const { isAdmin } = useAuth();
  const { products, findProductByBarcode, updateStock } = useInventory();
  const { sales, addSale, advisors, paymentMethods, updateSale, deleteSale } = useSales();
  const { companyInfo, taxSettings, cardSettings, updateBankBalance, banks } = useSettings();
  const { addReturn } = useReturns();
  
  const [isCreatingSale, setIsCreatingSale] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAdvisor, setSelectedAdvisor] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [discount, setDiscount] = useState(0);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [customPrice, setCustomPrice] = useState<{[key: string]: number}>({});

  // Información del cliente
  const [customerName, setCustomerName] = useState('');
  const [customerDocument, setCustomerDocument] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Estados para editar venta
  const [isEditingSale, setIsEditingSale] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);

  // Estados para devolución
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [returningSale, setReturningSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<{[productId: string]: number}>({});
  const [returnReason, setReturnReason] = useState('');
  const [returnPaymentMethodId, setReturnPaymentMethodId] = useState('');

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
  const addToCart = (product: Product, quantity: number = 1) => {
    if (product.stock < quantity) {
      toast.error(`Stock insuficiente. Solo hay ${product.stock} unidades disponibles.`);
      return;
    }
    const existingItemIndex = cart.findIndex(item => item.productId === product.id);
    const currentPrice = customPrice[product.id] || product.currentPrice;
    const { hasIva, ivaAmount } = calculateItemIVA(product, currentPrice, quantity, taxSettings);

    if (existingItemIndex >= 0) {
      const existingItem = cart[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.stock) {
        toast.error(`Stock insuficiente. Solo hay ${product.stock} unidades disponibles.`);
        return;
      }
      const newIVA = calculateItemIVA(product, currentPrice, newQuantity, taxSettings);
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
        const { hasIva, ivaAmount } = calculateItemIVA(product, item.unitPrice, newQuantity, taxSettings);
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
        const { hasIva, ivaAmount } = calculateItemIVA(product, newPrice, item.quantity, taxSettings);
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
    const { commission, commissionAmount, reteivaAmount } = calculateCardCommission(
      paymentMethod.name, paymentMethod.type, total, cardSettings
    );
    const sale = addSale({
      advisorId: selectedAdvisor,
      items: cart,
      paymentMethod,
      discount,
      type: 'sale',
      ivaTotal: totalIVA,
      commission: commission || undefined,
      commissionAmount: commissionAmount || undefined,
      reteivaAmount: reteivaAmount || undefined,
      customerName: customerName.trim() || undefined,
      customerDocument: customerDocument.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined
    });
    cart.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) updateStock(item.productId, product.stock - item.quantity);
    });

    // Actualizar el banco correspondiente al método de pago
    if (paymentMethod) {
      // Mapeo de métodos de pago a bancos
      const paymentToBankMap: { [key: string]: string } = {
        '1': 'efectivo',           // Efectivo
        '2': 'colpatria',          // Tarjeta Débito -> Colpatria
        '3': 'colpatria',          // Tarjeta Crédito -> Colpatria
        '4': 'bbva',               // Transferencia -> BBVA
        '5': 'nequi',              // Nequi
        '6': 'daviplata',          // Daviplata
        '7': 'bbva',               // Transfiya -> BBVA
        // Créditos externos no afectan bancos
        '8': null,                 // Sistecredito
        '9': null,                 // Addi
        '10': null                 // Esmiopcion
      };

      const mappedBankId = paymentToBankMap[paymentMethod.id];

      // Solo actualizar si no es crédito externo
      if (mappedBankId !== null && mappedBankId !== undefined) {
        const bankExists = banks.find(b => b.id === mappedBankId);
        if (bankExists) {
          updateBankBalance(mappedBankId, total);
        }
      }
    }

    toast.success(`Venta ${sale.saleNumber} completada exitosamente`);

    // Imprimir factura automáticamente
    printPOSInvoice(sale, companyInfo);

    setCart([]); setCustomPrice({}); setSelectedAdvisor(''); setSelectedPaymentMethod(''); setDiscount(0);
    setCustomerName(''); setCustomerDocument(''); setCustomerPhone(''); setCustomerEmail('');
    setIsCreatingSale(false);
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSaleId(sale.id);
    setCart(sale.items);
    setSelectedAdvisor(sale.advisorId);
    setSelectedPaymentMethod(sale.paymentMethod.id);
    setDiscount(sale.discount || 0);
    setCustomerName(sale.customerName || '');
    setCustomerDocument(sale.customerDocument || '');
    setCustomerPhone(sale.customerPhone || '');
    setIsEditingSale(true);
    setIsCreatingSale(true);
  };

  const handleUpdateSale = () => {
    if (!editingSaleId) return;
    if (cart.length === 0) { toast.error('El carrito está vacío'); return; }
    if (!selectedAdvisor || !selectedPaymentMethod) { toast.error('Selecciona un asesor y método de pago'); return; }

    const paymentMethod = paymentMethods.find(pm => pm.id === selectedPaymentMethod);
    if (!paymentMethod) { toast.error('Método de pago no válido'); return; }

    // Obtener la venta original
    const originalSale = sales.find(s => s.id === editingSaleId);
    if (!originalSale) { toast.error('Venta no encontrada'); return; }

    // Revertir stock de la venta original
    originalSale.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) updateStock(item.productId, product.stock + item.quantity);
    });

    // Verificar stock para los nuevos items
    for (const item of cart) {
      const product = products.find(p => p.id === item.productId);
      if (!product || product.stock < item.quantity) {
        toast.error(`Stock insuficiente para ${item.productName}`);
        // Revertir el stock que ya habíamos devuelto
        originalSale.items.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          if (product) updateStock(item.productId, product.stock - item.quantity);
        });
        return;
      }
    }

    // Aplicar nuevo stock
    cart.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) updateStock(item.productId, product.stock - item.quantity);
    });

    // Actualizar la venta
    updateSale(editingSaleId, {
      advisorId: selectedAdvisor,
      advisorName: advisors.find(a => a.id === selectedAdvisor)?.name || '',
      items: cart,
      paymentMethod,
      discount,
      subtotal: subtotal,
      total: total,
      ivaTotal: totalIVA,
      customerName: customerName.trim() || undefined,
      customerDocument: customerDocument.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined
    });

    toast.success('Venta actualizada exitosamente');

    setCart([]); setCustomPrice({}); setSelectedAdvisor(''); setSelectedPaymentMethod(''); setDiscount(0);
    setCustomerName(''); setCustomerDocument(''); setCustomerPhone(''); setCustomerEmail('');
    setIsCreatingSale(false);
    setIsEditingSale(false);
    setEditingSaleId(null);
  };

  const handleDeleteSale = (sale: Sale) => {
    if (!confirm(`¿Estás seguro de eliminar la venta ${sale.saleNumber}? Esta acción no se puede deshacer.`)) {
      return;
    }

    // Revertir el stock
    sale.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        updateStock(item.productId, product.stock + item.quantity);
      }
    });

    // Revertir el saldo del banco si corresponde
    const paymentToBankMap: { [key: string]: string } = {
      '1': 'efectivo',
      '2': 'colpatria',
      '3': 'colpatria',
      '4': 'bbva',
      '5': 'nequi',
      '6': 'daviplata',
      '7': 'bbva',
      '8': null,
      '9': null,
      '10': null
    };

    const mappedBankId = paymentToBankMap[sale.paymentMethod.id];
    if (mappedBankId !== null && mappedBankId !== undefined) {
      const bankExists = banks.find(b => b.id === mappedBankId);
      if (bankExists) {
        updateBankBalance(mappedBankId, -sale.total); // Restar el monto
      }
    }

    deleteSale(sale.id);
    toast.success('Venta eliminada exitosamente');
  };

  const handleOpenReturn = (sale: Sale) => {
    setReturningSale(sale);
    const initial: {[key: string]: number} = {};
    sale.items.forEach(item => { initial[item.productId] = 0; });
    setReturnItems(initial);
    setReturnReason('');
    setReturnPaymentMethodId('');
    setIsReturnOpen(true);
  };

  const handleConfirmReturn = () => {
    if (!returningSale) return;
    if (!returnReason.trim()) { toast.error('Indica el motivo de la devolución'); return; }
    const itemsToReturn: SaleItem[] = returningSale.items
      .filter(item => (returnItems[item.productId] || 0) > 0)
      .map(item => ({
        ...item,
        quantity: returnItems[item.productId],
        total: returnItems[item.productId] * item.unitPrice,
      }));
    if (itemsToReturn.length === 0) { toast.error('Selecciona al menos un artículo para devolver'); return; }

    const returnPaymentMethod = returnPaymentMethodId
      ? paymentMethods.find(pm => pm.id === returnPaymentMethodId)
      : undefined;

    addReturn({
      saleId: returningSale.id,
      saleNumber: returningSale.saleNumber,
      advisorId: returningSale.advisorId,
      advisorName: returningSale.advisorName,
      items: itemsToReturn,
      reason: returnReason,
      paymentMethod: returnPaymentMethod,
    });

    // Regresar stock al inventario
    itemsToReturn.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) updateStock(item.productId, product.stock + item.quantity);
    });

    // Marcar venta como devuelta si todos los items fueron devueltos
    const allReturned = returningSale.items.every(
      item => (returnItems[item.productId] || 0) >= item.quantity
    );
    if (allReturned) updateSale(returningSale.id, { status: 'returned' });

    toast.success('Devolución registrada exitosamente');
    setIsReturnOpen(false);
    setReturningSale(null);
  };

  const handleCloseDialog = (open: boolean) => {
    setIsCreatingSale(open);
    if (!open) {
      // Resetear estados de edición al cerrar
      setIsEditingSale(false);
      setEditingSaleId(null);
      setCart([]);
      setCustomPrice({});
      setSelectedAdvisor('');
      setSelectedPaymentMethod('');
      setDiscount(0);
      setCustomerName('');
      setCustomerDocument('');
      setCustomerPhone('');
      setCustomerEmail('');
    }
  };

  const availableProducts = products.filter(product =>
    product.stock > 0 && (
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm)
    )
  ).slice(0, 6);

  // Calcular totales del día seleccionado
  const dailyTotals = useMemo(() => {
    // Ventas normales del día
    const salesOfDay = sales.filter(s => toKey(s.createdAt) === selectedDate && s.type === 'sale');

    // Sumar ventas y costos de las ventas normales
    const salesTotal = salesOfDay.reduce((sum, sale) =>
      sum + sale.items.reduce((itemSum, item) => itemSum + (item.total ?? 0), 0), 0
    );

    const costsTotal = salesOfDay.reduce((sum, sale) =>
      sum + sale.items.reduce((itemSum, item) => itemSum + ((item.cost ?? 0) * (item.quantity ?? 0)), 0), 0
    );

    // Sumar abonos del día
    const depositsTotal = depositsGroupedForDay.reduce((sum, entry) =>
      sum + (entry.dayDepositSum ?? 0), 0
    );

    // Total general de ventas (ventas normales + abonos)
    const totalVentas = salesTotal + depositsTotal;

    // Utilidad (ventas - costos)
    const utilidad = totalVentas - costsTotal;

    return {
      totalVentas,
      totalCostos: costsTotal,
      utilidad
    };
  }, [sales, selectedDate, depositsGroupedForDay]);

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
         
        <Dialog open={isCreatingSale} onOpenChange={handleCloseDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Venta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditingSale ? 'Editar Venta' : 'Nueva Venta'}</DialogTitle>
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

                    {/* Información del Cliente */}
                    <div className="border-t pt-4 space-y-3">
                      <Label className="text-sm font-medium">Información del Cliente (Opcional)</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Nombre</Label>
                          <Input
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Nombre del cliente"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Cédula/NIT</Label>
                          <Input
                            value={customerDocument}
                            onChange={(e) => setCustomerDocument(e.target.value)}
                            placeholder="Documento"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Teléfono</Label>
                          <Input
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="Teléfono"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Email</Label>
                          <Input
                            type="email"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            placeholder="Email"
                          />
                        </div>
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
                      onClick={isEditingSale ? handleUpdateSale : completeSale}
                      disabled={cart.length === 0}>
                      <Calculator className="h-4 w-4 mr-2" />
                      {isEditingSale ? 'Actualizar Venta' : 'Completar Venta'}
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
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => printPOSInvoice(sale, companyInfo)}
                                    title="Reimprimir factura"
                                  >
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                  {sale.status !== 'returned' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenReturn(sale)}
                                      title="Registrar devolución"
                                    >
                                      <RotateCcw className="h-4 w-4 text-orange-500" />
                                    </Button>
                                  )}
                                  {isAdmin() && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEditSale(sale)}
                                        title="Editar venta"
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDeleteSale(sale)}
                                        title="Eliminar venta"
                                      >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-gray-100 font-bold">
                    <TableCell colSpan={4} className="text-right">TOTALES DEL DÍA:</TableCell>
                    <TableCell className="text-blue-600">
                      ${dailyTotals.totalCostos.toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell className="text-green-600">
                      ${dailyTotals.totalVentas.toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell colSpan={2} className="text-purple-600">
                      ${dailyTotals.utilidad.toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableFooter>
            </Table>
          </CardContent>
        </ScrollArea>
      </Card>

      {/* Dialog Devolución */}
      <Dialog open={isReturnOpen} onOpenChange={setIsReturnOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Devolución — {returningSale?.saleNumber}</DialogTitle>
          </DialogHeader>
          {returningSale && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Indica las cantidades a devolver por artículo:</p>
              <div className="space-y-2">
                {returningSale.items.map(item => (
                  <div key={item.productId} className="flex items-center justify-between gap-3 p-2 border rounded">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.productName}</p>
                      <p className="text-xs text-gray-500">Vendido: {item.quantity} u. · ${item.unitPrice.toLocaleString('es-CO')}</p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={item.quantity}
                      value={returnItems[item.productId] || 0}
                      onChange={e => setReturnItems(prev => ({ ...prev, [item.productId]: Math.min(Number(e.target.value), item.quantity) }))}
                      className="w-16 border rounded p-1 text-center text-sm"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-sm font-medium">Motivo *</label>
                <Input
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  placeholder="Ej: Producto defectuoso, talla incorrecta..."
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Método de devolución del dinero</label>
                <select
                  value={returnPaymentMethodId}
                  onChange={e => setReturnPaymentMethodId(e.target.value)}
                  className="w-full border rounded p-2 text-sm mt-1"
                >
                  <option value="">Sin reembolso / Saldo a favor</option>
                  {paymentMethods.filter(pm => pm.isActive).map(pm => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2 border rounded text-sm" onClick={() => setIsReturnOpen(false)}>Cancelar</button>
                <button className="px-4 py-2 bg-orange-500 text-white rounded text-sm hover:bg-orange-600" onClick={handleConfirmReturn}>
                  Registrar devolución
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}