import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Customer } from '@/types';
import { fmtMoneyInput } from '@/utils/formatters';
import { toast } from 'sonner';

export interface CustomerFormData {
  name: string;
  document: string;
  documentType: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  creditLimit: number;
  balance: number;
  notes: string;
  isActive: boolean;
}

const EMPTY: CustomerFormData = {
  name: '', document: '', documentType: 'CC', phone: '', email: '',
  address: '', city: '', creditLimit: 0, balance: 0, notes: '', isActive: true,
};

interface Props {
  open: boolean;
  editingCustomer: Customer | null;
  customers: Customer[];
  onClose: () => void;
  onSave: (data: CustomerFormData) => void;
}

export default function CustomerFormDialog({ open, editingCustomer, customers, onClose, onSave }: Props) {
  const [form, setForm] = useState<CustomerFormData>({ ...EMPTY });
  const [creditLimitStr, setCreditLimitStr] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editingCustomer) {
      setForm({
        name: editingCustomer.name,
        document: editingCustomer.document || '',
        documentType: editingCustomer.documentType || 'CC',
        phone: editingCustomer.phone || '',
        email: editingCustomer.email || '',
        address: editingCustomer.address || '',
        city: editingCustomer.city || '',
        creditLimit: editingCustomer.creditLimit || 0,
        balance: editingCustomer.balance || 0,
        notes: editingCustomer.notes || '',
        isActive: editingCustomer.isActive,
      });
      setCreditLimitStr(editingCustomer.creditLimit ? Math.round(editingCustomer.creditLimit).toLocaleString('es-CO') : '');
    } else {
      setForm({ ...EMPTY });
      setCreditLimitStr('');
    }
  }, [open, editingCustomer]);

  const set = <K extends keyof CustomerFormData>(key: K, value: CustomerFormData[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (form.document.trim()) {
      const dup = customers.find(c => c.document === form.document.trim() && c.id !== editingCustomer?.id);
      if (dup) { toast.error(`Ya existe un cliente con el documento ${form.document}`); return; }
    }
    if (form.phone.trim() && !/^\d{7,15}$/.test(form.phone.trim())) {
      toast.error('El teléfono debe contener solo dígitos (7-15 caracteres)'); return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error('El correo electrónico no tiene un formato válido'); return;
    }
    if (form.creditLimit < 0) { toast.error('El límite de crédito no puede ser negativo'); return; }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nombre completo" />
          </div>
          <div>
            <Label>Tipo de documento</Label>
            <select value={form.documentType} onChange={e => set('documentType', e.target.value)} className="w-full border rounded p-2 text-sm">
              <option>CC</option><option>NIT</option><option>CE</option><option>Pasaporte</option>
            </select>
          </div>
          <div>
            <Label>Número de documento</Label>
            <Input value={form.document} onChange={e => set('document', e.target.value)} placeholder="123456789" />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="300 000 0000" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={form.email} onChange={e => set('email', e.target.value)} placeholder="correo@ejemplo.com" />
          </div>
          <div className="col-span-2">
            <Label>Dirección</Label>
            <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Calle 00 # 00-00" />
          </div>
          <div>
            <Label>Ciudad</Label>
            <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Bogotá" />
          </div>
          <div>
            <Label>Cupo de crédito</Label>
            <Input
              type="text" inputMode="numeric" value={creditLimitStr}
              onChange={e => {
                const f = fmtMoneyInput(e.target.value);
                setCreditLimitStr(f);
                set('creditLimit', f === '' ? 0 : parseInt(f.replace(/\./g, ''), 10));
              }}
            />
          </div>
          <div className="col-span-2">
            <Label>Observaciones</Label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Notas adicionales..." />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} />
            <label htmlFor="isActive" className="text-sm">Cliente activo</label>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            {editingCustomer ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
