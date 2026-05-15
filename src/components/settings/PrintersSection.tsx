import { useState } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Printer, Edit, Trash2, Star, ScanSearch, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Printer as PrinterType } from '@/types';

interface Props {
  printers: PrinterType[];
  onAdd: (printer: PrinterType) => void;
  onUpdate: (id: string, updates: Partial<PrinterType>) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export default function PrintersSection({ printers, onAdd, onUpdate, onDelete, onSetDefault }: Props) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [isDialogOpen, setIsDialogOpen]     = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterType | null>(null);
  const [detecting, setDetecting]           = useState(false);
  const [detectedPrinters, setDetectedPrinters] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '',
    type: 'thermal' as 'thermal' | 'laser' | 'inkjet' | 'network',
    paperSize: 'A4',
  });

  const handleOpen = (printer?: PrinterType) => {
    setDetectedPrinters([]);
    if (printer) {
      setEditingPrinter(printer);
      setForm({ name: printer.name, type: printer.type, paperSize: printer.paperSize || 'A4' });
    } else {
      setEditingPrinter(null);
      setForm({ name: '', type: 'thermal', paperSize: 'A4' });
    }
    setIsDialogOpen(true);
  };

  // ── Detectar impresoras del sistema ──────────────────────────
  const handleDetect = async () => {
    setDetecting(true);
    setDetectedPrinters([]);

    try {
      // API experimental de Chrome/Edge (Chromium 122+)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = navigator as any;
      if (typeof nav.printing?.getPrinters === 'function') {
        const list: unknown[] = await nav.printing.getPrinters();
        const names = list.map((p: unknown) => {
          if (typeof p === 'string') return p;
          const obj = p as Record<string, unknown>;
          return (
            (obj.printerInfo as Record<string, unknown>)?.printerName as string
            ?? obj.name as string
            ?? String(p)
          );
        }).filter(Boolean);

        if (names.length > 0) {
          setDetectedPrinters(names);
          toast.success(`${names.length} impresora(s) detectada(s) — selecciona una`);
          setDetecting(false);
          return;
        }
      }
    } catch {
      // API no disponible o sin permisos
    }

    // Fallback: abrir configuración de Windows
    try {
      // Funciona en Edge/Windows y algunos navegadores
      window.open('ms-settings:printers');
    } catch {
      // silencioso
    }

    toast.info('Abre Configuración → Bluetooth y dispositivos → Impresoras y escáneres, copia el nombre exacto y pégalo en el campo.', {
      duration: 8000,
    });
    setDetecting(false);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('El nombre de la impresora es requerido'); return; }
    if (editingPrinter) {
      onUpdate(editingPrinter.id, { name: form.name.trim(), type: form.type, paperSize: form.paperSize });
      toast.success('Impresora actualizada');
    } else {
      onAdd({
        id: crypto.randomUUID(),
        name: form.name.trim(),
        type: form.type,
        paperSize: form.paperSize,
        isActive: true,
        isDefault: printers.length === 0,
        createdAt: new Date(),
      });
      toast.success('Impresora agregada');
    }
    setForm({ name: '', type: 'thermal', paperSize: 'A4' });
    setEditingPrinter(null);
    setDetectedPrinters([]);
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({ description: '¿Estás seguro de que deseas eliminar esta impresora?', confirmLabel: 'Eliminar' })) return;
    onDelete(id);
    toast.success('Impresora eliminada');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center">
            <Printer className="h-5 w-5 mr-2" />
            Impresoras
          </h2>
          <p className="text-sm text-gray-600 mt-1">Administra las impresoras del sistema</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => handleOpen()}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingPrinter ? 'Editar Impresora' : 'Agregar Impresora'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">

              {/* ── Botón buscar en el sistema ── */}
              {!editingPrinter && (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 space-y-2">
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    Detecta automáticamente las impresoras instaladas en este equipo
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleDetect}
                    disabled={detecting}
                  >
                    {detecting
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Buscando...</>
                      : <><ScanSearch className="h-4 w-4 mr-2" /> Buscar impresoras instaladas</>
                    }
                  </Button>

                  {/* Lista de impresoras detectadas */}
                  {detectedPrinters.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <p className="text-xs font-medium text-gray-600">Selecciona una impresora:</p>
                      <div className="max-h-36 overflow-y-auto space-y-1">
                        {detectedPrinters.map(name => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, name }))}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md border transition-colors flex items-center gap-2 ${
                              form.name === name
                                ? 'bg-blue-50 border-blue-400 text-blue-700 font-medium'
                                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <Printer className="h-3.5 w-3.5 shrink-0 opacity-60" />
                            <span className="truncate">{name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Nombre ── */}
              <div>
                <Label htmlFor="printer-name">Nombre de la impresora</Label>
                <Input
                  id="printer-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: HP LaserJet Pro, Epson TM-T20..."
                  className="mt-1"
                />
              </div>

              {/* ── Tipo ── */}
              <div>
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(v: 'thermal' | 'laser' | 'inkjet' | 'network') => setForm({ ...form, type: v })}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thermal">Térmica (POS)</SelectItem>
                    <SelectItem value="laser">Láser</SelectItem>
                    <SelectItem value="inkjet">Inyección de tinta</SelectItem>
                    <SelectItem value="network">Red / Virtual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ── Tamaño de papel ── */}
              <div>
                <Label>Tamaño de papel</Label>
                <Select value={form.paperSize} onValueChange={(v) => setForm({ ...form, paperSize: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                    <SelectItem value="Letter">Carta (216 × 279 mm)</SelectItem>
                    <SelectItem value="80mm">80 mm (Ticket)</SelectItem>
                    <SelectItem value="58mm">58 mm (Ticket)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave}>
                  {editingPrinter ? 'Guardar cambios' : 'Agregar impresora'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Lista de impresoras guardadas ── */}
      <div className="space-y-3">
        {printers && printers.length > 0 ? (
          printers.map(printer => (
            <div key={printer.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Printer className="h-5 w-5 text-gray-500 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{printer.name}</p>
                    {printer.isDefault && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {printer.type === 'thermal' && 'Térmica'}
                      {printer.type === 'laser'   && 'Láser'}
                      {printer.type === 'inkjet'  && 'Inyección'}
                      {printer.type === 'network' && 'Red'}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">{printer.paperSize}</Badge>
                    {printer.isDefault && <Badge variant="default" className="text-xs">Predeterminada</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleOpen(printer)}>
                  <Edit className="h-4 w-4" />
                </Button>
                {!printer.isDefault && (
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                    title="Establecer como predeterminada"
                    onClick={() => { onSetDefault(printer.id); toast.success('Impresora predeterminada actualizada'); }}>
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Switch
                  checked={printer.isActive}
                  onCheckedChange={(checked) => {
                    onUpdate(printer.id, { isActive: checked });
                    toast.success(checked ? `${printer.name} activada` : `${printer.name} desactivada`);
                  }}
                />
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleDelete(printer.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-gray-400 border border-dashed rounded-lg">
            <Printer className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay impresoras configuradas</p>
            <p className="text-xs mt-1">Haz clic en "Agregar" para añadir una</p>
          </div>
        )}
      </div>
      {ConfirmDialog}
    </div>
  );
}
