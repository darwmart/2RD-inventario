import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, Printer } from 'lucide-react';

interface Props {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onPrintClosure: () => void;
}

export default function CashRegisterHeader({ selectedDate, onDateChange, onPrintClosure }: Props) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Arqueo de Caja</h1>
        <p className="mt-2 text-gray-600">Resumen diario de ventas y métodos de pago</p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onPrintClosure}>
          <Printer className="h-4 w-4 mr-1" />Imprimir Cierre
        </Button>
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
