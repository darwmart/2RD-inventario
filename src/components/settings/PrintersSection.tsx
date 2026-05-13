import { useState } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Printer, Edit, Trash2, Star } from 'lucide-react';
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterType | null>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'thermal' as 'thermal' | 'laser' | 'inkjet' | 'network',
    paperSize: 'A4',
  });

  const handleOpen = (printer?: PrinterType) => {
    if (printer) {
      setEditingPrinter(printer);
      setForm({ name: printer.name, type: printer.type, paperSize: printer.paperSize || 'A4' });
    } else {
      setEditingPrinter(null);
      setForm({ name: '', type: 'thermal', paperSize: 'A4' });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('El nombre de la impresora es requerido'); return; }
    if (editingPrinter) {
      onUpdate(editingPrinter.id, { name: form.name.trim(), type: form.type, paperSize: form.paperSize });
      toast.success('Impresora actualizada exitosamente');
    } else {
      onAdd({
        id: form.name.toLowerCase().replace(/\s+/g, '-'),
        name: form.name.trim(),
        type: form.type,
        paperSize: form.paperSize,
        isActive: true,
        isDefault: false,
        createdAt: new Date(),
      });
      toast.success('Impresora agregada exitosamente');
    }
    setForm({ name: '', type: 'thermal', paperSize: 'A4' });
    setEditingPrinter(null);
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({ description: '¿Estás seguro de que deseas eliminar esta impresora?', confirmLabel: 'Eliminar' })) return;
    onDelete(id);
    toast.success('Impresora eliminada exitosamente');
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPrinter ? 'Editar Impresora' : 'Agregar Impresora'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="printer-name">Nombre de la Impresora</Label>
                <Input
                  id="printer-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: HP LaserJet, Epson TM-T20..."
                />
              </div>
              <div>
                <Label>Tipo de Impresora</Label>
                <Select
                  value={form.type}
                  onValueChange={(v: 'thermal' | 'laser' | 'inkjet' | 'network') => setForm({ ...form, type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Select value={form.paperSize} onValueChange={(v) => setForm({ ...form, paperSize: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4 (210 x 297 mm)</SelectItem>
                    <SelectItem value="Letter">Carta (216 x 279 mm)</SelectItem>
                    <SelectItem value="80mm">80mm (Ticket)</SelectItem>
                    <SelectItem value="58mm">58mm (Ticket)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave}>{editingPrinter ? 'Guardar Cambios' : 'Agregar Impresora'}</Button>
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
                    {printer.isDefault && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {printer.type === 'thermal' && 'Térmica'}
                      {printer.type === 'laser' && 'Láser'}
                      {printer.type === 'inkjet' && 'Inyección'}
                      {printer.type === 'network' && 'Red'}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">{printer.paperSize}</Badge>
                    {printer.isDefault && <Badge variant="default" className="text-xs">Predeterminada</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => handleOpen(printer)}>
                  <Edit className="h-4 w-4" />
                </Button>
                {!printer.isDefault && (
                  <Button size="sm" variant="ghost" onClick={() => { onSetDefault(printer.id); toast.success('Impresora predeterminada actualizada'); }} title="Establecer como predeterminada">
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
                <Button size="sm" variant="ghost" onClick={() => handleDelete(printer.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">No hay impresoras configuradas</p>
        )}
      </div>
      {ConfirmDialog}
    </div>
  );
}
