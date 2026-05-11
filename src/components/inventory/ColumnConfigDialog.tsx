import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings2 } from 'lucide-react';

export interface VisibleColumns {
  code: boolean;
  description: boolean;
  barcode: boolean;
  category: boolean;
  stock: boolean;
  cost: boolean;
  suggestedPrice: boolean;
  currentPrice: boolean;
  discountPrice: boolean;
  wholesalePrice: boolean;
}

const ALL_VISIBLE: VisibleColumns = {
  code: true, description: true, barcode: true, category: true, stock: true,
  cost: true, suggestedPrice: true, currentPrice: true, discountPrice: true, wholesalePrice: true,
};

const COLUMN_LABELS: { key: keyof VisibleColumns; label: string }[] = [
  { key: 'code', label: 'Código' },
  { key: 'description', label: 'Descripción' },
  { key: 'barcode', label: 'C.Barras' },
  { key: 'category', label: 'Familia' },
  { key: 'stock', label: 'Stock' },
  { key: 'cost', label: 'Costo' },
  { key: 'suggestedPrice', label: 'P.Sugerido' },
  { key: 'currentPrice', label: 'P.Actual' },
  { key: 'discountPrice', label: 'P.Descuento' },
  { key: 'wholesalePrice', label: 'P.Mayorista' },
];

interface Props {
  open: boolean;
  visibleColumns: VisibleColumns;
  onClose: () => void;
  onChange: (cols: VisibleColumns) => void;
}

export default function ColumnConfigDialog({ open, visibleColumns, onClose, onChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configuración de columnas
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <div className="flex items-center justify-between mb-2 pb-2 border-b">
            <span className="text-sm font-medium text-gray-700">Selecciona las columnas a mostrar:</span>
            <Button variant="outline" size="sm" onClick={() => onChange(ALL_VISIBLE)}>
              Mostrar todas
            </Button>
          </div>
          {COLUMN_LABELS.map(({ key, label }) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox
                id={`col-${key}`}
                checked={visibleColumns[key]}
                onCheckedChange={(checked) => onChange({ ...visibleColumns, [key]: !!checked })}
              />
              <label htmlFor={`col-${key}`} className="text-sm cursor-pointer">{label}</label>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button onClick={onClose}>Aceptar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
