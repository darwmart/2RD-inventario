import { useState } from 'react';
import { useSales } from '@/hooks/useSales';
import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, CreditCard, Trash2, Calendar, Percent, Landmark, Edit, Edit2, Printer, Barcode, Star, Eye, Download, Upload, Database } from 'lucide-react';
import { toast } from 'sonner';
import { Bank, Printer as PrinterType } from '@/types';
import { importSampleData, clearAllData } from '@/utils/importSampleData';

export default function Settings() {
  const { paymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod } = useSales();
  const { cardSettings, updateCardSettings, companyInfo, updateCompanyInfo, taxSettings, updateTaxSettings, banks, addBank, updateBank, deleteBank, printers, addPrinter, updatePrinter, deletePrinter, setDefaultPrinter, labelDesigns, addLabelDesign, updateLabelDesign, deleteLabelDesign } = useSettings();

  const [selectedSection, setSelectedSection] = useState('metodos-pago');
  const [isAddingPaymentMethod, setIsAddingPaymentMethod] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    name: '',
    type: 'electronic' as 'cash' | 'electronic' | 'credit'
  });

  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [bankForm, setBankForm] = useState({
    name: '',
  });

  // Estados para impresoras
  const [isPrinterDialogOpen, setIsPrinterDialogOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterType | null>(null);
  const [printerForm, setPrinterForm] = useState({
    name: '',
    type: 'thermal' as 'thermal' | 'laser' | 'inkjet' | 'network',
    paperSize: 'A4',
  });

  // Estados para configuración de etiquetas de código de barras
  const [selectedDocumentType, setSelectedDocumentType] = useState('Etiquetas de artículos');
  const [isLabelDialogOpen, setIsLabelDialogOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [labelForm, setLabelForm] = useState({
    code: '',
    name: '',
    description: '',
    printerName: 'Send To OneNote 2016',
    labelWidth: '75,00',
    labelHeight: '25,00',
    labelsPerRow: '3',
    labelsPerColumn: '9',
    topMargin: '12,00',
    leftMargin: '5,60',
    horizontalSpacing: '1,00',
    verticalSpacing: '2,00'
  });

  // Estados para el diálogo antiguo de código de barras (legacy)
  const [isBarcodeDialogOpen, setIsBarcodeDialogOpen] = useState(false);
  const [barcodeConfig, setBarcodeConfig] = useState({
    modelCode: '',
    modelName: '',
    printerName: 'Send To OneNote 2016',
    labelWidth: '75,00',
    labelHeight: '25,00',
    labelsPerRow: '3',
    labelsPerColumn: '9',
    topMargin: '12,00',
    leftMargin: '5,60',
    horizontalSpacing: '1,00',
    verticalSpacing: '2,00'
  });

  const handleAddPaymentMethod = () => {
    if (!newPaymentMethod.name.trim()) {
      toast.error('El nombre del método de pago es requerido');
      return;
    }

    addPaymentMethod(newPaymentMethod.name.trim(), newPaymentMethod.type);
    toast.success('Método de pago agregado exitosamente');

    setNewPaymentMethod({ name: '', type: 'electronic' });
    setIsAddingPaymentMethod(false);
  };

  const getPaymentTypeLabel = (type: 'cash' | 'electronic' | 'credit') => {
    switch (type) {
      case 'cash':
        return 'Efectivo';
      case 'electronic':
        return 'Electrónico';
      case 'credit':
        return 'Crédito';
      default:
        return type;
    }
  };

  const getPaymentTypeBadgeColor = (type: 'cash' | 'electronic' | 'credit') => {
    switch (type) {
      case 'cash':
        return 'default';
      case 'electronic':
        return 'secondary';
      case 'credit':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const handleOpenBankDialog = (bank?: Bank) => {
    if (bank) {
      setEditingBank(bank);
      setBankForm({ name: bank.name });
    } else {
      setEditingBank(null);
      setBankForm({ name: '' });
    }
    setIsBankDialogOpen(true);
  };

  const handleSaveBank = () => {
    if (!bankForm.name.trim()) {
      toast.error('El nombre del banco es requerido');
      return;
    }

    if (editingBank) {
      updateBank(editingBank.id, { name: bankForm.name.trim() });
      toast.success('Banco actualizado exitosamente');
    } else {
      const newBank: Bank = {
        id: bankForm.name.toLowerCase().replace(/\s+/g, '-'),
        name: bankForm.name.trim(),
        isActive: true,
      };
      addBank(newBank);
      toast.success('Banco agregado exitosamente');
    }

    setBankForm({ name: '' });
    setEditingBank(null);
    setIsBankDialogOpen(false);
  };

  const handleDeleteBank = (bankId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este banco?')) {
      deleteBank(bankId);
      toast.success('Banco eliminado exitosamente');
    }
  };

  const handleDeletePaymentMethod = (methodId: string, methodName: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar el método de pago "${methodName}"?`)) {
      deletePaymentMethod(methodId);
      toast.success('Método de pago eliminado exitosamente');
    }
  };

  const handleOpenPrinterDialog = (printer?: PrinterType) => {
    if (printer) {
      setEditingPrinter(printer);
      setPrinterForm({
        name: printer.name,
        type: printer.type,
        paperSize: printer.paperSize || 'A4',
      });
    } else {
      setEditingPrinter(null);
      setPrinterForm({ name: '', type: 'thermal', paperSize: 'A4' });
    }
    setIsPrinterDialogOpen(true);
  };

  const handleSavePrinter = () => {
    if (!printerForm.name.trim()) {
      toast.error('El nombre de la impresora es requerido');
      return;
    }

    if (editingPrinter) {
      updatePrinter(editingPrinter.id, {
        name: printerForm.name.trim(),
        type: printerForm.type,
        paperSize: printerForm.paperSize,
      });
      toast.success('Impresora actualizada exitosamente');
    } else {
      const newPrinter: PrinterType = {
        id: printerForm.name.toLowerCase().replace(/\s+/g, '-'),
        name: printerForm.name.trim(),
        type: printerForm.type,
        paperSize: printerForm.paperSize,
        isActive: true,
        isDefault: false,
        createdAt: new Date(),
      };
      addPrinter(newPrinter);
      toast.success('Impresora agregada exitosamente');
    }

    setPrinterForm({ name: '', type: 'thermal', paperSize: 'A4' });
    setEditingPrinter(null);
    setIsPrinterDialogOpen(false);
  };

  const handleDeletePrinter = (printerId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta impresora?')) {
      deletePrinter(printerId);
      toast.success('Impresora eliminada exitosamente');
    }
  };

  const handleSetDefaultPrinter = (printerId: string) => {
    setDefaultPrinter(printerId);
    toast.success('Impresora predeterminada actualizada');
  };

  const handleOpenLabelDialog = (labelId?: string) => {
    if (labelId) {
      const label = labelDesigns.find(d => d.id === labelId);
      if (label) {
        setEditingLabel(labelId);
        setLabelForm({
          code: label.code,
          name: label.name,
          description: label.description || '',
          printerName: label.printerName,
          labelWidth: label.labelWidth,
          labelHeight: label.labelHeight,
          labelsPerRow: label.labelsPerRow,
          labelsPerColumn: label.labelsPerColumn,
          topMargin: label.topMargin,
          leftMargin: label.leftMargin,
          horizontalSpacing: label.horizontalSpacing,
          verticalSpacing: label.verticalSpacing,
        });
      }
    } else {
      setEditingLabel(null);
      setLabelForm({
        code: '',
        name: '',
        description: '',
        printerName: 'Send To OneNote 2016',
        labelWidth: '75,00',
        labelHeight: '25,00',
        labelsPerRow: '3',
        labelsPerColumn: '9',
        topMargin: '12,00',
        leftMargin: '5,60',
        horizontalSpacing: '1,00',
        verticalSpacing: '2,00'
      });
    }
    setIsLabelDialogOpen(true);
  };

  const handleSaveLabel = () => {
    if (!labelForm.code.trim() || !labelForm.name.trim()) {
      toast.error('El código y nombre son requeridos');
      return;
    }

    if (editingLabel) {
      updateLabelDesign(editingLabel, {
        code: labelForm.code.trim(),
        name: labelForm.name.trim(),
        description: labelForm.description.trim(),
        printerName: labelForm.printerName,
        labelWidth: labelForm.labelWidth,
        labelHeight: labelForm.labelHeight,
        labelsPerRow: labelForm.labelsPerRow,
        labelsPerColumn: labelForm.labelsPerColumn,
        topMargin: labelForm.topMargin,
        leftMargin: labelForm.leftMargin,
        horizontalSpacing: labelForm.horizontalSpacing,
        verticalSpacing: labelForm.verticalSpacing,
      });
      toast.success('Diseño actualizado exitosamente');
    } else {
      const newLabel: any = {
        id: Date.now().toString(),
        code: labelForm.code.trim(),
        name: labelForm.name.trim(),
        description: labelForm.description.trim(),
        documentType: selectedDocumentType,
        printerName: labelForm.printerName,
        labelWidth: labelForm.labelWidth,
        labelHeight: labelForm.labelHeight,
        labelsPerRow: labelForm.labelsPerRow,
        labelsPerColumn: labelForm.labelsPerColumn,
        topMargin: labelForm.topMargin,
        leftMargin: labelForm.leftMargin,
        horizontalSpacing: labelForm.horizontalSpacing,
        verticalSpacing: labelForm.verticalSpacing,
        createdAt: new Date(),
      };
      addLabelDesign(newLabel);
      toast.success('Diseño creado exitosamente');
    }

    setEditingLabel(null);
    setIsLabelDialogOpen(false);
  };

  const handleDeleteLabel = (labelId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este diseño?')) {
      deleteLabelDesign(labelId);
      toast.success('Diseño eliminado exitosamente');
      if (selectedLabel === labelId) {
        setSelectedLabel(null);
      }
    }
  };

  const filteredDesigns = labelDesigns.filter(d => d.documentType === selectedDocumentType);

  const sections = [
    { id: 'metodos-pago', name: 'Métodos de Pago', icon: '💳' },
    { id: 'bancos', name: 'Bancos', icon: '🏦' },
    { id: 'impresoras', name: 'Impresoras', icon: '🖨️' },
    { id: 'general', name: 'Configuración General', icon: '⚙️' },
    { id: 'tarjetas', name: 'Config. Tarjetas', icon: '💳' },
    { id: 'etiquetas', name: 'Etiquetas Código', icon: '🏷️' },
    { id: 'datos-prueba', name: 'Datos de Prueba', icon: '📦' },
    { id: 'sistema', name: 'Info. Sistema', icon: 'ℹ️' }
  ];

  return (
    <ScrollArea className="h-screen">
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Barra Superior */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Configuración</h1>
          <p className="text-sm text-gray-600">Personaliza tu sistema de ventas e inventario</p>
        </div>

        {/* Vista tipo FactuSOL */}
        <div className="flex h-[calc(100vh-140px)] gap-4">
          {/* Panel Izquierdo - Secciones */}
          <div className="w-64 border rounded bg-white p-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Secciones</h3>
            <div className="space-y-1">
              {sections.map(section => (
                <div
                  key={section.id}
                  className={`px-3 py-2 text-sm rounded cursor-pointer ${
                    selectedSection === section.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedSection(section.id)}
                >
                  {section.icon} {section.name}
                </div>
              ))}
            </div>
          </div>

          {/* Panel Derecho - Contenido */}
          <div className="flex-1 border rounded bg-white overflow-auto">
            <div className="p-6">

              {/* SECCIÓN: Métodos de Pago */}
              {selectedSection === 'metodos-pago' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-xl font-bold flex items-center">
                        <CreditCard className="h-5 w-5 mr-2" />
                        Métodos de Pago
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">Administra los métodos de pago disponibles</p>
                    </div>
                    <Dialog open={isAddingPaymentMethod} onOpenChange={setIsAddingPaymentMethod}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Agregar Método de Pago</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="payment-name">Nombre del Método</Label>
                            <Input
                              id="payment-name"
                              value={newPaymentMethod.name}
                              onChange={(e) => setNewPaymentMethod({...newPaymentMethod, name: e.target.value})}
                              placeholder="Ej: PayPal, Wompi, etc."
                            />
                          </div>
                          <div>
                            <Label>Tipo de Método</Label>
                            <Select
                              value={newPaymentMethod.type}
                              onValueChange={(value: 'cash' | 'electronic' | 'credit') =>
                                setNewPaymentMethod({...newPaymentMethod, type: value})
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">Efectivo</SelectItem>
                                <SelectItem value="electronic">Electrónico</SelectItem>
                                <SelectItem value="credit">Crédito</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsAddingPaymentMethod(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleAddPaymentMethod}>
                              Agregar Método
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="space-y-3">
                    {paymentMethods && paymentMethods.length > 0 ? (
                      paymentMethods.map(method => (
                        <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-gray-500" />
                            <div>
                              <p className="font-medium">{method.name}</p>
                              <Badge
                                variant={getPaymentTypeBadgeColor(method.type)}
                                className="text-xs mt-1"
                              >
                                {getPaymentTypeLabel(method.type)}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={method.isActive}
                              onCheckedChange={(checked) => {
                                updatePaymentMethod(method.id, { isActive: checked });
                                toast.success(checked ? `${method.name} activado` : `${method.name} desactivado`);
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeletePaymentMethod(method.id, method.name)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-8">No hay métodos de pago configurados</p>
                    )}
                  </div>
                </div>
              )}

              {/* SECCIÓN: Bancos */}
              {selectedSection === 'bancos' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-xl font-bold flex items-center">
                        <Landmark className="h-5 w-5 mr-2" />
                        Bancos / Entidades Financieras
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">Administra los bancos disponibles</p>
                    </div>
                    <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => handleOpenBankDialog()}>
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {editingBank ? 'Editar Banco' : 'Agregar Banco'}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="bank-name">Nombre del Banco</Label>
                            <Input
                              id="bank-name"
                              value={bankForm.name}
                              onChange={(e) => setBankForm({ name: e.target.value })}
                              placeholder="Ej: Bancolombia, Davivienda, etc."
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsBankDialogOpen(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleSaveBank}>
                              {editingBank ? 'Guardar Cambios' : 'Agregar Banco'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="space-y-3">
                    {banks && banks.length > 0 ? (
                      banks.map(bank => (
                        <div key={bank.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Landmark className="h-5 w-5 text-gray-500" />
                            <div>
                              <p className="font-medium">{bank.name}</p>
                              <Badge variant={bank.isActive ? 'default' : 'secondary'} className="text-xs mt-1">
                                {bank.isActive ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenBankDialog(bank)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Switch
                              checked={bank.isActive}
                              onCheckedChange={(checked) => {
                                updateBank(bank.id, { isActive: checked });
                                toast.success(checked ? `${bank.name} activado` : `${bank.name} desactivado`);
                              }}
                            />
                            {bank.id !== 'efectivo' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteBank(bank.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-8">No hay bancos configurados</p>
                    )}
                  </div>
                </div>
              )}

              {/* SECCIÓN: Impresoras */}
              {selectedSection === 'impresoras' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-xl font-bold flex items-center">
                        <Printer className="h-5 w-5 mr-2" />
                        Impresoras
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">Administra las impresoras del sistema</p>
                    </div>
                    <Dialog open={isPrinterDialogOpen} onOpenChange={setIsPrinterDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => handleOpenPrinterDialog()}>
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {editingPrinter ? 'Editar Impresora' : 'Agregar Impresora'}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="printer-name">Nombre de la Impresora</Label>
                            <Input
                              id="printer-name"
                              value={printerForm.name}
                              onChange={(e) => setPrinterForm({ ...printerForm, name: e.target.value })}
                              placeholder="Ej: HP LaserJet, Epson TM-T20..."
                            />
                          </div>
                          <div>
                            <Label>Tipo de Impresora</Label>
                            <Select
                              value={printerForm.type}
                              onValueChange={(value: 'thermal' | 'laser' | 'inkjet' | 'network') =>
                                setPrinterForm({ ...printerForm, type: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="thermal">Térmica (POS)</SelectItem>
                                <SelectItem value="laser">Láser</SelectItem>
                                <SelectItem value="inkjet">Inyección de Tinta</SelectItem>
                                <SelectItem value="network">Red/Virtual</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Tamaño de Papel</Label>
                            <Select
                              value={printerForm.paperSize}
                              onValueChange={(value) =>
                                setPrinterForm({ ...printerForm, paperSize: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="A4">A4 (210 x 297 mm)</SelectItem>
                                <SelectItem value="Letter">Carta (216 x 279 mm)</SelectItem>
                                <SelectItem value="80mm">80mm (Ticket)</SelectItem>
                                <SelectItem value="58mm">58mm (Ticket)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsPrinterDialogOpen(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleSavePrinter}>
                              {editingPrinter ? 'Guardar Cambios' : 'Agregar Impresora'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="space-y-3">
                    {printers && printers.length > 0 ? (
                      printers.map(printer => (
                        <div key={printer.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Printer className="h-5 w-5 text-gray-500" />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{printer.name}</p>
                                {printer.isDefault && (
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {printer.type === 'thermal' && 'Térmica'}
                                  {printer.type === 'laser' && 'Láser'}
                                  {printer.type === 'inkjet' && 'Inyección'}
                                  {printer.type === 'network' && 'Red'}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {printer.paperSize}
                                </Badge>
                                {printer.isDefault && (
                                  <Badge variant="default" className="text-xs">
                                    Predeterminada
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenPrinterDialog(printer)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {!printer.isDefault && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSetDefaultPrinter(printer.id)}
                                title="Establecer como predeterminada"
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                            )}
                            <Switch
                              checked={printer.isActive}
                              onCheckedChange={(checked) => {
                                updatePrinter(printer.id, { isActive: checked });
                                toast.success(checked ? `${printer.name} activada` : `${printer.name} desactivada`);
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeletePrinter(printer.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-8">No hay impresoras configuradas</p>
                    )}
                  </div>
                </div>
              )}

              {/* SECCIÓN: Configuración General */}
              {selectedSection === 'general' && (
                <div>
                  <h2 className="text-xl font-bold mb-6">Configuración General</h2>

                  <div className="space-y-6">
                    {/* Opciones Generales */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Alertas de Stock Bajo</p>
                          <p className="text-sm text-gray-600">
                            Recibir notificaciones cuando los productos estén por agotarse
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Validación de Stock</p>
                          <p className="text-sm text-gray-600">
                            Verificar disponibilidad antes de completar ventas
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Precios Modificables</p>
                          <p className="text-sm text-gray-600">
                            Permitir cambiar precios durante las ventas
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Auto-guardar Cotizaciones</p>
                          <p className="text-sm text-gray-600">
                            Guardar automáticamente las cotizaciones cada 30 segundos
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>

                    {/* Configuración de Moneda */}
                    <div className="border-t pt-6">
                      <h3 className="font-semibold mb-4">Configuración de Moneda</h3>
                      <div className="space-y-4">
                        <div>
                          <Label>Símbolo de Moneda</Label>
                          <Select defaultValue="COP">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="COP">$ (Peso Colombiano)</SelectItem>
                              <SelectItem value="USD">$ (Dólar)</SelectItem>
                              <SelectItem value="EUR">€ (Euro)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Formato de Números</Label>
                          <Select defaultValue="es-CO">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="es-CO">1.234.567,89 (Colombia)</SelectItem>
                              <SelectItem value="en-US">1,234,567.89 (Estados Unidos)</SelectItem>
                              <SelectItem value="es-ES">1.234.567,89 (España)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Configuración de IVA */}
                    <div className="border-t pt-6">
                      <h3 className="font-semibold mb-4">Configuración de IVA</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">Aplicar IVA</p>
                            <p className="text-xs text-gray-600">Incluir impuesto en los precios de venta</p>
                          </div>
                          <Switch
                            checked={taxSettings.ivaEnabled}
                            onCheckedChange={(checked) => {
                              updateTaxSettings({ ivaEnabled: checked });
                              toast.success(checked ? 'IVA activado' : 'IVA desactivado');
                            }}
                          />
                        </div>

                        <div>
                          <Label>Porcentaje de IVA (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={taxSettings.ivaPercentage}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (isNaN(v) || v < 0 || v > 100) { toast.error('El IVA debe estar entre 0% y 100%'); return; }
                              updateTaxSettings({ ivaPercentage: v });
                            }}
                            placeholder="19"
                            disabled={!taxSettings.ivaEnabled}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Ejemplo: 19 = 19% de IVA
                          </p>
                        </div>

                        {taxSettings.ivaEnabled && (
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm font-medium text-blue-900 mb-2">Ejemplo de Cálculo:</p>
                            <div className="space-y-1 text-sm text-blue-800">
                              <p>Precio base: $100.000</p>
                              <p>IVA ({taxSettings.ivaPercentage}%): ${(100000 * taxSettings.ivaPercentage / 100).toLocaleString('es-CO')}</p>
                              <p className="font-bold pt-2 border-t border-blue-300">
                                Precio final con IVA: ${(100000 + (100000 * taxSettings.ivaPercentage / 100)).toLocaleString('es-CO')}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Información de la Empresa */}
                    <div className="border-t pt-6">
                      <h3 className="font-semibold mb-4">Información de la Empresa</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Esta información se imprimirá en las facturas POS
                      </p>
                      <div className="space-y-4">
                        <div>
                          <Label>Nombre de la Empresa</Label>
                          <Input
                            placeholder="Mi Tienda"
                            value={companyInfo.name}
                            onChange={(e) => updateCompanyInfo({ name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>NIT/RUT</Label>
                          <Input
                            placeholder="123456789-0"
                            value={companyInfo.nit}
                            onChange={(e) => updateCompanyInfo({ nit: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Dirección</Label>
                          <Input
                            placeholder="Calle 123 #45-67"
                            value={companyInfo.address}
                            onChange={(e) => updateCompanyInfo({ address: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Teléfono</Label>
                          <Input
                            placeholder="(57) 300 123 4567"
                            value={companyInfo.phone}
                            onChange={(e) => updateCompanyInfo({ phone: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Email (Opcional)</Label>
                          <Input
                            type="email"
                            placeholder="contacto@mitienda.com"
                            value={companyInfo.email || ''}
                            onChange={(e) => updateCompanyInfo({ email: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECCIÓN: Configuración de Tarjetas */}
              {selectedSection === 'tarjetas' && (
                <div>
                  <h2 className="text-xl font-bold mb-6 flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Configuración de Tarjetas Débito y Crédito
                  </h2>

                  <div className="space-y-6">
                    {/* Retraso de Acreditación */}
                    <div className="border-b pb-6">
                      <div className="flex items-center justify-between mb-4 p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="font-medium">Retraso de Acreditación</p>
                            <p className="text-sm text-gray-600">
                              Las tarjetas se acreditan al día siguiente (lunes si es fin de semana)
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={cardSettings.delayEnabled}
                          onCheckedChange={(checked) => {
                            updateCardSettings({ delayEnabled: checked });
                            toast.success(checked ? 'Retraso de acreditación activado' : 'Retraso de acreditación desactivado');
                          }}
                        />
                      </div>
                      <div className="p-4 bg-amber-50 rounded-lg">
                        <p className="text-sm text-amber-800">
                          <strong>Nota:</strong> Cuando está activo, las ventas con tarjeta en Colpatria
                          se verán reflejadas el día siguiente hábil (no fines de semana).
                        </p>
                      </div>
                    </div>

                    {/* Comisiones y Retenciones */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Percent className="h-5 w-5 text-gray-500" />
                        <h3 className="font-semibold">Comisiones y Retenciones</h3>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">Aplicar Comisiones</p>
                          <p className="text-xs text-gray-600">Descontar comisión bancaria de las tarjetas</p>
                        </div>
                        <Switch
                          checked={cardSettings.commissionsEnabled}
                          onCheckedChange={(checked) => {
                            updateCardSettings({ commissionsEnabled: checked });
                            toast.success(checked ? 'Comisiones activadas' : 'Comisiones desactivadas');
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Comisión Tarjeta Débito (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={cardSettings.debitCommission}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (isNaN(v) || v < 0 || v > 100) { toast.error('La comisión debe estar entre 0% y 100%'); return; }
                              updateCardSettings({ debitCommission: v });
                            }}
                            placeholder="1.9"
                            disabled={!cardSettings.commissionsEnabled}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Ejemplo: 1.9 = 1.9% de comisión
                          </p>
                        </div>
                        <div>
                          <Label>Comisión Tarjeta Crédito (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={cardSettings.creditCommission}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (isNaN(v) || v < 0 || v > 100) { toast.error('La comisión debe estar entre 0% y 100%'); return; }
                              updateCardSettings({ creditCommission: v });
                            }}
                            placeholder="2.9"
                            disabled={!cardSettings.commissionsEnabled}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Ejemplo: 2.9 = 2.9% de comisión
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">Aplicar Reteiva</p>
                          <p className="text-xs text-gray-600">Descontar retención del IVA</p>
                        </div>
                        <Switch
                          checked={cardSettings.reteivaEnabled}
                          onCheckedChange={(checked) => {
                            updateCardSettings({ reteivaEnabled: checked });
                            toast.success(checked ? 'Reteiva activada' : 'Reteiva desactivada');
                          }}
                        />
                      </div>

                      <div>
                        <Label>Reteiva (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={cardSettings.reteiva}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (isNaN(v) || v < 0 || v > 100) { toast.error('El reteiva debe estar entre 0% y 100%'); return; }
                            updateCardSettings({ reteiva: v });
                          }}
                          placeholder="0.4"
                          disabled={!cardSettings.reteivaEnabled}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Ejemplo: 0.4 = 0.4% de retención
                        </p>
                      </div>

                      {(cardSettings.commissionsEnabled || cardSettings.reteivaEnabled) && (
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm font-medium text-blue-900 mb-2">Ejemplo de Cálculo:</p>
                          <div className="space-y-1 text-sm text-blue-800">
                            <p>Venta con Tarjeta Débito: $100.000</p>
                            {cardSettings.commissionsEnabled && (
                              <p>- Comisión débito ({cardSettings.debitCommission}%): ${(100000 * cardSettings.debitCommission / 100).toLocaleString('es-CO')}</p>
                            )}
                            {cardSettings.reteivaEnabled && (
                              <p>- Reteiva ({cardSettings.reteiva}%): ${(100000 * cardSettings.reteiva / 100).toLocaleString('es-CO')}</p>
                            )}
                            <p className="font-bold pt-2 border-t border-blue-300">
                              Total recibido: ${(100000 -
                                (cardSettings.commissionsEnabled ? 100000 * cardSettings.debitCommission / 100 : 0) -
                                (cardSettings.reteivaEnabled ? 100000 * cardSettings.reteiva / 100 : 0)
                              ).toLocaleString('es-CO')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SECCIÓN: Etiquetas de Código de Barras */}
              {selectedSection === 'etiquetas' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-xl font-bold flex items-center">
                        <Barcode className="h-5 w-5 mr-2" />
                        Diseños de Etiquetas
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Administra los diseños de etiquetas por tipo de documento
                      </p>
                    </div>
                  </div>

                  {/* Selector de Tipo de Documento */}
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Tipo de documento:
                    </label>
                    <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                      <SelectTrigger className="w-full md:w-80">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Etiquetas de artículos">Etiquetas de artículos</SelectItem>
                        <SelectItem value="Pagarés">Pagarés</SelectItem>
                        <SelectItem value="Traspaso entre almacenes">Traspaso entre almacenes</SelectItem>
                        <SelectItem value="Etiquetas personalizadas">Etiquetas personalizadas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tabla de diseños */}
                  <div className="border rounded-lg mb-4 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Impresora</TableHead>
                          <TableHead className="text-center">Tamaño (mm)</TableHead>
                          <TableHead className="text-center">Etiq. por hoja</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDesigns.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                              No hay diseños para este tipo de documento
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredDesigns.map((design) => (
                            <TableRow
                              key={design.id}
                              className={`cursor-pointer hover:bg-gray-50 ${
                                selectedLabel === design.id ? 'bg-blue-50' : ''
                              }`}
                              onClick={() => setSelectedLabel(design.id)}
                            >
                              <TableCell>
                                <div className="w-2 h-2 rounded-full bg-blue-500 mx-auto"></div>
                              </TableCell>
                              <TableCell className="font-medium">{design.code}</TableCell>
                              <TableCell>{design.name}</TableCell>
                              <TableCell className="text-sm text-gray-600">{design.printerName}</TableCell>
                              <TableCell className="text-center text-sm">
                                {design.labelWidth} x {design.labelHeight}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {parseInt(design.labelsPerRow) * parseInt(design.labelsPerColumn)}
                                <span className="text-gray-500 ml-1">
                                  ({design.labelsPerRow}x{design.labelsPerColumn})
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => handleOpenLabelDialog()}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo
                    </Button>
                    <Button
                      onClick={() => handleOpenLabelDialog(selectedLabel)}
                      size="sm"
                      variant="outline"
                      disabled={!selectedLabel}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      onClick={() => selectedLabel && handleDeleteLabel(selectedLabel)}
                      size="sm"
                      variant="outline"
                      disabled={!selectedLabel}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Importar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  </div>

                  {/* Panel de vista previa */}
                  {selectedLabel && (
                    <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Vista Previa - {filteredDesigns.find(d => d.id === selectedLabel)?.name}
                      </h4>
                      <div className="flex justify-center p-6 bg-white rounded border">
                        <div
                          className="border-2 border-black p-4 bg-white"
                          style={{
                            width: `${parseFloat(filteredDesigns.find(d => d.id === selectedLabel)?.labelWidth.replace(',', '.') || '75') * 3.78}px`,
                            height: `${parseFloat(filteredDesigns.find(d => d.id === selectedLabel)?.labelHeight.replace(',', '.') || '25') * 3.78}px`,
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <p className="text-xs font-medium mb-1 truncate">Descripción del artículo</p>
                          <p className="text-xs mb-2 truncate">Ref: ABC123    P.V.P.:    10,00 €</p>
                          <div className="flex flex-col items-center justify-center" style={{ marginTop: 'auto' }}>
                            <svg width="140" height="30">
                              <rect x="0" width="2" height="30" fill="black"/>
                              <rect x="4" width="1" height="30" fill="black"/>
                              <rect x="7" width="2" height="30" fill="black"/>
                              <rect x="11" width="1" height="30" fill="black"/>
                              <rect x="14" width="2" height="30" fill="black"/>
                              <rect x="18" width="1" height="30" fill="black"/>
                              <rect x="21" width="3" height="30" fill="black"/>
                              <rect x="26" width="1" height="30" fill="black"/>
                              <rect x="29" width="2" height="30" fill="black"/>
                              <rect x="33" width="1" height="30" fill="black"/>
                            </svg>
                            <p className="text-xs mt-1 font-mono">1234567890</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECCIÓN: Información del Sistema */}
              {/* SECCIÓN: Datos de Prueba */}
              {selectedSection === 'datos-prueba' && (
                <div>
                  <h2 className="text-xl font-bold mb-6">Datos de Prueba - FactuSOL</h2>

                  <div className="space-y-6">
                    <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Importar Productos de Prueba
                      </h3>
                      <p className="text-sm text-gray-700 mb-4">
                        Importa más de 250 productos reales de FactuSOL para realizar pruebas en el sistema.
                        Incluye categorías, precios, códigos de barras y stock inicial.
                      </p>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => {
                            const result = importSampleData();
                            if (result.success) {
                              toast.success(result.message);
                              setTimeout(() => window.location.reload(), 1500);
                            } else {
                              toast.error(result.message);
                            }
                          }}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Importar Datos de Prueba
                        </Button>
                      </div>
                    </div>

                    <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-yellow-800">
                        <Trash2 className="h-5 w-5" />
                        Zona de Peligro
                      </h3>
                      <p className="text-sm text-gray-700 mb-4">
                        <strong>Advertencia:</strong> Esta acción eliminará TODOS los datos del sistema
                        (productos, categorías, ventas, compras, etc.). Esta operación no se puede deshacer.
                      </p>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          const result = clearAllData();
                          if (result.success) {
                            toast.success(result.message);
                            setTimeout(() => window.location.reload(), 1500);
                          } else {
                            toast.info(result.message);
                          }
                        }}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar Todos los Datos
                      </Button>
                    </div>

                    <div className="p-6 bg-gray-50 rounded-lg border">
                      <h3 className="text-lg font-semibold mb-3">Información de los Datos de Prueba</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-600">Total de Productos:</p>
                          <p className="text-2xl font-bold text-blue-600">254</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600">Categorías:</p>
                          <p className="text-2xl font-bold text-green-600">9</p>
                        </div>
                      </div>
                      <div className="mt-4 text-xs text-gray-600">
                        <p><strong>Categorías incluidas:</strong></p>
                        <p className="mt-1">Ropa y Protección, Luces y Exploradoras, Accesorios, Cascos,
                        Electrónica, Guantes, Defensas, Espejos, Servicios</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedSection === 'sistema' && (
                <div>
                  <h2 className="text-xl font-bold mb-6">Información del Sistema</h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-6 bg-gray-50 rounded-lg border">
                      <p className="font-medium text-gray-600 mb-2">Versión</p>
                      <p className="text-3xl font-bold text-blue-600">1.0.0</p>
                    </div>
                    <div className="text-center p-6 bg-gray-50 rounded-lg border">
                      <p className="font-medium text-gray-600 mb-2">Almacenamiento</p>
                      <p className="text-3xl font-bold text-green-600">Local</p>
                    </div>
                    <div className="text-center p-6 bg-gray-50 rounded-lg border">
                      <p className="font-medium text-gray-600 mb-2">Estado</p>
                      <p className="text-3xl font-bold text-green-600">Activo</p>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Nota:</strong> Este sistema utiliza almacenamiento local del navegador.
                      Los datos se mantienen en tu dispositivo de forma segura.
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Modal de Configuración de Etiquetas */}
        <Dialog open={isBarcodeDialogOpen} onOpenChange={setIsBarcodeDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Barcode className="h-5 w-5" />
                Diseñador de Etiquetas de Código de Barras
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Vista Previa de Etiqueta */}
              <div className="border-b pb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Printer className="h-4 w-4 text-gray-500" />
                  <h4 className="font-medium">Vista Previa</h4>
                </div>
                <div className="flex justify-center p-8 bg-gray-50 rounded-lg">
                  <div
                    className="border-2 border-black p-4 bg-white"
                    style={{
                      width: `${parseFloat(barcodeConfig.labelWidth.replace(',', '.')) * 3.78}px`,
                      height: `${parseFloat(barcodeConfig.labelHeight.replace(',', '.')) * 3.78}px`,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <p className="text-xs font-medium mb-1 truncate">Descripción del artículo</p>
                    <p className="text-xs mb-2 truncate">Ref: Referencia    P.V.P.:    10,00 €</p>
                    <div className="flex flex-col items-center justify-center" style={{ marginTop: 'auto' }}>
                      <svg
                        className="mb-1"
                        width={Math.min(140, parseFloat(barcodeConfig.labelWidth.replace(',', '.')) * 3.78 - 20)}
                        height="30"
                      >
                        <rect x="0" width="2" height="30" fill="black"/>
                        <rect x="4" width="1" height="30" fill="black"/>
                        <rect x="7" width="3" height="30" fill="black"/>
                        <rect x="12" width="1" height="30" fill="black"/>
                        <rect x="15" width="2" height="30" fill="black"/>
                        <rect x="19" width="1" height="30" fill="black"/>
                        <rect x="22" width="3" height="30" fill="black"/>
                        <rect x="27" width="2" height="30" fill="black"/>
                        <rect x="31" width="1" height="30" fill="black"/>
                        <rect x="34" width="2" height="30" fill="black"/>
                        <rect x="38" width="1" height="30" fill="black"/>
                        <rect x="41" width="3" height="30" fill="black"/>
                        <rect x="46" width="1" height="30" fill="black"/>
                        <rect x="49" width="2" height="30" fill="black"/>
                        <rect x="53" width="3" height="30" fill="black"/>
                        <rect x="58" width="1" height="30" fill="black"/>
                        <rect x="61" width="2" height="30" fill="black"/>
                        <rect x="65" width="1" height="30" fill="black"/>
                        <rect x="68" width="3" height="30" fill="black"/>
                        <rect x="73" width="2" height="30" fill="black"/>
                        <rect x="77" width="1" height="30" fill="black"/>
                        <rect x="80" width="2" height="30" fill="black"/>
                        <rect x="84" width="1" height="30" fill="black"/>
                        <rect x="87" width="3" height="30" fill="black"/>
                        <rect x="92" width="1" height="30" fill="black"/>
                        <rect x="95" width="2" height="30" fill="black"/>
                        <rect x="99" width="1" height="30" fill="black"/>
                        <rect x="102" width="3" height="30" fill="black"/>
                        <rect x="107" width="2" height="30" fill="black"/>
                        <rect x="111" width="1" height="30" fill="black"/>
                        <rect x="114" width="2" height="30" fill="black"/>
                        <rect x="118" width="1" height="30" fill="black"/>
                        <rect x="121" width="3" height="30" fill="black"/>
                        <rect x="126" width="1" height="30" fill="black"/>
                        <rect x="129" width="2" height="30" fill="black"/>
                        <rect x="133" width="3" height="30" fill="black"/>
                        <rect x="138" width="2" height="30" fill="black"/>
                      </svg>
                      <p className="text-xs font-mono truncate">8400005593057</p>
                    </div>
                  </div>
                </div>

                {/* Info de la configuración actual */}
                <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-blue-800">
                    <strong>Vista previa:</strong> {barcodeConfig.labelWidth} mm x {barcodeConfig.labelHeight} mm |
                    Etiquetas por hoja: {parseInt(barcodeConfig.labelsPerRow) * parseInt(barcodeConfig.labelsPerColumn)}
                    ({barcodeConfig.labelsPerRow} x {barcodeConfig.labelsPerColumn})
                  </p>
                </div>
              </div>

              {/* Configuración de Etiqueta */}
              <div>
                <h4 className="font-medium mb-4 text-blue-700">Configuración de etiqueta</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Columna Izquierda */}
                  <div className="space-y-4">
                    <div>
                      <Label>Código del modelo:</Label>
                      <Input
                        type="text"
                        value={barcodeConfig.modelCode}
                        onChange={(e) => setBarcodeConfig({...barcodeConfig, modelCode: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Nombre de la impresora:</Label>
                      <Select value={barcodeConfig.printerName} onValueChange={(value) => setBarcodeConfig({...barcodeConfig, printerName: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Send To OneNote 2016">Send To OneNote 2016</SelectItem>
                          <SelectItem value="Microsoft Print to PDF">Microsoft Print to PDF</SelectItem>
                          <SelectItem value="Impresora predeterminada">Impresora predeterminada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Ancho de la etiqueta:</Label>
                      <Input
                        type="text"
                        value={barcodeConfig.labelWidth}
                        onChange={(e) => setBarcodeConfig({...barcodeConfig, labelWidth: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Alto de la etiqueta:</Label>
                      <Input
                        type="text"
                        value={barcodeConfig.labelHeight}
                        onChange={(e) => setBarcodeConfig({...barcodeConfig, labelHeight: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>N° de etiquetas en el papel a lo ancho:</Label>
                      <Input
                        type="text"
                        value={barcodeConfig.labelsPerRow}
                        onChange={(e) => setBarcodeConfig({...barcodeConfig, labelsPerRow: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>N° de etiquetas en el papel a lo alto:</Label>
                      <Input
                        type="text"
                        value={barcodeConfig.labelsPerColumn}
                        onChange={(e) => setBarcodeConfig({...barcodeConfig, labelsPerColumn: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Columna Derecha */}
                  <div className="space-y-4">
                    <div>
                      <Label>Nombre del modelo:</Label>
                      <Input
                        type="text"
                        value={barcodeConfig.modelName}
                        onChange={(e) => setBarcodeConfig({...barcodeConfig, modelName: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Distancia entre el borde superior del papel y la primera etiqueta (mm):</Label>
                      <Input
                        type="text"
                        value={barcodeConfig.topMargin}
                        onChange={(e) => setBarcodeConfig({...barcodeConfig, topMargin: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Distancia entre el borde izquierdo del papel y la primera etiqueta (mm):</Label>
                      <Input
                        type="text"
                        value={barcodeConfig.leftMargin}
                        onChange={(e) => setBarcodeConfig({...barcodeConfig, leftMargin: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Distancia lateral entre etiquetas (mm):</Label>
                      <Input
                        type="text"
                        value={barcodeConfig.horizontalSpacing}
                        onChange={(e) => setBarcodeConfig({...barcodeConfig, horizontalSpacing: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Distancia vertical entre etiquetas (mm):</Label>
                      <Input
                        type="text"
                        value={barcodeConfig.verticalSpacing}
                        onChange={(e) => setBarcodeConfig({...barcodeConfig, verticalSpacing: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setIsBarcodeDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => {
                toast.success('Configuración de etiqueta guardada');
                setIsBarcodeDialogOpen(false);
              }}>
                Guardar y cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Diseño de Etiquetas */}
        <Dialog open={isLabelDialogOpen} onOpenChange={setIsLabelDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Barcode className="h-5 w-5" />
                {editingLabel ? 'Editar Diseño de Etiqueta' : 'Nuevo Diseño de Etiqueta'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Vista Previa de Etiqueta */}
              <div className="border-b pb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Printer className="h-4 w-4 text-gray-500" />
                  <h4 className="font-medium">Vista Previa</h4>
                </div>
                <div className="flex justify-center p-8 bg-gray-50 rounded-lg">
                  <div
                    className="border-2 border-black p-4 bg-white"
                    style={{
                      width: `${parseFloat(labelForm.labelWidth.replace(',', '.')) * 3.78}px`,
                      height: `${parseFloat(labelForm.labelHeight.replace(',', '.')) * 3.78}px`,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <p className="text-xs font-medium mb-1 truncate">Descripción del artículo</p>
                    <p className="text-xs mb-2 truncate">Ref: ABC123    P.V.P.:    10,00 €</p>
                    <div className="flex flex-col items-center justify-center" style={{ marginTop: 'auto' }}>
                      <svg
                        className="mb-1"
                        width={Math.min(140, parseFloat(labelForm.labelWidth.replace(',', '.')) * 3.78 - 20)}
                        height="30"
                      >
                        <rect x="0" width="2" height="30" fill="black"/>
                        <rect x="4" width="1" height="30" fill="black"/>
                        <rect x="7" width="2" height="30" fill="black"/>
                        <rect x="11" width="1" height="30" fill="black"/>
                        <rect x="14" width="2" height="30" fill="black"/>
                        <rect x="18" width="1" height="30" fill="black"/>
                        <rect x="21" width="3" height="30" fill="black"/>
                        <rect x="26" width="1" height="30" fill="black"/>
                        <rect x="29" width="2" height="30" fill="black"/>
                        <rect x="33" width="1" height="30" fill="black"/>
                      </svg>
                      <p className="text-xs mt-1 font-mono">1234567890</p>
                    </div>
                  </div>
                </div>

                {/* Info display */}
                <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-blue-800">
                    <strong>Vista previa:</strong> {labelForm.labelWidth} mm x {labelForm.labelHeight} mm |
                    Etiquetas por hoja: {parseInt(labelForm.labelsPerRow || '1') * parseInt(labelForm.labelsPerColumn || '1')}
                    ({labelForm.labelsPerRow} x {labelForm.labelsPerColumn})
                  </p>
                </div>
              </div>

              {/* Configuración de Etiqueta */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Barcode className="h-4 w-4 text-gray-500" />
                  <h4 className="font-medium">Configuración de la Etiqueta</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Código del modelo <span className="text-red-500">*</span></Label>
                    <Input
                      type="text"
                      value={labelForm.code}
                      onChange={(e) => setLabelForm({...labelForm, code: e.target.value})}
                      placeholder="ej: 10002, 2"
                    />
                  </div>
                  <div>
                    <Label>Nombre del modelo <span className="text-red-500">*</span></Label>
                    <Input
                      type="text"
                      value={labelForm.name}
                      onChange={(e) => setLabelForm({...labelForm, name: e.target.value})}
                      placeholder="ej: Copia de Cód. Barras"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Descripción</Label>
                    <Input
                      type="text"
                      value={labelForm.description}
                      onChange={(e) => setLabelForm({...labelForm, description: e.target.value})}
                      placeholder="Descripción adicional del diseño"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Impresora</Label>
                    <Select value={labelForm.printerName} onValueChange={(value) => setLabelForm({...labelForm, printerName: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una impresora" />
                      </SelectTrigger>
                      <SelectContent>
                        {printers.filter(p => p.isActive).map(printer => (
                          <SelectItem key={printer.id} value={printer.name}>
                            {printer.name} {printer.isDefault && '(Predeterminada)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ancho de etiqueta (mm):</Label>
                    <Input
                      type="text"
                      value={labelForm.labelWidth}
                      onChange={(e) => setLabelForm({...labelForm, labelWidth: e.target.value})}
                      placeholder="75,00"
                    />
                  </div>
                  <div>
                    <Label>Alto de etiqueta (mm):</Label>
                    <Input
                      type="text"
                      value={labelForm.labelHeight}
                      onChange={(e) => setLabelForm({...labelForm, labelHeight: e.target.value})}
                      placeholder="25,00"
                    />
                  </div>
                  <div>
                    <Label>Número de etiquetas por fila:</Label>
                    <Input
                      type="text"
                      value={labelForm.labelsPerRow}
                      onChange={(e) => setLabelForm({...labelForm, labelsPerRow: e.target.value})}
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <Label>Número de etiquetas por columna:</Label>
                    <Input
                      type="text"
                      value={labelForm.labelsPerColumn}
                      onChange={(e) => setLabelForm({...labelForm, labelsPerColumn: e.target.value})}
                      placeholder="9"
                    />
                  </div>
                  <div>
                    <Label>Margen superior (mm):</Label>
                    <Input
                      type="text"
                      value={labelForm.topMargin}
                      onChange={(e) => setLabelForm({...labelForm, topMargin: e.target.value})}
                      placeholder="12,00"
                    />
                  </div>
                  <div>
                    <Label>Margen izquierdo (mm):</Label>
                    <Input
                      type="text"
                      value={labelForm.leftMargin}
                      onChange={(e) => setLabelForm({...labelForm, leftMargin: e.target.value})}
                      placeholder="5,60"
                    />
                  </div>
                  <div>
                    <Label>Espaciado horizontal (mm):</Label>
                    <Input
                      type="text"
                      value={labelForm.horizontalSpacing}
                      onChange={(e) => setLabelForm({...labelForm, horizontalSpacing: e.target.value})}
                      placeholder="1,00"
                    />
                  </div>
                  <div>
                    <Label>Espaciado vertical (mm):</Label>
                    <Input
                      type="text"
                      value={labelForm.verticalSpacing}
                      onChange={(e) => setLabelForm({...labelForm, verticalSpacing: e.target.value})}
                      placeholder="2,00"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => {
                setIsLabelDialogOpen(false);
                setEditingLabel(null);
              }}>
                Cancelar
              </Button>
              <Button onClick={handleSaveLabel}>
                {editingLabel ? 'Guardar cambios' : 'Crear diseño'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}
