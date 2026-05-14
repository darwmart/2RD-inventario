import { Button } from '@/components/ui/button';
import { Plus, FolderPlus, Settings2, Tag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  onNewProduct: () => void;
  onNewCategory: () => void;
  onPrintLabels: () => void;
  onColumnConfig: () => void;
}

export default function InventoryToolbar({ onNewProduct, onNewCategory, onPrintLabels, onColumnConfig }: Props) {
  const { isAdmin } = useAuth();
  return (
    <div className="mb-2 md:mb-4 flex items-center justify-between gap-2">
      <h1 className="text-xl md:text-2xl font-bold shrink-0">Artículos</h1>
      <div className="flex gap-1.5 flex-wrap justify-end">
        <Button variant="outline" size="sm" onClick={onColumnConfig} className="h-8 px-2 md:px-3">
          <Settings2 className="h-4 w-4" />
          <span className="hidden md:inline ml-1.5">Columnas</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onPrintLabels} className="h-8 px-2 md:px-3">
          <Tag className="h-4 w-4" />
          <span className="hidden md:inline ml-1.5">Etiquetas</span>
        </Button>
        {isAdmin() && (
          <>
            <Button variant="outline" size="sm" onClick={onNewCategory} className="h-8 px-2 md:px-3">
              <FolderPlus className="h-4 w-4" />
              <span className="hidden md:inline ml-1.5">Categoría</span>
            </Button>
            <Button size="sm" onClick={onNewProduct} className="h-8 px-2 md:px-3">
              <Plus className="h-4 w-4" />
              <span className="ml-1">Nuevo</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
