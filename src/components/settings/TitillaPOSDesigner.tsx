import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateReceiptHTML } from '@/utils/thermalPrint';
import { LabelDesign, Printer as PrinterType, TitillaConfig, DEFAULT_TITILLA_CONFIG, parseTitillaConfig } from '@/types';

export type { TitillaConfig };
export { DEFAULT_TITILLA_CONFIG, parseTitillaConfig };

// ─── Datos de muestra para el preview ────────────────────────
const SAMPLE = {
  companyName: '2RUEDAS SHOP',
  saleNumber: 'VTA-00123',
  date: '14/05/2026 10:30',
  items: [
    { name: 'Llanta Michelin 80/90-17', quantity: 2, unitPrice: 85000, total: 170000 },
    { name: 'Aceite 4T 10W40 1L',       quantity: 1, unitPrice: 32000, total:  32000 },
  ],
  subtotal: 202000,
  total: 192000,
};

// ─── Toggle row ───────────────────────────────────────────────
function ToggleRow({ label, checked, onCheckedChange }: {
  label: string; checked: boolean; onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────
interface Props {
  design: LabelDesign | null;
  documentType: string;
  printers: PrinterType[];
  onSave: (data: Partial<LabelDesign> & { id: string; createdAt: Date }) => void;
  onClose: () => void;
}

export default function TitillaPOSDesigner({ design, documentType, printers, onSave, onClose }: Props) {
  const [name,       setName]       = useState(design?.name       ?? 'Tirilla POS');
  const [code,       setCode]       = useState(design?.code       ?? 'TIR-01');
  const [printerName, setPrinterName] = useState(
    design?.printerName ?? printers.find(p => p.isDefault)?.name ?? ''
  );
  const [config, setConfig] = useState<TitillaConfig>(() =>
    parseTitillaConfig(design?.description ?? '{}')
  );

  const set = <K extends keyof TitillaConfig>(key: K, val: TitillaConfig[K]) =>
    setConfig(c => ({ ...c, [key]: val }));

  // Preview HTML generado con datos de muestra
  const previewHtml = useMemo(() => generateReceiptHTML({
    companyName:    SAMPLE.companyName,
    companyAddress: config.showAddress  ? 'Calle 10 #5-20 Local 3' : undefined,
    companyPhone:   config.showPhone    ? '310 555 0000'            : undefined,
    companyNit:     config.showNit      ? '900.123.456-7'           : undefined,
    saleNumber:     SAMPLE.saleNumber,
    date:           SAMPLE.date,
    advisorName:    config.showAdvisor  ? 'Juan Pérez'              : '',
    customerName:   config.showCustomer ? 'Carlos López'            : undefined,
    items:          SAMPLE.items,
    subtotal:       SAMPLE.subtotal,
    discount:       config.showDiscount    ? 10000                  : undefined,
    iva:            config.showIva         ? 19240                  : undefined,
    total:          SAMPLE.total,
    paymentMethod:  config.showPaymentMethod ? 'Efectivo'           : undefined,
    footer:         config.footerText,
    footer2:        config.footer2Text,
    paperWidth:     config.paperWidth,
  }, { noPrint: true }), [config]);

  const handleSave = () => {
    onSave({
      id:           design?.id ?? crypto.randomUUID(),
      code:         code.trim(),
      name:         name.trim(),
      description:  JSON.stringify(config),
      documentType,
      printerName,
      labelWidth:   config.paperWidth === 58 ? '58' : '80',
      labelHeight:  'auto',
      labelsPerRow: '1', labelsPerColumn: '1',
      topMargin: '0', leftMargin: '0',
      horizontalSpacing: '0', verticalSpacing: '0',
      fields: [],
      createdAt: design?.createdAt ?? new Date(),
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Cabecera con datos básicos ── */}
      <div className="px-4 py-2 border-b bg-gray-50 shrink-0 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Código</Label>
          <Input className="h-7 text-xs w-20" value={code} onChange={e => setCode(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <Label className="text-xs">Nombre</Label>
          <Input className="h-7 text-xs" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Impresora</Label>
          <Select value={printerName} onValueChange={setPrinterName}>
            <SelectTrigger className="h-7 text-xs w-44"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
            <SelectContent>
              {printers.filter(p => p.isActive).map(p => (
                <SelectItem key={p.id} value={p.name} className="text-xs">
                  {p.name}{p.isDefault ? ' ✓' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Ancho de papel</Label>
          <Select
            value={String(config.paperWidth)}
            onValueChange={v => set('paperWidth', Number(v) as 58 | 80)}
          >
            <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="80" className="text-xs">80 mm</SelectItem>
              <SelectItem value="58" className="text-xs">58 mm</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Panel principal: opciones + preview ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Opciones */}
        <div className="w-64 shrink-0 border-r flex flex-col overflow-hidden">
          <div className="px-3 py-2 bg-gray-100 border-b shrink-0">
            <p className="text-xs font-semibold text-gray-700">Campos visibles</p>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-1">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide pt-1 pb-0.5">Encabezado</p>
            <ToggleRow label="Dirección"       checked={config.showAddress}  onCheckedChange={v => set('showAddress',  v)} />
            <ToggleRow label="Teléfono"        checked={config.showPhone}    onCheckedChange={v => set('showPhone',    v)} />
            <ToggleRow label="NIT"             checked={config.showNit}      onCheckedChange={v => set('showNit',      v)} />

            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide pt-3 pb-0.5">Documento</p>
            <ToggleRow label="Asesor"          checked={config.showAdvisor}  onCheckedChange={v => set('showAdvisor',  v)} />
            <ToggleRow label="Cliente"         checked={config.showCustomer} onCheckedChange={v => set('showCustomer', v)} />

            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide pt-3 pb-0.5">Totales</p>
            <ToggleRow label="Descuento"       checked={config.showDiscount} onCheckedChange={v => set('showDiscount', v)} />
            <ToggleRow label="IVA"             checked={config.showIva}      onCheckedChange={v => set('showIva',      v)} />
            <ToggleRow label="Método de pago"  checked={config.showPaymentMethod} onCheckedChange={v => set('showPaymentMethod', v)} />

            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide pt-3 pb-0.5">Pie de página</p>
            <div className="py-1">
              <Label className="text-[10px] text-gray-500">Línea 1</Label>
              <Input
                className="text-xs h-8 mt-0.5"
                value={config.footerText}
                onChange={e => set('footerText', e.target.value)}
                placeholder="¡Gracias por su compra!"
              />
            </div>
            <div className="py-1">
              <Label className="text-[10px] text-gray-500">Línea 2</Label>
              <Input
                className="text-xs h-8 mt-0.5"
                value={config.footer2Text}
                onChange={e => set('footer2Text', e.target.value)}
                placeholder="Texto adicional..."
              />
            </div>

            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide pt-2 pb-0.5">Título del documento</p>
            <div className="py-2">
              <Input
                className="text-xs h-8"
                value={config.titleText}
                onChange={e => set('titleText', e.target.value)}
                placeholder="FACTURA DE VENTA"
              />
            </div>
          </div>
        </div>

        {/* Preview en vivo */}
        <div className="flex-1 overflow-auto bg-gray-200 flex flex-col items-center py-6 gap-2">
          <p className="text-xs text-gray-500 shrink-0">Vista previa — datos de muestra</p>
          <iframe
            srcDoc={previewHtml}
            title="Vista previa tirilla"
            className="shadow-lg bg-white"
            style={{
              width:  config.paperWidth === 58 ? '220px' : '300px',
              height: '560px',
              border: 'none',
            }}
          />
        </div>
      </div>

      {/* ── Footer con acciones ── */}
      <div className="flex justify-end gap-2 border-t px-4 py-3 shrink-0 bg-gray-50">
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" onClick={handleSave}>
          {design ? 'Guardar cambios' : 'Crear tirilla'}
        </Button>
      </div>
    </div>
  );
}
