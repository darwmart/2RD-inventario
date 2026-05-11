import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, Search, Building2 } from 'lucide-react';

interface Props {
  searchTerm: string;
  hasSelection: boolean;
  onSearchChange: (term: string) => void;
  onNew: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function SuppliersToolbar({ searchTerm, hasSelection, onSearchChange, onNew, onEdit, onDelete }: Props) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Fichero de proveedores
          </h1>
          <p className="text-sm text-gray-600 mt-1">Administre el fichero de proveedores de su empresa.</p>
        </div>
        <div className="relative w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, N.I.T., teléfono..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onNew}><Plus className="h-4 w-4 mr-1" />Nuevo</Button>
          <Button size="sm" variant="outline" onClick={onEdit} disabled={!hasSelection}>
            <Edit className="h-4 w-4 mr-1" />Editar
          </Button>
          <Button size="sm" variant="outline" onClick={onDelete} disabled={!hasSelection}>
            <Trash2 className="h-4 w-4 mr-1" />Borrar
          </Button>
        </div>
      </Card>
    </div>
  );
}
