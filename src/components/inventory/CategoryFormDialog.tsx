import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FolderPlus, Edit2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface CategoryEntry {
  id: string;
  name: string;
  description: string;
}

interface Props {
  open: boolean;
  editingCategory: CategoryEntry | null;
  categories: CategoryEntry[];
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}

export default function CategoryFormDialog({ open, editingCategory, categories, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(editingCategory?.name ?? '');
    setDescription(editingCategory?.description ?? '');
  }, [open, editingCategory]);

  const handleSave = () => {
    if (!name.trim()) { toast.error('El nombre de la categoría es obligatorio'); return; }
    const dup = categories.find(c =>
      c.name.trim().toLowerCase() === name.trim().toLowerCase() && c.id !== editingCategory?.id
    );
    if (dup) { toast.error('Ya existe una categoría con ese nombre'); return; }
    onSave(name.trim(), description.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label className="text-sm font-medium">Nombre *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Accesorios, Ropa deportiva..."
              className="mt-1"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              autoFocus
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Descripción (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe brevemente esta categoría..."
              className="mt-1"
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>
            {editingCategory
              ? <><Edit2 className="h-4 w-4 mr-2" />Guardar cambios</>
              : <><Plus className="h-4 w-4 mr-2" />Crear Categoría</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
