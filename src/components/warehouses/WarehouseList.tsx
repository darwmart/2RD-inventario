import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Warehouse } from 'lucide-react';
import { ExternalWarehouse } from '@/types';

interface Props {
  warehouses: ExternalWarehouse[];
  selectedId: string | null;
  isAdmin: boolean;
  getWarehouseStock: (id: string) => Record<string, { quantity: number }>;
  onSelect: (id: string) => void;
  onEdit: (w: ExternalWarehouse) => void;
  onDelete: (w: ExternalWarehouse) => void;
}

export default function WarehouseList({ warehouses, selectedId, isAdmin, getWarehouseStock, onSelect, onEdit, onDelete }: Props) {
  return (
    <div className="w-72 flex-shrink-0 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Bodegas ({warehouses.length})</h2>
      {warehouses.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed rounded-lg">
          <Warehouse className="h-8 w-8 mx-auto mb-2 opacity-40" />No hay bodegas registradas
        </div>
      )}
      <div className="flex flex-col gap-2 overflow-y-auto">
        {warehouses.map(w => {
          const totalUnits = Object.values(getWarehouseStock(w.id)).reduce((s, v) => s + v.quantity, 0);
          return (
            <div key={w.id} onClick={() => onSelect(w.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedId === w.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'}`}>
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{w.name}</p>
                  <p className="text-xs text-gray-400">{w.code}</p>
                  {w.location && <p className="text-xs text-gray-500 truncate">{w.location}</p>}
                </div>
                <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium ml-2 flex-shrink-0">
                  {totalUnits} uds
                </span>
              </div>
              {isAdmin && (
                <div className="flex gap-1 mt-2" onClick={e => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => onEdit(w)}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-red-500 hover:text-red-600" onClick={() => onDelete(w)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
