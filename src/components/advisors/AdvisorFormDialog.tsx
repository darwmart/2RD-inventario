import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; email: string; phone: string }) => void;
}

export default function AdvisorFormDialog({ open, onClose, onSave }: Props) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    if (!open) setForm({ name: '', email: '', phone: '' });
  }, [open]);

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return; }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Asesor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre Completo</Label>
            <Input
              id="name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre del asesor"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="email@ejemplo.com"
            />
          </div>
          <div>
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="300 123 4567"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave}>Agregar Asesor</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
