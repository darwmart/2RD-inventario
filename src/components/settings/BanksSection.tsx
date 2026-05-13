import { useState } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Landmark, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Bank } from '@/types';

interface Props {
  banks: Bank[];
  onAdd: (bank: Bank) => void;
  onUpdate: (id: string, updates: Partial<Bank>) => void;
  onDelete: (id: string) => void;
}

export default function BanksSection({ banks, onAdd, onUpdate, onDelete }: Props) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [form, setForm] = useState({ name: '' });

  const handleOpen = (bank?: Bank) => {
    if (bank) {
      setEditingBank(bank);
      setForm({ name: bank.name });
    } else {
      setEditingBank(null);
      setForm({ name: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('El nombre del banco es requerido'); return; }
    if (editingBank) {
      onUpdate(editingBank.id, { name: form.name.trim() });
      toast.success('Banco actualizado exitosamente');
    } else {
      onAdd({ id: form.name.toLowerCase().replace(/\s+/g, '-'), name: form.name.trim(), isActive: true });
      toast.success('Banco agregado exitosamente');
    }
    setForm({ name: '' });
    setEditingBank(null);
    setIsDialogOpen(false);
  };

  const handleDelete = async (bankId: string) => {
    if (!await confirm({ description: '¿Estás seguro de que deseas eliminar este banco?', confirmLabel: 'Eliminar' })) return;
    onDelete(bankId);
    toast.success('Banco eliminado exitosamente');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center">
            <Landmark className="h-5 w-5 mr-2" />
            Bancos / Entidades Financieras
          </h2>
          <p className="text-sm text-gray-600 mt-1">Administra los bancos disponibles</p>
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
              <DialogTitle>{editingBank ? 'Editar Banco' : 'Agregar Banco'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bank-name">Nombre del Banco</Label>
                <Input
                  id="bank-name"
                  value={form.name}
                  onChange={(e) => setForm({ name: e.target.value })}
                  placeholder="Ej: Bancolombia, Davivienda, etc."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave}>{editingBank ? 'Guardar Cambios' : 'Agregar Banco'}</Button>
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
                <Button size="sm" variant="ghost" onClick={() => handleOpen(bank)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Switch
                  checked={bank.isActive}
                  onCheckedChange={(checked) => {
                    onUpdate(bank.id, { isActive: checked });
                    toast.success(checked ? `${bank.name} activado` : `${bank.name} desactivado`);
                  }}
                />
                {bank.id !== 'efectivo' && (
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(bank.id)}>
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
      {ConfirmDialog}
    </div>
  );
}
