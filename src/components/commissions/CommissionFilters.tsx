import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type Period = 'day' | 'month' | 'year';

interface Props {
  period: Period;
  selectedDate: string;
  commissionRate: number;
  onPeriodChange: (p: Period) => void;
  onDateChange: (d: string) => void;
  onRateChange: (r: number) => void;
}

export default function CommissionFilters({ period, selectedDate, commissionRate, onPeriodChange, onDateChange, onRateChange }: Props) {
  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div>
        <Label>Periodo</Label>
        <Select value={period} onValueChange={v => onPeriodChange(v as Period)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Día</SelectItem>
            <SelectItem value="month">Mes</SelectItem>
            <SelectItem value="year">Año</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Fecha</Label>
        {period === 'day' && (
          <Input type="date" value={selectedDate} onChange={e => onDateChange(e.target.value)} className="w-44" />
        )}
        {period === 'month' && (
          <Input type="month" value={selectedDate} onChange={e => onDateChange(e.target.value)} className="w-44" />
        )}
        {period === 'year' && (
          <Input type="number" min={2020} max={2099} value={selectedDate.slice(0, 4)} onChange={e => onDateChange(e.target.value)} className="w-28" />
        )}
      </div>
      <div>
        <Label>% Comisión base</Label>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={commissionRate}
            onChange={e => onRateChange(Number(e.target.value))}
            className="w-24"
          />
          <span className="text-sm text-gray-500">%</span>
        </div>
      </div>
    </div>
  );
}
