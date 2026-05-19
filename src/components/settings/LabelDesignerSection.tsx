import { useState } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Barcode, Edit2, Trash2, Eye, Download, Upload, AlignLeft, AlignCenter, AlignRight, Move, Star } from 'lucide-react';
import { toast } from 'sonner';
import { LabelDesign, LabelField, Printer as PrinterType } from '@/types';
import TitillaPOSDesigner, { parseTitillaConfig } from './TitillaPOSDesigner';
import { generateReceiptHTML } from '@/utils/thermalPrint';

const DOCUMENT_TYPES = [
  'Etiquetas de artículos',
  'Titilla POS',
  'Tirilla Cotizaciones',
  'Tirilla Separados',
];

const ALL_LABEL_FIELDS: { key: string; label: string }[] = [
  { key: 'nombre', label: 'Descripción artículo' },
  { key: 'referencia', label: 'Referencia' },
  { key: 'codigo', label: 'Código artículo' },
  { key: 'ean-texto', label: 'EAN código (texto)' },
  { key: 'ean-barras', label: 'EAN código (barras)' },
  { key: 'precio1', label: 'Precio 1' },
  { key: 'precio2', label: 'Precio 2' },
  { key: 'precio3', label: 'Precio descuento' },
  { key: 'precio4', label: 'Precio mayoreo' },
  { key: 'categoria', label: 'Categoría' },
  { key: 'proveedor', label: 'Proveedor' },
  { key: 'marca', label: 'Marca' },
  { key: 'stock', label: 'Stock' },
];

const FIELD_PREVIEW: Record<string, string> = {
  nombre: 'Nombre del artículo', referencia: 'REF-001', codigo: 'PROD-001',
  'ean-texto': '7700001234567', 'ean-barras': '',
  precio1: '$ 12.500', precio2: '$ 11.000', precio3: '$ 10.500', precio4: '$ 9.000',
  categoria: 'Categoría', proveedor: 'Proveedor XYZ', marca: 'Marca', stock: '15',
};

const DEFAULT_LABEL_FIELDS: LabelField[] = [
  { key: 'nombre',    x: 1,  y: 1,  width: 73, height: 4,  fontSize: 8, bold: false, italic: false, underline: false, align: 'left',   visible: true },
  { key: 'referencia',x: 1,  y: 6,  width: 35, height: 4,  fontSize: 7, bold: false, italic: false, underline: false, align: 'left',   visible: true },
  { key: 'precio1',   x: 38, y: 6,  width: 36, height: 4,  fontSize: 9, bold: true,  italic: false, underline: false, align: 'right',  visible: true },
  { key: 'ean-barras',x: 8,  y: 11, width: 59, height: 12, fontSize: 7, bold: false, italic: false, underline: false, align: 'center', visible: true },
];

const EMPTY_FORM = {
  code: '', name: '', description: '',
  documentType: 'Etiquetas de artículos',
  printerName: 'Generic / Text Only',
  labelWidth: '75,00', labelHeight: '25,00',
  labelsPerRow: '3', labelsPerColumn: '9',
  topMargin: '12,00', leftMargin: '5,60',
  horizontalSpacing: '1,00', verticalSpacing: '2,00',
};

interface Props {
  labelDesigns: LabelDesign[];
  printers: PrinterType[];
  onAdd: (design: Omit<LabelDesign, 'id' | 'createdAt'> & { id: string; createdAt: Date }) => void;
  onUpdate: (id: string, updates: Partial<LabelDesign>) => void;
  onDelete: (id: string) => void;
}

export default function LabelDesignerSection({ labelDesigns, printers, onAdd, onUpdate, onDelete }: Props) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [selectedDocumentType, setSelectedDocumentType] = useState('Etiquetas de artículos');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [labelFields, setLabelFields] = useState<LabelField[]>([]);
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const filteredDesigns = labelDesigns.filter(d => d.documentType === selectedDocumentType);
  const selectedField = labelFields.find(f => f.key === selectedFieldKey) || null;

  const handleOpen = (labelId?: string) => {
    if (labelId) {
      const label = labelDesigns.find(d => d.id === labelId);
      if (label) {
        setEditingId(labelId);
        setLabelFields(label.fields || DEFAULT_LABEL_FIELDS);
        setForm({
          code: label.code, name: label.name, description: label.description || '',
          documentType: label.documentType, printerName: label.printerName,
          labelWidth: label.labelWidth, labelHeight: label.labelHeight,
          labelsPerRow: label.labelsPerRow, labelsPerColumn: label.labelsPerColumn,
          topMargin: label.topMargin, leftMargin: label.leftMargin,
          horizontalSpacing: label.horizontalSpacing, verticalSpacing: label.verticalSpacing,
        });
      }
    } else {
      setEditingId(null);
      setLabelFields(DEFAULT_LABEL_FIELDS);
      setForm({
        ...EMPTY_FORM,
        documentType: selectedDocumentType,
        printerName: printers.find(p => p.isDefault)?.name || 'Generic / Text Only',
      });
    }
    setSelectedFieldKey(null);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.code.trim() || !form.name.trim()) { toast.error('El código y nombre son requeridos'); return; }
    const data = { ...form, code: form.code.trim(), name: form.name.trim(), description: form.description.trim(), fields: labelFields };
    if (editingId) {
      onUpdate(editingId, data);
      toast.success('Diseño actualizado exitosamente');
    } else {
      onAdd({ ...data, id: Date.now().toString(), createdAt: new Date() } as any);
      toast.success('Diseño creado exitosamente');
    }
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const handleDelete = async (labelId: string) => {
    if (!await confirm({ description: '¿Estás seguro de que deseas eliminar este diseño?', confirmLabel: 'Eliminar' })) return;
    onDelete(labelId);
    toast.success('Diseño eliminado exitosamente');
    if (selectedId === labelId) setSelectedId(null);
  };

  const addField = (key: string) => {
    const w = parseFloat(form.labelWidth.replace(',', '.')) || 75;
    const newField: LabelField = {
      key, x: 1,
      y: Math.min(labelFields.length * 5 + 1, parseFloat(form.labelHeight.replace(',', '.')) - 6),
      width: w - 2, height: 4, fontSize: 8,
      bold: false, italic: false, underline: false, align: 'left', visible: true,
    };
    setLabelFields(prev => [...prev, newField]);
    setSelectedFieldKey(key);
  };

  const removeField = (key: string) => {
    setLabelFields(prev => prev.filter(f => f.key !== key));
    if (selectedFieldKey === key) setSelectedFieldKey(null);
  };

  const updateField = (key: string, updates: Partial<LabelField>) => {
    setLabelFields(prev => prev.map(f => f.key === key ? { ...f, ...updates } : f));
  };

  const isTitilla = ['Titilla POS', 'Tirilla Cotizaciones', 'Tirilla Separados'].includes(selectedDocumentType);

  const handleSetDefault = (designId: string) => {
    // Quitar isDefault de todos los del mismo tipo, poner en el elegido
    filteredDesigns.forEach(d => {
      onUpdate(d.id, { isDefault: d.id === designId });
    });
    toast.success('Tirilla predeterminada actualizada');
  };

  const activeId = filteredDesigns.find(d => d.isDefault)?.id ?? filteredDesigns[0]?.id;
  const editingDesign = editingId ? (labelDesigns.find(d => d.id === editingId) ?? null) : null;

  const handleTitillaSave = (data: Partial<LabelDesign> & { id: string; createdAt: Date }) => {
    if (editingId) {
      onUpdate(editingId, data);
      toast.success('Tirilla POS actualizada');
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onAdd(data as any);
      toast.success('Tirilla POS creada');
    }
    setIsDialogOpen(false);
    setEditingId(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center">
            <Barcode className="h-5 w-5 mr-2" />
            Diseños de Etiquetas
          </h2>
          <p className="text-sm text-gray-600 mt-1">Administra los diseños de etiquetas por tipo de documento</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 mb-2 block">Tipo de documento:</label>
        <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
          <SelectTrigger className="w-full md:w-80"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map(dt => <SelectItem key={dt} value={dt}>{dt}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg mb-4 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-10"></TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Impresora</TableHead>
              {isTitilla
                ? <TableHead className="text-center w-32">Estado</TableHead>
                : <>
                    <TableHead className="text-center">Tamaño (mm)</TableHead>
                    <TableHead className="text-center">Etiq. por hoja</TableHead>
                  </>
              }
              {isTitilla && <TableHead className="w-10"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDesigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isTitilla ? 6 : 6} className="text-center text-gray-500 py-8">
                  No hay diseños para este tipo de documento
                </TableCell>
              </TableRow>
            ) : (
              filteredDesigns.map(design => {
                const isActive = design.id === activeId;
                return (
                  <TableRow
                    key={design.id}
                    className={`cursor-pointer hover:bg-gray-50 ${selectedId === design.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedId(design.id)}
                  >
                    <TableCell>
                      <div className={`w-2 h-2 rounded-full mx-auto ${isActive && isTitilla ? 'bg-green-500' : 'bg-blue-500'}`} />
                    </TableCell>
                    <TableCell className="font-medium">{design.code}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      {design.name}
                      {isTitilla && isActive && (
                        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{design.printerName}</TableCell>
                    {isTitilla
                      ? <TableCell className="text-center">
                          {isActive
                            ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">En uso</span>
                            : <span className="text-xs text-gray-400">—</span>
                          }
                        </TableCell>
                      : <>
                          <TableCell className="text-center text-sm">{design.labelWidth} x {design.labelHeight}</TableCell>
                          <TableCell className="text-center text-sm">
                            {parseInt(design.labelsPerRow) * parseInt(design.labelsPerColumn)}
                            <span className="text-gray-500 ml-1">({design.labelsPerRow}x{design.labelsPerColumn})</span>
                          </TableCell>
                        </>
                    }
                    {isTitilla && (
                      <TableCell onClick={e => e.stopPropagation()}>
                        {!isActive && (
                          <button
                            title="Establecer como predeterminada"
                            className="p-1 rounded hover:bg-gray-100"
                            onClick={() => handleSetDefault(design.id)}
                          >
                            <Star className="h-4 w-4 text-gray-400 hover:text-yellow-500" />
                          </button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => handleOpen()} size="sm"><Plus className="h-4 w-4 mr-2" />Nuevo</Button>
        <Button onClick={() => handleOpen(selectedId!)} size="sm" variant="outline" disabled={!selectedId}>
          <Edit2 className="h-4 w-4 mr-2" />Editar
        </Button>
        <Button onClick={() => selectedId && handleDelete(selectedId)} size="sm" variant="outline" disabled={!selectedId}>
          <Trash2 className="h-4 w-4 mr-2" />Eliminar
        </Button>
        <Button size="sm" variant="outline" disabled><Download className="h-4 w-4 mr-2" />Importar</Button>
        <Button size="sm" variant="outline" disabled><Upload className="h-4 w-4 mr-2" />Exportar</Button>
      </div>

      {selectedId && (() => {
        const sel = filteredDesigns.find(d => d.id === selectedId);
        if (!sel) return null;

        if (['Titilla POS', 'Tirilla Cotizaciones', 'Tirilla Separados'].includes(sel.documentType)) {
          const cfg = parseTitillaConfig(sel.description ?? '{}');
          const html = generateReceiptHTML({
            companyName:    '2RUEDAS SHOP',
            companyAddress: cfg.showAddress  ? 'Calle 10 #5-20 Local 3' : undefined,
            companyPhone:   cfg.showPhone    ? '310 555 0000'           : undefined,
            companyNit:     cfg.showNit      ? '900.123.456-7'          : undefined,
            saleNumber:     'VTA-00123',
            date:           '14/05/2026 10:30',
            advisorName:    cfg.showAdvisor  ? 'Juan Pérez'             : '',
            customerName:   cfg.showCustomer ? 'Carlos López'           : undefined,
            items: [
              { name: 'Llanta Michelin 80/90-17', quantity: 2, unitPrice: 85000, total: 170000 },
              { name: 'Aceite 4T 10W40 1L',       quantity: 1, unitPrice: 32000, total:  32000 },
            ],
            subtotal:      202000,
            discount:      cfg.showDiscount     ? 10000 : undefined,
            iva:           cfg.showIva          ? 19240 : undefined,
            total:         192000,
            paymentMethod: cfg.showPaymentMethod ? 'Efectivo' : undefined,
            footer:        cfg.footerText,
            paperWidth:    cfg.paperWidth,
          }, { noPrint: true });

          return (
            <div className="mt-6 p-4 border rounded-lg bg-gray-50">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Vista Previa — {sel.name}
              </h4>
              <div className="flex justify-center p-4 bg-white rounded border">
                <iframe
                  srcDoc={html}
                  title="Vista previa tirilla"
                  className="shadow bg-white"
                  style={{ width: cfg.paperWidth === 58 ? '220px' : '300px', height: '480px', border: 'none' }}
                />
              </div>
            </div>
          );
        }

        return (
          <div className="mt-6 p-4 border rounded-lg bg-gray-50">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Vista Previa — {sel.name}
            </h4>
            <div className="flex justify-center p-6 bg-white rounded border">
              <div
                className="border-2 border-black p-4 bg-white"
                style={{
                  width: `${parseFloat(sel.labelWidth.replace(',', '.') || '75') * 3.78}px`,
                  height: `${parseFloat(sel.labelHeight.replace(',', '.') || '25') * 3.78}px`,
                  transition: 'all 0.3s ease',
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
        );
      })()}

      {/* Designer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setIsDialogOpen(false); setEditingId(null); } }}>
        <DialogContent className="max-w-[1150px] w-[95vw] p-0 flex flex-col" style={{ height: '90vh', maxHeight: '90vh' }}>
          {isTitilla ? (
            <TitillaPOSDesigner
              design={editingDesign}
              documentType={form.documentType}
              printers={printers}
              onSave={handleTitillaSave}
              onClose={() => { setIsDialogOpen(false); setEditingId(null); }}
            />
          ) : (<>
          <DialogHeader className="px-4 pt-4 pb-2 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Barcode className="h-4 w-4" />
              {editingId ? `Editar: ${form.name}` : 'Nuevo Diseño'}
            </DialogTitle>
          </DialogHeader>

          <div className="px-4 py-2 border-b bg-gray-50 shrink-0">
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Código *</Label>
                <Input className="h-7 text-xs w-20" value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value })} placeholder="Ej: 2" />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                <Label className="text-xs">Nombre *</Label>
                <Input className="h-7 text-xs" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre del diseño" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Tipo de documento</Label>
                <Select value={form.documentType} onValueChange={v => setForm({ ...form, documentType: v })}>
                  <SelectTrigger className="h-7 text-xs w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map(dt => <SelectItem key={dt} value={dt} className="text-xs">{dt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Impresora</Label>
                <Select value={form.printerName} onValueChange={v => setForm({ ...form, printerName: v })}>
                  <SelectTrigger className="h-7 text-xs w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {printers.filter(p => p.isActive).map(p => (
                      <SelectItem key={p.id} value={p.name} className="text-xs">{p.name}{p.isDefault ? ' ✓' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Ancho (mm)</Label>
                <Input className="h-7 text-xs w-20" value={form.labelWidth}
                  onChange={e => setForm({ ...form, labelWidth: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Alto (mm)</Label>
                <Input className="h-7 text-xs w-20" value={form.labelHeight}
                  onChange={e => setForm({ ...form, labelHeight: e.target.value })} />
              </div>
            </div>
          </div>

          <Tabs defaultValue="campos" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="mx-4 mt-2 shrink-0 w-fit">
              <TabsTrigger value="campos" className="text-xs">Diseño de campos</TabsTrigger>
              <TabsTrigger value="config" className="text-xs">Configuración de página</TabsTrigger>
            </TabsList>

            <TabsContent value="campos" className="flex-1 overflow-hidden m-0 mt-2">
              <div className="flex h-full border-t">
                {/* Panel izquierdo */}
                <div className="w-44 shrink-0 border-r flex flex-col overflow-hidden">
                  <div className="px-2 py-1 bg-gray-100 border-b">
                    <p className="text-xs font-semibold text-gray-700">Campos disponibles</p>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {ALL_LABEL_FIELDS.map(f => {
                      const isAdded = labelFields.some(lf => lf.key === f.key);
                      return (
                        <div
                          key={f.key}
                          className={`flex items-center gap-1 px-2 py-1 border-b text-xs cursor-pointer hover:bg-gray-50 ${isAdded && selectedFieldKey === f.key ? 'bg-blue-50' : ''}`}
                          onClick={() => isAdded && setSelectedFieldKey(f.key)}
                        >
                          <button
                            className={`w-4 h-4 rounded text-white text-[10px] leading-none flex items-center justify-center shrink-0 ${isAdded ? 'bg-red-400 hover:bg-red-600' : 'bg-green-500 hover:bg-green-700'}`}
                            onClick={e => { e.stopPropagation(); isAdded ? removeField(f.key) : addField(f.key); }}
                            title={isAdded ? 'Quitar campo' : 'Agregar campo'}
                          >
                            {isAdded ? '−' : '+'}
                          </button>
                          <span className={isAdded ? 'text-blue-700 font-medium' : 'text-gray-600'}>{f.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-2 py-1 border-t bg-gray-50">
                    <p className="text-[10px] text-gray-400 leading-tight">
                      {labelFields.length} campo{labelFields.length !== 1 ? 's' : ''} en diseño
                    </p>
                  </div>
                </div>

                {/* Panel central */}
                <div className="flex-1 flex flex-col items-center overflow-auto bg-gray-200 p-4">
                  {(() => {
                    const lw = parseFloat(form.labelWidth.replace(',', '.')) || 75;
                    const lh = parseFloat(form.labelHeight.replace(',', '.')) || 25;
                    const sc = Math.min(480 / lw, 320 / lh, 10);
                    return (
                      <>
                        <p className="text-[10px] text-gray-500 mb-2">Haz clic en un campo para seleccionarlo • {lw} × {lh} mm</p>
                        <div
                          className="relative bg-white shadow-md"
                          style={{ width: lw * sc, height: lh * sc, border: '1.5px solid #555' }}
                          onClick={() => setSelectedFieldKey(null)}
                        >
                          <svg className="absolute inset-0 pointer-events-none" width={lw * sc} height={lh * sc} style={{ opacity: 0.12 }}>
                            {Array.from({ length: Math.floor(lw / 5) + 1 }, (_, i) => (
                              <line key={`v${i}`} x1={i * 5 * sc} y1={0} x2={i * 5 * sc} y2={lh * sc} stroke="#666" strokeWidth="0.5" />
                            ))}
                            {Array.from({ length: Math.floor(lh / 5) + 1 }, (_, i) => (
                              <line key={`h${i}`} x1={0} y1={i * 5 * sc} x2={lw * sc} y2={i * 5 * sc} stroke="#666" strokeWidth="0.5" />
                            ))}
                          </svg>
                          {labelFields.filter(f => f.visible).map(f => (
                            <div
                              key={f.key}
                              className={`absolute overflow-hidden cursor-pointer select-none ${selectedFieldKey === f.key ? 'outline outline-2 outline-blue-500 z-10' : 'outline outline-1 outline-dashed outline-gray-300 hover:outline-gray-500'}`}
                              style={{
                                left: f.x * sc, top: f.y * sc, width: f.width * sc, height: f.height * sc,
                                fontSize: Math.max(f.fontSize * sc / 6, 6),
                                fontWeight: f.bold ? 'bold' : 'normal',
                                fontStyle: f.italic ? 'italic' : 'normal',
                                textDecoration: f.underline ? 'underline' : 'none',
                                textAlign: f.align,
                                display: 'flex', alignItems: 'center', padding: '0 1px',
                                backgroundColor: selectedFieldKey === f.key ? 'rgba(219,234,254,0.5)' : 'transparent',
                              }}
                              onClick={e => { e.stopPropagation(); setSelectedFieldKey(f.key); }}
                            >
                              {f.key === 'ean-barras' ? (
                                <svg width="100%" height="100%">
                                  {[0,4,7,11,14,18,21,26,29,33,36,40,43,47,50,54,57,61,64,68,71,75,78,82].map((x, i) => (
                                    <rect key={i} x={`${(x / 85) * 100}%`} width={`${((i % 3 === 0 ? 2 : i % 3 === 1 ? 1 : 3) / 85) * 100}%`} height="80%" y="10%" fill="black" />
                                  ))}
                                  <text x="50%" y="95%" textAnchor="middle" fontSize="6" fontFamily="monospace">7700001234567</text>
                                </svg>
                              ) : (
                                <span className="truncate w-full">{FIELD_PREVIEW[f.key] || f.key}</span>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2">Escala 1mm = {sc.toFixed(1)}px</p>
                      </>
                    );
                  })()}
                </div>

                {/* Panel derecho */}
                <div className="w-56 shrink-0 border-l flex flex-col overflow-hidden">
                  {selectedField ? (
                    <>
                      <div className="px-3 py-2 bg-blue-50 border-b">
                        <p className="text-xs font-semibold text-blue-800">
                          {ALL_LABEL_FIELDS.find(f => f.key === selectedField.key)?.label || selectedField.key}
                        </p>
                      </div>
                      <div className="flex-1 overflow-y-auto divide-y">
                        <div className="p-2 space-y-1">
                          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Alineación</p>
                          <div className="flex gap-1">
                            {(['left', 'center', 'right'] as const).map(a => (
                              <button
                                key={a}
                                className={`flex-1 h-7 rounded border flex items-center justify-center ${selectedField.align === a ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-200 hover:bg-gray-50'}`}
                                onClick={() => updateField(selectedField.key, { align: a })}
                                title={a}
                              >
                                {a === 'left' ? <AlignLeft className="h-3 w-3" /> : a === 'center' ? <AlignCenter className="h-3 w-3" /> : <AlignRight className="h-3 w-3" />}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="p-2 space-y-2">
                          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Fuente</p>
                          <div className="flex items-center gap-1">
                            <Label className="text-xs text-gray-500 w-16 shrink-0">Tamaño pt</Label>
                            <Input type="number" min="4" max="72" step="1" className="h-7 text-xs"
                              value={selectedField.fontSize}
                              onChange={e => updateField(selectedField.key, { fontSize: Number(e.target.value) })} />
                          </div>
                          <div className="flex gap-1">
                            <button className={`flex-1 h-7 rounded border text-xs font-bold ${selectedField.bold ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-200 hover:bg-gray-50'}`}
                              onClick={() => updateField(selectedField.key, { bold: !selectedField.bold })}>N</button>
                            <button className={`flex-1 h-7 rounded border text-xs italic ${selectedField.italic ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-200 hover:bg-gray-50'}`}
                              onClick={() => updateField(selectedField.key, { italic: !selectedField.italic })}>K</button>
                            <button className={`flex-1 h-7 rounded border text-xs underline ${selectedField.underline ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-200 hover:bg-gray-50'}`}
                              onClick={() => updateField(selectedField.key, { underline: !selectedField.underline })}>S</button>
                          </div>
                        </div>
                        <div className="p-2 space-y-2">
                          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                            <Move className="h-3 w-3" /> Posición (mm)
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-[10px] text-gray-500">X (izq)</Label>
                              <Input type="number" min="0" step="0.5" className="h-7 text-xs"
                                value={selectedField.x} onChange={e => updateField(selectedField.key, { x: Number(e.target.value) })} />
                            </div>
                            <div>
                              <Label className="text-[10px] text-gray-500">Y (sup)</Label>
                              <Input type="number" min="0" step="0.5" className="h-7 text-xs"
                                value={selectedField.y} onChange={e => updateField(selectedField.key, { y: Number(e.target.value) })} />
                            </div>
                            <div>
                              <Label className="text-[10px] text-gray-500">Ancho</Label>
                              <Input type="number" min="1" step="0.5" className="h-7 text-xs"
                                value={selectedField.width} onChange={e => updateField(selectedField.key, { width: Number(e.target.value) })} />
                            </div>
                            <div>
                              <Label className="text-[10px] text-gray-500">Alto</Label>
                              <Input type="number" min="1" step="0.5" className="h-7 text-xs"
                                value={selectedField.height} onChange={e => updateField(selectedField.key, { height: Number(e.target.value) })} />
                            </div>
                          </div>
                        </div>
                        <div className="p-2 flex items-center gap-2">
                          <Switch checked={selectedField.visible}
                            onCheckedChange={v => updateField(selectedField.key, { visible: v })} />
                          <Label className="text-xs text-gray-600">Visible en impresión</Label>
                        </div>
                        <div className="p-2">
                          <Button variant="outline" size="sm" className="w-full h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => removeField(selectedField.key)}>
                            <Trash2 className="h-3 w-3 mr-1" />Quitar campo
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                      <Barcode className="h-8 w-8 text-gray-300 mb-2" />
                      <p className="text-xs text-gray-400">Agrega campos desde la lista y haz clic para editar su formato y posición</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="config" className="flex-1 overflow-y-auto m-0 mt-0 border-t">
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                <div>
                  <Label className="text-sm">Descripción del diseño</Label>
                  <Input className="mt-1" value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Descripción adicional del diseño" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-sm">Etiquetas por fila</Label>
                    <Input className="mt-1" value={form.labelsPerRow}
                      onChange={e => setForm({ ...form, labelsPerRow: e.target.value })} placeholder="3" />
                  </div>
                  <div>
                    <Label className="text-sm">Etiquetas por columna</Label>
                    <Input className="mt-1" value={form.labelsPerColumn}
                      onChange={e => setForm({ ...form, labelsPerColumn: e.target.value })} placeholder="9" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Margen superior (mm)</Label>
                  <Input className="mt-1" value={form.topMargin}
                    onChange={e => setForm({ ...form, topMargin: e.target.value })} placeholder="12,00" />
                </div>
                <div>
                  <Label className="text-sm">Margen izquierdo (mm)</Label>
                  <Input className="mt-1" value={form.leftMargin}
                    onChange={e => setForm({ ...form, leftMargin: e.target.value })} placeholder="5,60" />
                </div>
                <div>
                  <Label className="text-sm">Espaciado horizontal entre etiquetas (mm)</Label>
                  <Input className="mt-1" value={form.horizontalSpacing}
                    onChange={e => setForm({ ...form, horizontalSpacing: e.target.value })} placeholder="1,00" />
                </div>
                <div>
                  <Label className="text-sm">Espaciado vertical entre etiquetas (mm)</Label>
                  <Input className="mt-1" value={form.verticalSpacing}
                    onChange={e => setForm({ ...form, verticalSpacing: e.target.value })} placeholder="2,00" />
                </div>
                <div className="md:col-span-2 p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-blue-800">
                    <strong>Resumen:</strong> {form.labelWidth} × {form.labelHeight} mm |
                    {' '}{parseInt(form.labelsPerRow || '1') * parseInt(form.labelsPerColumn || '1')} etiquetas por hoja
                    ({form.labelsPerRow} × {form.labelsPerColumn})
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between items-center border-t px-4 py-3 shrink-0 bg-gray-50">
            <p className="text-xs text-gray-500">
              {labelFields.filter(f => f.visible).length} campo{labelFields.filter(f => f.visible).length !== 1 ? 's' : ''} visibles
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setIsDialogOpen(false); setEditingId(null); }}>Cancelar</Button>
              <Button size="sm" onClick={handleSave}>{editingId ? 'Guardar cambios' : 'Crear diseño'}</Button>
            </div>
          </div>
          </>)}
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </div>
  );
}
