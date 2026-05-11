import { Button } from '@/components/ui/button';
import { Plus, FolderPlus, Settings2, Tag } from 'lucide-react';

interface Props {
  onNewProduct: () => void;
  onNewCategory: () => void;
  onPrintLabels: () => void;
  onColumnConfig: () => void;
}

export default function InventoryToolbar({ onNewProduct, onNewCategory, onPrintLabels, onColumnConfig }: Props) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="text-2xl font-bold">Archivo de artículos</h1>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onColumnConfig}>
          <Settings2 className="h-4 w-4 mr-2" />Columnas
        </Button>
        <Button variant="outline" size="sm" onClick={onNewCategory}>
          <FolderPlus className="h-4 w-4 mr-2" />Nueva Categoría
        </Button>
        <Button variant="outline" size="sm" onClick={onPrintLabels}>
          <Tag className="h-4 w-4 mr-2" />Imprimir Etiquetas
        </Button>
        <Button size="sm" onClick={onNewProduct}>
          <Plus className="h-4 w-4 mr-2" />Nuevo Artículo
        </Button>
      </div>
    </div>
  );
}
