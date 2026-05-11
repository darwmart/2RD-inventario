import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ExternalWarehouse } from '@/types';

export interface WarehouseFormData {
  name: string;
  location: string;
  contact: string;
  phone: string;
  description: string;
}

interface Props {
  open: boolean;
  editingWarehouse: ExternalWarehouse | null;
  onClose: () => void;
  onSave: (data: WarehouseFormData) => void;
}

const EMPTY: WarehouseFormData = { name: '', location: '', contact: '', phone: '', description: '' };

export default function WarehouseFormDialog({ open, editingWarehouse, onClose, onSave }: Props) {
  const [form, setForm] = useState<WarehouseFormData>(EMPTY);

  useEffect(() => {
    if (!open) return;
    setForm(editingWarehouse
      ? { name: editingWarehouse.name, location: editingWarehouse.location || '', contact: editingWarehouse.contact || '', phone: editingWarehouse.phone || '', description: editingWarehouse.description || '' }
      : EMPTY
    );
  }, [open, editingWarehouse]);

  const set = (k: keyof WarehouseFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingWarehouse ? 'Editar Bodega' : 'Nueva Bodega'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div>
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={set('name')} placeholder="Ej: Bodega Norte" />
          </div>
          <div>
            <Label>Ubicación</Label>
            <Input value={form.location} onChange={set('location')} placeholder="Dirección o referencia" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Persona de contacto</Label>
              <Input value={form.contact} onChange={set('contact')} placeholder="Nombre" />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={set('phone')} placeholder="Número" />
            </div>
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea value={form.description} rows={3} onChange={set('description')} placeholder="Notas adicionales" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)}>
            {editingWarehouse ? 'Guardar cambios' : 'Crear bodega'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
