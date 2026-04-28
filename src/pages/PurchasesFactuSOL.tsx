import { useState, useMemo, useEffect } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { usePurchases } from '@/hooks/usePurchases';
import { useSettings } from '@/hooks/useSettings';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  Package,
  ArrowRight,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Building2
} from 'lucide-react';
import { PurchaseDocument, DocumentType, DocumentStatus, AccountingRecord, Supplier, Product } from '@/types';
import { toast } from 'sonner';
import SupplierFormDialog from '@/components/SupplierFormDialog';
import SupplierSearchDialog from '@/components/SupplierSearchDialog';
import ProductSearchDialog from '@/components/ProductSearchDialog';
import ProductFormDialog from '@/components/ProductFormDialog';

export default function PurchasesFactuSOL() {
  const { products, suppliers, categories, updateStock, addSupplier, updateSupplier, addProduct, addCategory } = useInventory();
  const {
    purchases,
    createDocument,
    updatePurchase,
    deletePurchase,
    convertDeliveryToInvoice,
    updateDocumentStatus
  } = usePurchases();
  const { banks, taxSettings, updateBankBalance } = useSettings();
  const [accountingRecords, setAccountingRecords] = useLocalStorage<AccountingRecord[]>('accountingRecords', []);

  // Estados de filtros y UI
  const [activeTab, setActiveTab] = useState<DocumentType>('delivery');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<PurchaseDocument | null>(null);
  const [bottomTab, setBottomTab] = useState<'lines' | 'totals'>('lines');

  // Estados para modal de creación/edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<PurchaseDocument | null>(null);
  const [modalTab, setModalTab] = useState('general');

  // Estados para modal de pago
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<PurchaseDocument | null>(null);
  const [selectedBank, setSelectedBank] = useState('');

  // Estados para modal de proveedor
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Estados para búsqueda de proveedor
  const [isSupplierSearchOpen, setIsSupplierSearchOpen] = useState(false);
  const [supplierCode, setSupplierCode] = useState('');
  const [supplierName, setSupplierName] = useState('');

  // Estados para búsqueda y creación de productos
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Estados del formulario
  const [supplierId, setSupplierId] = useState(''); // ID interno
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [warehouse, setWarehouse] = useState('[01] HELMETS BOUTIQUE'); // Almacén por defecto
  const [items, setItems] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [searchProduct, setSearchProduct] = useState('');

  // Obtener nombre del proveedor (compatible con ambos formatos de datos)
  const getSupplierName = (s: any): string =>
    (s?.commercialName || '').trim() || (s?.fiscalName || '').trim() || (s?.name || '').trim() || '';

  // Resolver nombre: primero snapshot guardado, luego busca por supplierId
  const resolveSupplierName = (doc: PurchaseDocument): string => {
    if (doc.supplierName && doc.supplierName.trim()) return doc.supplierName.trim();
    const s = suppliers.find(x => x.id === doc.supplierId);
    return s ? (getSupplierName(s) || 'Sin proveedor') : 'Sin proveedor';
  };

  // Filtrar documentos según tab activo
  const filteredDocuments = useMemo(() => {
    return purchases.filter(doc => {
      const matchesType = doc.documentType === activeTab;

      // Ocultar albaranes que ya fueron facturados
      if (doc.documentType === 'delivery' && doc.status === 'invoiced') {
        return false;
      }

      // Filtro por rango de fechas
      const docDate = new Date(doc.createdAt);
      docDate.setHours(0, 0, 0, 0);

      let matchesDateRange = true;
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        matchesDateRange = matchesDateRange && docDate >= start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDateRange = matchesDateRange && docDate <= end;
      }

      // Filtro por búsqueda (proveedor, número de documento, número de factura proveedor, o artículos)
      const matchesSearch = searchTerm === '' ||
        (doc.documentNumber && doc.documentNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.supplierName && doc.supplierName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.supplierInvoiceNumber && doc.supplierInvoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.items && doc.items.some(item => item.productName && item.productName.toLowerCase().includes(searchTerm.toLowerCase())));

      return matchesType && matchesDateRange && matchesSearch;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [purchases, activeTab, startDate, endDate, searchTerm]);

  // Calcular totales
  const totals = useMemo(() => {
    const docs = filteredDocuments;
    return {
      subtotal: docs.reduce((sum, doc) => sum + doc.subtotal, 0),
      tax: docs.reduce((sum, doc) => sum + (doc.tax || 0), 0),
      total: docs.reduce((sum, doc) => sum + doc.total, 0),
    };
  }, [filteredDocuments]);

  // Obtener badge de estado
  const getStatusBadge = (status: DocumentStatus) => {
    const badges = {
      pending: { label: 'Pendiente', variant: 'secondary' as const, icon: Clock },
      partial: { label: 'Parcial', variant: 'default' as const, icon: Clock },
      completed: { label: 'Servido', variant: 'default' as const, icon: CheckCircle },
      invoiced: { label: 'Facturado', variant: 'default' as const, icon: FileText },
      cancelled: { label: 'Anulado', variant: 'destructive' as const, icon: XCircle },
    };
    const config = badges[status];
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Obtener icono por tipo de documento
  const getDocumentIcon = (type: DocumentType) => {
    const icons = {
      delivery: Package,
      invoice: FileText,
    };
    return icons[type];
  };

  // Abrir modal de pago para factura
  const handleOpenPayment = (invoice: PurchaseDocument) => {
    setPayingInvoice(invoice);
    setSelectedBank(invoice.paymentDetails?.bankId || 'efectivo');
    setIsPaymentModalOpen(true);
  };

  // Marcar factura como pagada
  const handleMarkAsPaid = () => {
    if (!payingInvoice) return;

    try {
      // Actualizar estado a completado
      updateDocumentStatus(payingInvoice.id, 'completed');

      // Descontar del banco seleccionado
      updateBankBalance(selectedBank, -payingInvoice.total);

      // Registrar en contabilidad
      const bankName = banks.find(b => b.id === selectedBank)?.name || 'Efectivo';
      const newRecord: AccountingRecord = {
        id: Date.now(),
        tipo: 'compra',
        descripcion: `Factura ${payingInvoice.documentNumber}`,
        proveedor: payingInvoice.supplierName,
        factura: payingInvoice.documentNumber,
        monto: payingInvoice.total,
        banco: selectedBank,
        fecha: new Date().toISOString(),
      };
      setAccountingRecords(prev => [...prev, newRecord]);

      toast.success(`Factura ${payingInvoice.documentNumber} marcada como pagada`);
      setIsPaymentModalOpen(false);
      setPayingInvoice(null);
      setSelectedBank('');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Manejar conversión de albarán a factura
  const handleConvertToInvoice = (deliveryId: string) => {
    // Aquí abrirías un modal para seleccionar método de pago
    // Por ahora, uso datos por defecto
    try {
      const invoice = convertDeliveryToInvoice(deliveryId, {
        paymentMethod: {
          id: 'efectivo',
          name: 'Efectivo',
          type: 'cash',
          isActive: true,
        },
        paymentDetails: {
          isCashPayment: true,
        },
      });

      // NO debitamos aquí, se debitará cuando se marque como completada/pagada

      toast.success(`Factura ${invoice.documentNumber} creada (pendiente de pago)`);
      setActiveTab('invoice');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Abrir modal para nuevo documento
  const handleNew = () => {
    setEditingDocument(null);
    setSupplierId('');
    setSupplierCode('');
    setSupplierName('');
    setSupplierInvoiceNumber('');
    setWarehouse('[01] HELMETS BOUTIQUE');
    setItems([]);
    setNotes('');
    setModalTab('general');
    setIsModalOpen(true);
  };

  // Abrir modal para editar documento
  const handleEdit = () => {
    if (!selectedDocument) return;
    setEditingDocument(selectedDocument);
    setSupplierId(selectedDocument.supplierId);

    // Cargar datos del proveedor
    const supplier = suppliers.find(s => s.id === selectedDocument.supplierId);
    if (supplier) {
      setSupplierCode(supplier.code || '');
      setSupplierName(supplier.commercialName || supplier.fiscalName);
    }

    setSupplierInvoiceNumber(selectedDocument.supplierInvoiceNumber || '');
    setWarehouse(selectedDocument.warehouse || '[01] HELMETS BOUTIQUE');
    setItems(selectedDocument.items);
    setNotes(selectedDocument.notes || '');
    setModalTab('general');
    setIsModalOpen(true);
  };

  // Guardar documento
  const handleSave = () => {
    if (!supplierId) {
      toast.error('Selecciona un proveedor');
      return;
    }
    if (items.length === 0) {
      toast.error('Agrega al menos un artículo');
      return;
    }

    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) {
      toast.error('Proveedor no válido');
      return;
    }

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = taxSettings.ivaEnabled ? (subtotal * taxSettings.ivaPercentage / 100) : 0;

    if (editingDocument) {
      // Actualizar documento existente
      updatePurchase(editingDocument.id, {
        invoiceNumber: editingDocument.documentNumber,
        supplierId: supplier.id,
        supplierName: getSupplierName(supplier),
        items,
        tax,
        notes,
        paymentMethod: editingDocument.paymentMethod || {
          id: 'efectivo',
          name: 'Efectivo',
          type: 'cash',
          isActive: true,
        },
        paymentDetails: editingDocument.paymentDetails,
      });
      toast.success('Documento actualizado');
    } else {
      // Crear nuevo documento
      const newDoc = createDocument({
        documentType: activeTab,
        supplierId: supplier.id,
        supplierName: getSupplierName(supplier),
        warehouse,
        items,
        tax,
        notes,
        supplierInvoiceNumber,
      });

      // Si es albarán, aumentar stock
      if (activeTab === 'delivery') {
        items.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const newStock = product.stock + item.quantity;
            updateStock(item.productId, newStock, product.reservedStock ?? 0);
          }
        });
      }

      // Si es factura, aumentar stock (NO debitamos hasta que se marque como pagada)
      if (activeTab === 'invoice') {
        items.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const newStock = product.stock + item.quantity;
            updateStock(item.productId, newStock, product.reservedStock ?? 0);
          }
        });
      }

      toast.success(`${activeTab === 'delivery' ? 'Albarán' : 'Factura'} ${activeTab === 'invoice' ? '(pendiente de pago)' : ''} creado`);
    }

    setIsModalOpen(false);
    setSupplierId('');
    setSupplierCode('');
    setSupplierName('');
    setSupplierInvoiceNumber('');
    setWarehouse('[01] HELMETS BOUTIQUE');
    setItems([]);
    setNotes('');
  };

  // Agregar producto al carrito
  const handleAddProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = items.findIndex(i => i.productId === productId);
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      newItems[existingIndex].total = newItems[existingIndex].quantity * newItems[existingIndex].unitCost;
      setItems(newItems);
    } else {
      setItems([...items, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitCost: product.cost,
        total: product.cost,
      }]);
    }
  };

  // Actualizar cantidad de producto
  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      setItems(items.filter((_, i) => i !== index));
    } else {
      const newItems = [...items];
      newItems[index].quantity = quantity;
      newItems[index].total = quantity * newItems[index].unitCost;
      setItems(newItems);
    }
  };

  // Actualizar precio unitario
  const handleUpdatePrice = (index: number, price: number) => {
    const newItems = [...items];
    newItems[index].unitCost = price;
    newItems[index].total = newItems[index].quantity * price;
    setItems(newItems);
  };

  // Productos filtrados para búsqueda
  const availableProducts = useMemo(() => {
    if (!searchProduct) return products.slice(0, 10);
    return products.filter(p =>
      p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.reference.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.barcode.includes(searchProduct)
    ).slice(0, 10);
  }, [products, searchProduct]);

  // Calcular totales del modal
  const modalTotals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = taxSettings.ivaEnabled ? (subtotal * taxSettings.ivaPercentage / 100) : 0;
    return { subtotal, tax, total: subtotal + tax };
  }, [items, taxSettings]);

  // Eliminar documento
  const handleDelete = (documentId: string) => {
    if (confirm('¿Estás seguro de eliminar este documento?')) {
      const doc = purchases.find(p => p.id === documentId);
      if (doc) {
        // Revertir stock si es albarán o factura
        if (doc.documentType === 'delivery' || doc.documentType === 'invoice') {
          doc.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product) {
              const revertedStock = product.stock - item.quantity;
              updateStock(item.productId, revertedStock, product.reservedStock ?? 0);
            }
          });
        }

        // Devolver dinero si es factura
        if (doc.documentType === 'invoice' && doc.paymentDetails) {
          const bankId = doc.paymentDetails.bankId || 'efectivo';
          updateBankBalance(bankId, doc.total);
        }

        deletePurchase(documentId);
        toast.success('Documento eliminado');
      }
    }
  };

  // Manejar guardar proveedor desde modal
  const handleSaveSupplier = (supplierData: Omit<Supplier, 'id' | 'createdAt'>) => {
    if (editingSupplier) {
      updateSupplier(editingSupplier.id, supplierData);
      toast.success('Proveedor actualizado correctamente');
    } else {
      const newSupplier = addSupplier(supplierData);
      toast.success('Proveedor creado correctamente');
      // Auto-seleccionar el nuevo proveedor en el formulario de compra si el modal de compras está abierto
      if (isModalOpen) {
        setSupplierId(newSupplier.id);
        setSupplierCode(newSupplier.code || '');
        setSupplierName(newSupplier.commercialName || newSupplier.fiscalName);
      }
    }
  };

  // Buscar proveedor por código
  const handleSupplierCodeChange = (code: string) => {
    setSupplierCode(code);

    if (code.trim() === '') {
      setSupplierId('');
      setSupplierName('');
      return;
    }

    // Buscar proveedor por código
    const supplier = suppliers.find(s => s.code === code.trim());
    if (supplier) {
      setSupplierId(supplier.id);
      setSupplierName(supplier.commercialName || supplier.fiscalName);
    } else {
      setSupplierId('');
      setSupplierName('');
    }
  };

  // Seleccionar proveedor desde modal de búsqueda
  const handleSelectSupplier = (supplier: Supplier) => {
    setSupplierId(supplier.id);
    setSupplierCode(supplier.code || '');
    setSupplierName(supplier.commercialName || supplier.fiscalName);
  };

  // Manejar tecla F1 para abrir búsqueda de proveedor
  const handleSupplierKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'F1') {
      e.preventDefault();
      setIsSupplierSearchOpen(true);
    }
  };

  // Seleccionar producto desde modal de búsqueda
  const handleSelectProduct = (product: Product) => {
    handleAddProduct(product.id);
    setSearchProduct('');
  };

  // Guardar producto desde modal de formulario
  const handleSaveProduct = (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'reservedStock'>) => {
    const newProduct = addProduct(productData);
    toast.success('Artículo creado correctamente');
    // Auto-agregar el nuevo producto al documento de compra
    if (isModalOpen) {
      handleAddProduct(newProduct.id);
    }
  };

  // Manejar tecla F1 para abrir búsqueda de productos cuando el modal de compra está abierto
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1' && isModalOpen && !isProductSearchOpen && !isSupplierSearchOpen) {
        e.preventDefault();
        setIsProductSearchOpen(true);
      }
    };

    if (isModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isModalOpen, isProductSearchOpen, isSupplierSearchOpen]);

  return (
    <ScrollArea className="h-screen">
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Barra Superior - Estilo FactuSOL */}
        <div className="mb-4 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Compras</h1>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-gray-600">Desde:</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-[140px] h-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-gray-600">Hasta:</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-[140px] h-9"
                />
              </div>
              {(startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="h-9"
                >
                  Limpiar
                </Button>
              )}
              <div className="h-6 w-px bg-gray-300 mx-1" />
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Proveedor, factura, artículo..."
                  className="pl-8 w-[280px] h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Indicador de Filtros Activos */}
          {(startDate || endDate || searchTerm) && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded">
              <span className="font-medium">Filtros activos:</span>
              {startDate && <Badge variant="secondary">Desde: {new Date(startDate).toLocaleDateString('es-CO')}</Badge>}
              {endDate && <Badge variant="secondary">Hasta: {new Date(endDate).toLocaleDateString('es-CO')}</Badge>}
              {searchTerm && <Badge variant="secondary">Búsqueda: "{searchTerm}"</Badge>}
              <span className="text-gray-500">({filteredDocuments.length} resultado{filteredDocuments.length !== 1 ? 's' : ''})</span>
            </div>
          )}

          {/* Barra de Herramientas */}
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleNew}>
                <Plus className="h-4 w-4 mr-1" />
                Nuevo
              </Button>
              <Button size="sm" variant="outline" disabled={!selectedDocument} onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!selectedDocument}
                onClick={() => selectedDocument && handleDelete(selectedDocument.id)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Borrar
              </Button>
              <div className="h-6 w-px bg-gray-300 mx-2" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingSupplier(null);
                  setIsSupplierModalOpen(true);
                }}
              >
                <Building2 className="h-4 w-4 mr-1" />
                Ver proveedor
              </Button>
              <div className="h-6 w-px bg-gray-300 mx-2" />
              {selectedDocument && selectedDocument.documentType === 'delivery' && selectedDocument.status !== 'invoiced' && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleConvertToInvoice(selectedDocument.id)}
                >
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Convertir a Factura
                </Button>
              )}
              {selectedDocument && selectedDocument.documentType === 'invoice' && selectedDocument.status === 'pending' && (
                <Button
                  size="sm"
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleOpenPayment(selectedDocument)}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Marcar como Pagada
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Tabs - Estilo FactuSOL */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DocumentType)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="delivery" className="gap-2">
              <Package className="h-4 w-4" />
              Albaranes
              <Badge variant="secondary">{purchases.filter(p => p.documentType === 'delivery' && p.status !== 'invoiced').length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="invoice" className="gap-2">
              <FileText className="h-4 w-4" />
              Facturas
              <Badge variant="secondary">{purchases.filter(p => p.documentType === 'invoice').length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Número</TableHead>
                    <TableHead className="w-[130px]">Nº Factura Prov.</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">IVA</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[100px]">Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="h-12 w-12 text-gray-300" />
                          <p className="text-gray-500 font-medium">
                            {(startDate || endDate || searchTerm)
                              ? 'No se encontraron documentos con los filtros aplicados'
                              : 'No hay documentos para mostrar'}
                          </p>
                          {(startDate || endDate || searchTerm) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setStartDate('');
                                setEndDate('');
                                setSearchTerm('');
                              }}
                            >
                              Limpiar filtros
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <TableRow
                        key={doc.id}
                        className={`cursor-pointer ${selectedDocument?.id === doc.id ? 'bg-blue-50' : ''}`}
                        onClick={() => setSelectedDocument(doc)}
                      >
                        <TableCell className="font-mono font-medium">{doc.documentNumber}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {doc.supplierInvoiceNumber ? (
                            <span className="text-blue-600">{doc.supplierInvoiceNumber}</span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>{new Date(doc.createdAt).toLocaleDateString('es-CO')}</TableCell>
                        <TableCell>{resolveSupplierName(doc)}</TableCell>
                        <TableCell className="text-right">${doc.subtotal.toLocaleString('es-CO')}</TableCell>
                        <TableCell className="text-right">${(doc.tax || 0).toLocaleString('es-CO')}</TableCell>
                        <TableCell className="text-right font-bold">${doc.total.toLocaleString('es-CO')}</TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        <TableCell>
                          {doc.orderRef && <Badge variant="outline" className="text-xs">P</Badge>}
                          {doc.deliveryRef && <Badge variant="outline" className="text-xs ml-1">A</Badge>}
                          {doc.invoiceRef && <Badge variant="outline" className="text-xs ml-1">F</Badge>}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Totales - Estilo FactuSOL */}
              <div className="border-t p-4 bg-gray-50">
                <div className="flex justify-end gap-8 text-sm">
                  <div className="flex gap-2">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-mono font-medium">${totals.subtotal.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-600">IVA:</span>
                    <span className="font-mono font-medium">${totals.tax.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-600 font-bold">TOTAL:</span>
                    <span className="font-mono font-bold text-lg">${totals.total.toLocaleString('es-CO')}</span>
                  </div>
                </div>
              </div>

              {/* Tabs Inferiores - Detalles del documento seleccionado */}
              {selectedDocument && (
                <div className="border-t">
                  <Tabs value={bottomTab} onValueChange={(v) => setBottomTab(v as 'lines' | 'totals')}>
                    <div className="border-b bg-gray-50 px-4">
                      <TabsList className="h-9">
                        <TabsTrigger value="lines" className="text-xs">
                          Ver detalles de línea
                        </TabsTrigger>
                        <TabsTrigger value="totals" className="text-xs">
                          Ver totales de documento
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="lines" className="m-0 p-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-gray-700 mb-3">
                          Artículos del documento {selectedDocument.documentNumber}
                        </h4>
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="text-xs">Artículo</TableHead>
                              <TableHead className="text-xs text-right">Cantidad</TableHead>
                              <TableHead className="text-xs text-right">P. Unitario</TableHead>
                              <TableHead className="text-xs text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedDocument.items.map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="text-sm">{item.productName}</TableCell>
                                <TableCell className="text-right font-mono text-sm">{item.quantity}</TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  ${item.unitCost.toLocaleString('es-CO')}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm font-medium">
                                  ${item.total.toLocaleString('es-CO')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    <TabsContent value="totals" className="m-0 p-4">
                      <div className="max-w-md">
                        <h4 className="font-semibold text-sm text-gray-700 mb-3">
                          Resumen del documento {selectedDocument.documentNumber}
                        </h4>
                        <div className="space-y-2 bg-gray-50 p-4 rounded">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Unidades:</span>
                            <span className="font-mono">
                              {selectedDocument.items.reduce((sum, item) => sum + item.quantity, 0)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Art. diferentes:</span>
                            <span className="font-mono">{selectedDocument.items.length}</span>
                          </div>
                          <div className="border-t pt-2 mt-2"></div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-mono">${selectedDocument.subtotal.toLocaleString('es-CO')}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">IVA:</span>
                            <span className="font-mono">${(selectedDocument.tax || 0).toLocaleString('es-CO')}</span>
                          </div>
                          <div className="flex justify-between text-base font-bold border-t pt-2 mt-2">
                            <span>TOTAL:</span>
                            <span className="font-mono text-blue-600">${selectedDocument.total.toLocaleString('es-CO')}</span>
                          </div>
                          {selectedDocument.notes && (
                            <>
                              <div className="border-t pt-2 mt-2"></div>
                              <div className="text-sm">
                                <span className="text-gray-600 font-medium">Notas:</span>
                                <p className="text-gray-700 mt-1">{selectedDocument.notes}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Creación/Edición - EXACTO A FactuSOL */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
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
              {/* Panel Izquierdo - Búsqueda de Artículos */}
              <div className="w-[350px] border-r bg-gray-50 flex flex-col">
                <div className="p-4 bg-white border-b">
                  <h3 className="text-sm font-semibold mb-3 text-gray-700">Agregar artículos</h3>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => setIsProductSearchOpen(true)}
                  >
                    <Search className="h-4 w-4" />
                    Buscar artículos (F1)
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    Haz clic para buscar y agregar artículos al documento
                  </p>
                </div>

                <div className="flex-1 p-4 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Package className="h-16 w-16 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">
                      Usa el botón de arriba<br />
                      para buscar artículos
                    </p>
                  </div>
                </div>
              </div>

              {/* Panel Derecho - Datos del Documento */}
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b bg-white space-y-3">
                  <div className="grid grid-cols-5 gap-3">
                    <div>
                      <Label className="text-xs font-medium mb-1 block">ALMACÉN</Label>
                      <Input
                        value={warehouse}
                        onChange={(e) => setWarehouse(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs font-medium mb-1 block">PROVEEDOR *</Label>
                      <div className="flex gap-2">
                        <Input
                          value={supplierCode}
                          onChange={(e) => handleSupplierCodeChange(e.target.value)}
                          onKeyDown={handleSupplierKeyDown}
                          placeholder="Código"
                          className="h-8 text-sm w-24 font-mono"
                          title="Presiona F1 para buscar"
                        />
                        <Input
                          value={supplierName}
                          readOnly
                          placeholder="Nombre comercial"
                          className="h-8 text-sm flex-1 bg-gray-50"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => setIsSupplierSearchOpen(true)}
                          title="Buscar proveedor (F1)"
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs font-medium mb-1 block">Nº FACTURA PROVEEDOR</Label>
                      <Input
                        value={supplierInvoiceNumber}
                        onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                        placeholder="Ej: F-12345"
                        className="h-8 font-mono text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium mb-1 block">DOCUMENTO</Label>
                      <Input
                        value={editingDocument?.documentNumber || 'Autogenerado'}
                        className="h-8 font-mono text-sm"
                        disabled
                      />
                    </div>
                  </div>
                </div>

                {/* Tabla de Artículos */}
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
                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 0)}
                                    className="h-7 text-sm text-center"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item.unitCost}
                                    onChange={(e) => handleUpdatePrice(index, parseFloat(e.target.value) || 0)}
                                    className="h-7 text-sm text-right font-mono"
                                  />
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm font-medium">
                                  ${item.total.toLocaleString('es-CO')}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setItems(items.filter((_, i) => i !== index))}
                                    className="h-7 w-7 p-0"
                                  >
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

                {/* Pie con Totales y Observaciones */}
                <div className="border-t bg-gray-50 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Observaciones */}
                    <div>
                      <Label className="text-xs font-medium mb-1 block">OBSERVACIONES</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Notas internas del documento..."
                        rows={3}
                        className="text-sm resize-none"
                      />
                    </div>

                    {/* Totales */}
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

            {/* Botones de Acción */}
            <div className="flex justify-between items-center px-6 py-3 border-t bg-white">
              <div className="text-sm text-gray-500">
                {items.length} artículo{items.length !== 1 ? 's' : ''} agregado{items.length !== 1 ? 's' : ''}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} className="min-w-[120px]">
                  <FileText className="h-4 w-4 mr-2" />
                  {editingDocument ? 'Actualizar' : 'Guardar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Pago */}
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Marcar Factura como Pagada</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Factura: <span className="font-mono font-bold">{payingInvoice?.documentNumber}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Proveedor: <span className="font-medium">{payingInvoice ? resolveSupplierName(payingInvoice) : ''}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Total: <span className="font-mono font-bold text-lg">${payingInvoice?.total.toLocaleString('es-CO')}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Banco / Forma de Pago</Label>
                <Select value={selectedBank} onValueChange={setSelectedBank}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar banco..." />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.filter(b => b.isActive).map(bank => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.name}
                        {bank.balance !== undefined && (
                          <span className="text-xs text-gray-500 ml-2">
                            (Saldo: ${bank.balance.toLocaleString('es-CO')})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm text-yellow-800">
                <p className="font-medium">⚠️ Atención:</p>
                <p>Se debitará ${payingInvoice?.total.toLocaleString('es-CO')} del banco seleccionado.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleMarkAsPaid}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar Pago
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Proveedor */}
        <SupplierFormDialog
          open={isSupplierModalOpen}
          onOpenChange={setIsSupplierModalOpen}
          supplier={editingSupplier}
          onSave={handleSaveSupplier}
        />

        {/* Modal de Búsqueda de Proveedor */}
        <SupplierSearchDialog
          open={isSupplierSearchOpen}
          onOpenChange={setIsSupplierSearchOpen}
          suppliers={suppliers}
          onSelect={handleSelectSupplier}
          onNewSupplier={() => {
            setIsSupplierSearchOpen(false);
            setEditingSupplier(null);
            setIsSupplierModalOpen(true);
          }}
        />

        {/* Modal de Búsqueda de Productos */}
        <ProductSearchDialog
          open={isProductSearchOpen}
          onOpenChange={setIsProductSearchOpen}
          products={products}
          categories={categories}
          onSelect={handleSelectProduct}
          onNewProduct={() => {
            setIsProductSearchOpen(false);
            setEditingProduct(null);
            setIsProductFormOpen(true);
          }}
        />

        {/* Modal de Formulario de Producto */}
        <ProductFormDialog
          open={isProductFormOpen}
          onOpenChange={setIsProductFormOpen}
          product={editingProduct}
          categories={categories}
          suppliers={suppliers}
          onSave={handleSaveProduct}
          onAddCategory={(name, description) => {
            addCategory(name, description);
          }}
        />
      </div>
    </ScrollArea>
  );
}
