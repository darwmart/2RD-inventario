import { useState } from 'react'; // Importa el hook useState para manejar estados locales.
import { useInventory } from '@/hooks/useInventory'; // Hook personalizado para obtener datos de inventario.
import { useSales } from '@/hooks/useSales'; // Hook personalizado para manejar ventas.
import { useSettings } from '@/hooks/useSettings'; // Hook personalizado para configuraciones.
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button'; // Componente de botón reutilizable.
import { Input } from '@/components/ui/input'; // Componente de entrada reutilizable.
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Componentes para tarjetas.
import { Badge } from '@/components/ui/badge'; // Componente para mostrar etiquetas.
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'; // Componentes para diálogos modales.
import { Label } from '@/components/ui/label'; // Componente para etiquetas de formularios.
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Componentes para menús desplegables.
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'; // Componentes para tablas.
import { Plus, FileText, Search, ShoppingCart, Clock, Minus, Trash2, Printer } from 'lucide-react'; // Iconos de la librería Lucide.
import { Product, SaleItem } from '@/types'; // Tipos personalizados para productos, elementos de venta y métodos de pago.
import { toast } from 'sonner'; // Librería para mostrar notificaciones.
import { printPOSInvoice } from '@/utils/printUtils'; // Utilidad de impresión
import { calculateItemIVA } from '@/utils/ivaUtils';

export default function Quotes() {
  const { products, updateStock } = useInventory(); // Obtiene los productos del inventario.
  const { addSale, advisors, sales, updateSale, paymentMethods, addSaleDeposit } = useSales(); // Obtiene funciones y datos relacionados con ventas.
  const { companyInfo, taxSettings, updateBankBalance, banks } = useSettings(); // Obtiene la información de la empresa, configuración de impuestos y función para actualizar bancos

  // Estados locales para manejar la lógica de la página.
  const [isCreatingQuote, setIsCreatingQuote] = useState(false); // Controla si el diálogo de creación está abierto.
  const [searchTerm, setSearchTerm] = useState(''); // Almacena el término de búsqueda.
  const [selectedAdvisor, setSelectedAdvisor] = useState(''); // Almacena el asesor seleccionado.
  const [cart, setCart] = useState<SaleItem[]>([]); // Almacena los productos seleccionados en el carrito.
  const [quoteType, setQuoteType] = useState<'quote' | 'reserved'>('quote'); // Define el tipo de cotización.
 
  // Campos adicionales para Separado
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState(''); // Método de pago seleccionado para el separado
  const [deposit, setDeposit] = useState<number>(0); // Abono inicial
  const [customerName, setCustomerName] = useState(''); // Nombre del cliente
  const [customerDocument, setCustomerDocument] = useState(''); // Documento del cliente
  const [customerPhone, setCustomerPhone] = useState(''); // Teléfono del cliente

  // Estado del diálogo de Abono (para separados)
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [depositSaleId, setDepositSaleId] = useState('');
  const [depositAmountNew, setDepositAmountNew] = useState<number>(0);
  const [depositPaymentMethodIdNew, setDepositPaymentMethodIdNew] = useState('');

 


  // Filtra las ventas para obtener cotizaciones pendientes.
  const quotes = sales.filter(sale => sale.type === 'quote' && sale.status === 'pending');
  // Filtra las ventas para obtener productos separados pendientes.
  const reserved = sales.filter(sale => sale.type === 'reserved' && sale.status === 'pending');

   const [searchQuoteReserved, setSearchQuoteReserved] = useState('');

  const filteredReserved = reserved.filter(reservation => {
  const customerMatch =
    (reservation.customerName?.toLowerCase().includes(searchQuoteReserved.toLowerCase()) ?? false) ||
    (reservation.customerDocument?.includes(searchQuoteReserved) ?? false);

  const itemsMatch = reservation.items.some(item =>
    item.productName.toLowerCase().includes(searchQuoteReserved.toLowerCase())
  );

  return customerMatch || itemsMatch;
});

  // Venta seleccionada para abono (diálogo)
  const selectedSaleForDeposit = sales.find(s => s.id === depositSaleId);
  const paidSelected = selectedSaleForDeposit ? (selectedSaleForDeposit.deposit ?? 0) : 0;
  const remainingSelected = selectedSaleForDeposit ? Math.max(0, selectedSaleForDeposit.total - paidSelected) : 0;

  // Función para agregar productos al carrito.
  const addToCart = (product: Product, quantity: number = 1) => {
    const existingItemIndex = cart.findIndex(item => item.productId === product.id); // Busca si el producto ya está en el carrito.
    const { hasIva, ivaAmount } = calculateItemIVA(product, product.currentPrice, quantity, taxSettings);

    if (existingItemIndex >= 0) {
      // Si el producto ya está, actualiza la cantidad y el total.
      const existingItem = cart[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;
      const newIVA = calculateItemIVA(product, existingItem.unitPrice, newQuantity, taxSettings);
      const updatedCart = [...cart];
      updatedCart[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        total: newQuantity * existingItem.unitPrice,
        hasIva: newIVA.hasIva,
        ivaAmount: newIVA.ivaAmount
      };
      setCart(updatedCart); // Actualiza el carrito.
    } else {
      // Si el producto no está, lo agrega al carrito.
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        description: product.description,
        cost: product.cost,
        quantity,
        unitPrice: product.currentPrice,
        total: quantity * product.currentPrice,
        hasIva,
        ivaAmount
      }]);
    }
  };

  // Función para actualizar la cantidad de un producto en el carrito.
  const updateCartItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.productId !== productId)); // Elimina el producto si la cantidad es 0.
      return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

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

  // Función para actualizar el precio de un producto en el carrito.
  const updateCartItemPrice = (productId: string, newPrice: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

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

  // Calcula el subtotal del carrito.
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const totalIVA = cart.reduce((sum, item) => sum + (item.ivaAmount || 0), 0);

  // Crea una nueva cotización o separado.
  const createQuoteOrReservation = () => {
  if (cart.length === 0) {
    toast.error('Agrega productos para crear la cotización');
    return;
  }
  if (!selectedAdvisor) {
    toast.error('Selecciona un asesor');
    return;
  }
  if (quoteType === 'reserved') {
    if (!selectedPaymentMethodId) {
      toast.error('Selecciona un método de pago');
      return;
    }
    const pm = paymentMethods.find(p => p.id === selectedPaymentMethodId);
    if (!pm) {
      toast.error('Método de pago inválido');
      return;
    }
    // Validar stock disponible
    for (const item of cart) {
      const product = products.find(p => p.id === item.productId);
      if (!product || product.stock < item.quantity) {
        toast.error(`Stock insuficiente para ${item.productName}`);
        return;
      }
    }
  }

  const method = quoteType === 'reserved'
    ? paymentMethods.find(p => p.id === selectedPaymentMethodId)!
    : { id: 'pending', name: 'Pendiente', type: 'cash' as const, isActive: true };

  // Crear la venta
  const sale = addSale({
    advisorId: selectedAdvisor,
    items: cart,
    paymentMethod: method,
    type: quoteType,
    ivaTotal: totalIVA,
    ...(quoteType === 'reserved'
      ? {
          deposit,
          customerName: customerName || undefined,
          customerDocument: customerDocument || undefined,
          customerPhone: customerPhone || undefined,
        }
      : {}),
  });

  // Reservar stock para separados
  if (quoteType === 'reserved') {
    cart.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        updateStock(item.productId, product.stock, (product.reservedStock ?? 0) + item.quantity);
      }
    });

    // Si hay un depósito inicial, descontar del banco correspondiente
    if (deposit > 0 && selectedPaymentMethodId) {
      const paymentMethod = paymentMethods.find(pm => pm.id === selectedPaymentMethodId);

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

        // Solo descontar si no es crédito externo
        if (mappedBankId !== null && mappedBankId !== undefined) {
          const bankExists = banks.find(b => b.id === mappedBankId);
          if (bankExists) {
            updateBankBalance(mappedBankId, deposit);
          }
        }
      }
    }
  }

  toast.success(`${quoteType === 'quote' ? 'Cotización' : 'Separado'} ${sale.saleNumber} creada exitosamente`);
  setCart([]);
  setSelectedAdvisor('');
  setSelectedPaymentMethodId('');
  setDeposit(0);
  setCustomerName('');
  setCustomerDocument('');
  setCustomerPhone('');
  setQuoteType('quote');
  setIsCreatingQuote(false);
};

  // Abrir diálogo de abono para un separado
  const openDepositDialog = (saleId: string) => {
    setDepositSaleId(saleId);
    setDepositAmountNew(0);
    setDepositPaymentMethodIdNew('');
    setDepositDialogOpen(true);
  };

  // Confirmar y registrar el abono
  const confirmDeposit = () => {
    const sale = sales.find(s => s.id === depositSaleId);
    if (!sale) {
      toast.error('Separado no encontrado');
      return;
    }
    if (sale.type !== 'reserved' || sale.status !== 'pending') {
      toast.error('Solo se pueden abonar separados pendientes');
      return;
    }
    if (!depositPaymentMethodIdNew) {
      toast.error('Selecciona un método de pago');
      return;
    }
    if (depositAmountNew <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    const pagado = sale.deposit ?? 0;
    const saldo = Math.max(0, sale.total - pagado);
    if (depositAmountNew > saldo) {
      toast.error('El abono no puede superar el saldo pendiente');
      return;
    }

    try {
      // Registrar el abono en la venta
      addSaleDeposit(depositSaleId, depositAmountNew, depositPaymentMethodIdNew);

      // Obtener el método de pago para determinar el banco
      const paymentMethod = paymentMethods.find(pm => pm.id === depositPaymentMethodIdNew);

      // Mapear el método de pago a un banco
      let bankId = 'efectivo'; // Por defecto

      if (paymentMethod) {
        // Mapeo de métodos de pago a bancos
        const paymentToBankMap: { [key: string]: string } = {
          '1': 'efectivo',           // Efectivo
          '2': 'colpatria',          // Tarjeta Débito -> Colpatria (puedes ajustar según tu negocio)
          '3': 'colpatria',          // Tarjeta Crédito -> Colpatria
          '4': 'bbva',               // Transferencia -> BBVA (ajustar según tu banco)
          '5': 'nequi',              // Nequi
          '6': 'daviplata',          // Daviplata
          '7': 'bbva',               // Transfiya -> BBVA
          // Créditos externos no afectan bancos inmediatamente
          '8': null,                 // Sistecredito
          '9': null,                 // Addi
          '10': null                 // Esmiopcion
        };

        const mappedBankId = paymentToBankMap[paymentMethod.id];

        // Solo descontar si no es crédito externo (null)
        if (mappedBankId !== null && mappedBankId !== undefined) {
          bankId = mappedBankId;

          // Verificar que el banco existe antes de actualizar
          const bankExists = banks.find(b => b.id === bankId);
          if (bankExists) {
            updateBankBalance(bankId, depositAmountNew);
          }
        }
      }

      toast.success('Abono registrado y saldo actualizado');
      setDepositDialogOpen(false);
      setDepositSaleId('');
      setDepositAmountNew(0);
      setDepositPaymentMethodIdNew('');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo registrar el abono');
    }
  };

  // Convierte una cotización o separado en una venta.
  const convertToSale = (saleId: string) => {
  const sale = sales.find(s => s.id === saleId);
  if (sale?.type === 'reserved') {
    // Reducir stock real y limpiar reservedStock
    sale.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        updateStock(item.productId, product.stock - item.quantity, 0);
      }
    });
  }
  updateSale(saleId, { status: 'completed' });
  toast.success('Convertido a venta exitosamente');
};

  // Cancela una cotización.
  const cancelQuote = (saleId: string) => {
  const sale = sales.find(s => s.id === saleId);
  if (sale?.type === 'reserved') {
    // Liberar reservedStock
    sale.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        updateStock(item.productId, product.stock, (product.reservedStock ?? 0) - item.quantity);
      }
    });
  }
  updateSale(saleId, { status: 'cancelled' });
  toast.success('Cotización cancelada');
};

  // Filtra los productos disponibles según el término de búsqueda.
  const availableProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode.includes(searchTerm)
  ).slice(0, 8); // Limita los resultados a 8 productos.

  return (
    <ScrollArea className="h-[51rem] p-6 ">
        <div className="flex justify-between items-center mb-6">
        </div>
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cotizaciones y Separados</h1>
          <p className="mt-2 text-gray-600">
            Gestiona cotizaciones y productos separados
          </p>
        </div>
        
        <Dialog open={isCreatingQuote} onOpenChange={setIsCreatingQuote}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cotización
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva Cotización/Separado</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={quoteType} onValueChange={(value: 'quote' | 'reserved') => setQuoteType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quote">Cotización</SelectItem>
                      <SelectItem value="reserved">Separado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              </div>

              {quoteType === 'reserved' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Método de Pago</Label>
                    <Select value={selectedPaymentMethodId} onValueChange={setSelectedPaymentMethodId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar método" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods
                          .filter(pm => pm.isActive)
                          .map(pm => (
                            <SelectItem key={pm.id} value={pm.id}>
                              {pm.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Abono</Label>
                    <Input
                      type="number"
                      value={deposit}
                      onChange={(e) => setDeposit(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Nombre del Cliente</Label>
                    <Input
                      placeholder="Nombre completo"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Documento</Label>
                    <Input
                      placeholder="CC/NIT"
                      value={customerDocument}
                      onChange={(e) => setCustomerDocument(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input
                      placeholder="Celular"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label>Buscar Productos</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por nombre, referencia..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                {availableProducts.map(product => (
                  <Card 
                    key={product.id} 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-2">
                      <div className="text-xs font-medium">{product.name}</div>
                      <div className="text-xs text-gray-600">{product.reference}</div>
                      <div className="text-xs font-bold mt-1">
                        ${product.currentPrice.toLocaleString('es-CO')}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div>
                <Label>Productos Seleccionados</Label>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {cart.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      Sin productos seleccionados
                    </div>
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
                  <Button variant="outline" onClick={() => setIsCreatingQuote(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={createQuoteOrReservation}>
                    Crear {quoteType === 'quote' ? 'Cotización' : 'Separado'}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Cotizaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Cotizaciones ({quotes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quotes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No hay cotizaciones pendientes
                </p>
              ) : (
                quotes.map(quote => (
                  <div key={quote.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{quote.saleNumber}</h4>
                        <p className="text-sm text-gray-600">
                          Asesor: {quote.advisorName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(quote.createdAt).toLocaleDateString('es-CO')}
                        </p>
                      </div>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendiente
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-3">
                      {quote.items.length} productos - Total: ${quote.total.toLocaleString('es-CO')}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => printPOSInvoice(quote, companyInfo)}
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        Imprimir
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => convertToSale(quote.id)}
                        className="flex-1"
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        Convertir a Venta
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelQuote(quote.id)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Separados */}
        <Card>
          <CardHeader>
            
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Separados ({reserved.length})
            </CardTitle>
             <div className="mb-6">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por cédula, nombre o artículo..."
                  className="pl-10"
                  value={searchQuoteReserved}
                  onChange={(e) => setSearchQuoteReserved(e.target.value)}/>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredReserved.length === 0 ?(
                <p className="text-gray-500 text-center py-4">
                  No hay productos separados
                </p>
              ) : (
                filteredReserved.map(reservation => (
                  <div key={reservation.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{reservation.saleNumber}</h4>
                        <p className="text-sm text-gray-600">
                          Asesor: {reservation.advisorName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(reservation.createdAt).toLocaleDateString('es-CO')}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        Separado
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-3">
                      {reservation.items.length} productos - Total: ${reservation.total.toLocaleString('es-CO')}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 mb-3">
                      <div>
                        <span className="text-gray-500">Método:</span> {reservation.paymentMethod?.name}
                      </div>
                      <div>
                        <span className="text-gray-500">Abono:</span> ${ (reservation.deposit ?? 0).toLocaleString('es-CO') }
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Saldo pendiente:</span> ${ Math.max(0, reservation.total - (reservation.deposit ?? 0)).toLocaleString('es-CO') }
                      </div>
                      {reservation.customerName && (
                        <div className="col-span-2">
                          <span className="text-gray-500">Cliente:</span> {reservation.customerName}
                        </div>
                      )}
                      {reservation.customerDocument && (
                        <div>
                          <span className="text-gray-500">Documento:</span> {reservation.customerDocument}
                        </div>
                      )}
                      {reservation.customerPhone && (
                        <div>
                          <span className="text-gray-500">Teléfono:</span> {reservation.customerPhone}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => printPOSInvoice(reservation, companyInfo)}
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        Imprimir
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDepositDialog(reservation.id)}
                      >
                        Abonar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => convertToSale(reservation.id)}
                        className="flex-1"
                        disabled={(reservation.deposit ?? 0) < reservation.total}
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        Convertir a Venta
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelQuote(reservation.id)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Dialogo para registrar abono en un separado */}
      <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Abono</DialogTitle>
          </DialogHeader>

          {!selectedSaleForDeposit ? (
            <div className="text-sm text-gray-500">Selecciona un separado</div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-700">
                <div><span className="text-gray-500">Separado:</span> {selectedSaleForDeposit.saleNumber}</div>
                <div><span className="text-gray-500">Total:</span> ${selectedSaleForDeposit.total.toLocaleString('es-CO')}</div>
                <div><span className="text-gray-500">Abonado:</span> ${paidSelected.toLocaleString('es-CO')}</div>
                <div className="font-medium"><span className="text-gray-500">Saldo pendiente:</span> ${remainingSelected.toLocaleString('es-CO')}</div>
              </div>

              <div>
                <Label>Método de Pago</Label>
                <Select value={depositPaymentMethodIdNew} onValueChange={setDepositPaymentMethodIdNew}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods
                      .filter(pm => pm.isActive)
                      .map(pm => (
                        <SelectItem key={pm.id} value={pm.id}>
                          {pm.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Monto a Abonar</Label>
                <Input
                  type="number"
                  value={depositAmountNew}
                  onChange={(e) => setDepositAmountNew(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
                {remainingSelected > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    Máximo permitido: ${remainingSelected.toLocaleString('es-CO')}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDepositDialogOpen(false)}>Cancelar</Button>
                <Button onClick={confirmDeposit}>Confirmar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
    </div>
    </ScrollArea>
  );
}