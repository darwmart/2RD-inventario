import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Calendar } from 'lucide-react';

interface Props {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onNewSale: () => void;
}

export default function SalesPageHeader({ selectedDate, onDateChange, onNewSale }: Props) {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold">Ventas Diarias</h1>
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-gray-400" />
        <Input
          type="date"
          value={selectedDate}
          onChange={e => onDateChange(e.target.value)}
          className="w-auto"
        />
      </div>
      <Button onClick={onNewSale}>
        <Plus className="h-4 w-4 mr-2" />
        Nueva Venta
      </Button>
    </div>
  );
}
