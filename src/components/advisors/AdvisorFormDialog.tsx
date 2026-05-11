import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fmtMoneyInput, parseMoney } from '@/utils/formatters';
import { toast } from 'sonner';

interface AdvisorFormData {
  name: string;
  email: string;
  phone: string;
  document?: string;
  baseSalary?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: AdvisorFormData) => void;
}

export default function AdvisorFormDialog({ open, onClose, onSave }: Props) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', document: '', baseSalary: '' });

  useEffect(() => {
    if (!open) setForm({ name: '', email: '', phone: '', document: '', baseSalary: '' });
  }, [open]);

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return; }
    const base = parseMoney(form.baseSalary);
    onSave({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      document: form.document.trim() || undefined,
      baseSalary: base > 0 ? base : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Asesor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre Completo <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre del asesor"
            />
          </div>
          <div>
            <Label htmlFor="document">Cédula de ciudadanía</Label>
            <Input
              id="document"
              value={form.document}
              onChange={e => setForm({ ...form, document: e.target.value })}
              placeholder="1234567890"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          <div>
            <Label htmlFor="baseSalary">Salario base mensual</Label>
            <Input
              id="baseSalary"
              type="text"
              inputMode="numeric"
              value={form.baseSalary}
              onChange={e => setForm({ ...form, baseSalary: fmtMoneyInput(e.target.value) })}
              placeholder="$0"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave}>Agregar Asesor</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
