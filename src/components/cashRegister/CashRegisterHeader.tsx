import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';

interface Props {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export default function CashRegisterHeader({ selectedDate, onDateChange }: Props) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Arqueo de Caja</h1>
        <p className="mt-2 text-gray-600">Resumen diario de ventas y métodos de pago</p>
      </div>
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-gray-400" />
        <Input
          type="date"
          value={selectedDate}
          onChange={e => onDateChange(e.target.value)}
          className="w-auto"
        />
      </div>
    </div>
  );
}
