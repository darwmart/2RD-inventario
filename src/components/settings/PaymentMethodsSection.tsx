import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, CreditCard, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Bank, PaymentMethod } from '@/types';

interface Props {
  paymentMethods: PaymentMethod[];
  banks: Bank[];
  onAdd: (name: string, type: 'cash' | 'electronic' | 'credit', bankId?: string, commission?: number, paymentPeriod?: 'immediate' | 'weekly' | 'monthly', paymentDays?: number) => void;
  onUpdate: (id: string, updates: Partial<PaymentMethod>) => void;
  onDelete: (id: string) => void;
}

const EMPTY_FORM = {
  name: '',
  type: 'electronic' as 'cash' | 'electronic' | 'credit',
  bankId: '',
  commission: '',
  paymentPeriod: 'immediate' as 'immediate' | 'weekly' | 'monthly',
  paymentDays: '',
};

function typeLabel(type: 'cash' | 'electronic' | 'credit') {
  return type === 'cash' ? 'Efectivo' : type === 'electronic' ? 'Electrónico' : 'Crédito';
}

function typeBadge(type: 'cash' | 'electronic' | 'credit'): 'default' | 'secondary' | 'destructive' {
  return type === 'cash' ? 'default' : type === 'electronic' ? 'secondary' : 'destructive';
}

export default function PaymentMethodsSection({ paymentMethods, banks, onAdd, onUpdate, onDelete }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [newPM, setNewPM] = useState({ ...EMPTY_FORM });
  const [editingPM, setEditingPM] = useState<typeof EMPTY_FORM & { id: string } | null>(null);

  const handleAdd = () => {
    if (!newPM.name.trim()) { toast.error('El nombre del método de pago es requerido'); return; }
    onAdd(
      newPM.name.trim(),
      newPM.type,
      newPM.bankId || undefined,
      newPM.commission ? Number(newPM.commission) : undefined,
      newPM.paymentPeriod !== 'immediate' ? newPM.paymentPeriod : undefined,
      newPM.paymentDays ? Number(newPM.paymentDays) : undefined,
    );
    toast.success('Método de pago agregado exitosamente');
    setNewPM({ ...EMPTY_FORM });
    setIsAdding(false);
  };

  const handleSaveEdit = () => {
    if (!editingPM) return;
    if (!editingPM.name.trim()) { toast.error('El nombre del método es obligatorio'); return; }
    onUpdate(editingPM.id, {
      name: editingPM.name.trim(),
      type: editingPM.type,
      bankId: editingPM.bankId || undefined,
      commission: editingPM.commission ? Number(editingPM.commission) : undefined,
      paymentPeriod: editingPM.paymentPeriod !== 'immediate' ? editingPM.paymentPeriod : undefined,
      paymentDays: editingPM.paymentDays ? Number(editingPM.paymentDays) : undefined,
    });
    toast.success('Método de pago actualizado');
    setEditingPM(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar el método de pago "${name}"?`)) {
      onDelete(id);
      toast.success('Método de pago eliminado exitosamente');
    }
  };

  const periodLabel = (period: 'immediate' | 'weekly' | 'monthly') => {
    if (period === 'monthly') return 'Días después del fin de mes para recibir el pago';
    if (period === 'weekly') return 'Días después del domingo para recibir el pago';
    return 'Días desde la venta para recibir el pago';
  };

  const CreditFields = ({ form, onChange }: { form: typeof EMPTY_FORM; onChange: (updates: Partial<typeof EMPTY_FORM>) => void }) => (
    <>
      <div>
        <Label>Comisión de la plataforma (%)</Label>
        <p className="text-xs text-gray-500 mb-1">% que cobra la plataforma por cada venta (ej: 8)</p>
        <Input type="number" min="0" max="100" step="0.1" value={form.commission}
          onChange={(e) => onChange({ commission: e.target.value })} placeholder="Ej: 8" />
      </div>
      <div>
        <Label>Período de recaudo</Label>
        <p className="text-xs text-gray-500 mb-1">¿Cada cuánto agrupa las ventas antes de pagar?</p>
        <Select value={form.paymentPeriod} onValueChange={(v: 'immediate' | 'weekly' | 'monthly') => onChange({ paymentPeriod: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="immediate">Por transacción (paga individualmente)</SelectItem>
            <SelectItem value="weekly">Semanal (recauda lun–dom, paga después)</SelectItem>
            <SelectItem value="monthly">Mensual (recauda el mes, paga después)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Días de pago después del cierre del período</Label>
        <p className="text-xs text-gray-500 mb-1">{periodLabel(form.paymentPeriod)}</p>
        <Input type="number" min="0" step="1" value={form.paymentDays}
          onChange={(e) => onChange({ paymentDays: e.target.value })} placeholder="Ej: 30" />
      </div>
    </>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Métodos de Pago
          </h2>
          <p className="text-sm text-gray-600 mt-1">Administra los métodos de pago disponibles</p>
        </div>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Agregar</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Agregar Método de Pago</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="payment-name">Nombre del Método</Label>
                <Input id="payment-name" value={newPM.name}
                  onChange={(e) => setNewPM({ ...newPM, name: e.target.value })}
                  placeholder="Ej: PayPal, Wompi, etc." />
              </div>
              <div>
                <Label>Tipo de Método</Label>
                <Select value={newPM.type} onValueChange={(v: 'cash' | 'electronic' | 'credit') => setNewPM({ ...newPM, type: v, bankId: '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="electronic">Electrónico</SelectItem>
                    <SelectItem value="credit">Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newPM.type !== 'cash' && (
                <div>
                  <Label>Banco destino</Label>
                  <p className="text-xs text-gray-500 mb-1">¿En qué cuenta se acredita el dinero?</p>
                  <Select value={newPM.bankId} onValueChange={(v) => setNewPM({ ...newPM, bankId: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar banco..." /></SelectTrigger>
                    <SelectContent>
                      {banks.filter(b => b.isActive && b.id !== 'efectivo').map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {newPM.type === 'credit' && <CreditFields form={newPM} onChange={(u) => setNewPM({ ...newPM, ...u })} />}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAdding(false)}>Cancelar</Button>
                <Button onClick={handleAdd}>Agregar Método</Button>
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
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant={typeBadge(method.type)} className="text-xs">{typeLabel(method.type)}</Badge>
                    {method.bankId && (
                      <span className="text-xs text-gray-500">
                        → {banks.find(b => b.id === method.bankId)?.name ?? method.bankId}
                      </span>
                    )}
                    {method.commission !== undefined && (
                      <span className="text-xs text-rose-500">Comisión: {method.commission}%</span>
                    )}
                    {method.paymentPeriod && method.paymentPeriod !== 'immediate' && (
                      <span className="text-xs text-amber-600">
                        {method.paymentPeriod === 'weekly' ? 'Recaudo semanal' : 'Recaudo mensual'}
                        {method.paymentDays ? ` + ${method.paymentDays} días` : ''}
                      </span>
                    )}
                    {(!method.paymentPeriod || method.paymentPeriod === 'immediate') && method.paymentDays !== undefined && (
                      <span className="text-xs text-amber-600">Pago: {method.paymentDays} días</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={method.isActive}
                  onCheckedChange={(checked) => {
                    onUpdate(method.id, { isActive: checked });
                    toast.success(checked ? `${method.name} activado` : `${method.name} desactivado`);
                  }}
                />
                <Button size="sm" variant="ghost" onClick={() => setEditingPM({
                  id: method.id, name: method.name, type: method.type,
                  bankId: method.bankId ?? '', commission: method.commission?.toString() ?? '',
                  paymentPeriod: method.paymentPeriod ?? 'immediate', paymentDays: method.paymentDays?.toString() ?? '',
                })}>
                  <Edit className="h-4 w-4 text-blue-500" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(method.id, method.name)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">No hay métodos de pago configurados</p>
        )}
      </div>

      {/* Diálogo editar */}
      <Dialog open={!!editingPM} onOpenChange={(open) => { if (!open) setEditingPM(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Método de Pago</DialogTitle></DialogHeader>
          {editingPM && (
            <div className="space-y-4">
              <div>
                <Label>Nombre del Método</Label>
                <Input value={editingPM.name}
                  onChange={(e) => setEditingPM({ ...editingPM, name: e.target.value })}
                  placeholder="Ej: Bre-B, Transfiya, Nequi..." />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={editingPM.type} onValueChange={(v: 'cash' | 'electronic' | 'credit') => setEditingPM({ ...editingPM, type: v, bankId: '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="electronic">Electrónico</SelectItem>
                    <SelectItem value="credit">Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingPM.type !== 'cash' && (
                <div>
                  <Label>Banco destino</Label>
                  <p className="text-xs text-gray-500 mb-1">¿En qué cuenta se acredita el dinero?</p>
                  <Select value={editingPM.bankId} onValueChange={(v) => setEditingPM({ ...editingPM, bankId: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar banco..." /></SelectTrigger>
                    <SelectContent>
                      {banks.filter(b => b.isActive && b.id !== 'efectivo').map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {editingPM.type === 'credit' && <CreditFields form={editingPM} onChange={(u) => setEditingPM({ ...editingPM, ...u })} />}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingPM(null)}>Cancelar</Button>
                <Button onClick={handleSaveEdit}>Guardar Cambios</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
