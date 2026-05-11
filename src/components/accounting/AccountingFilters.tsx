import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Bank { id: string; name: string; isActive: boolean }

interface Props {
  fechaInicio: string;
  fechaFin: string;
  filterType: string;
  filterBank: string;
  banks: Bank[];
  onFechaInicio: (v: string) => void;
  onFechaFin: (v: string) => void;
  onFilterType: (v: string) => void;
  onFilterBank: (v: string) => void;
  onClear: () => void;
}

export default function AccountingFilters({
  fechaInicio, fechaFin, filterType, filterBank, banks,
  onFechaInicio, onFechaFin, onFilterType, onFilterBank, onClear,
}: Props) {
  const hasFilters = !!(fechaInicio || fechaFin || filterType !== 'all' || filterBank !== 'all');

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <p className="text-xs text-gray-500 mb-1">Desde</p>
            <Input type="date" value={fechaInicio} onChange={e => onFechaInicio(e.target.value)} className="w-36" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Hasta</p>
            <Input type="date" value={fechaFin} onChange={e => onFechaFin(e.target.value)} className="w-36" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Tipo</p>
            <Select value={filterType} onValueChange={onFilterType}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="venta">Ventas</SelectItem>
                <SelectItem value="abono">Abonos</SelectItem>
                <SelectItem value="gasto">Gastos</SelectItem>
                <SelectItem value="compra">Compras</SelectItem>
                <SelectItem value="traspaso">Traspasos</SelectItem>
                <SelectItem value="ingreso">Ingresos Capital</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Banco</p>
            <Select value={filterBank} onValueChange={onFilterBank}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {banks.filter(b => b.isActive).map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasFilters && (
            <button onClick={onClear} className="text-xs text-blue-600 hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
