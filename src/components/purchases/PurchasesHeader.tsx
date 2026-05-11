import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Calendar } from 'lucide-react';

interface Props {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onNewPurchase: () => void;
}

export default function PurchasesHeader({ selectedDate, onDateChange, onNewPurchase }: Props) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Compras</h1>
        <p className="mt-2 text-gray-600">Registra facturas de compra e ingresa productos al inventario</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          <Input
            type="date"
            value={selectedDate}
            onChange={e => onDateChange(e.target.value)}
            className="w-auto"
          />
        </div>
        <Button onClick={onNewPurchase}>
          <Plus className="h-4 w-4 mr-2" />Nueva Compra
        </Button>
      </div>
    </div>
  );
}
