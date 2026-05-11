import { Card, CardContent } from '@/components/ui/card';

export interface AccountingSummary {
  ventas: number;
  ventasSettled: number;
  ventasPending: number;
  abonos: number;
  gastos: number;
  compras: number;
  traspasos: number;
  comisiones: number;
  utilidad: number;
}

interface Props {
  summary: AccountingSummary;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export default function PeriodSummaryCards({ summary }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      <Card>
        <CardContent className="pt-3 pb-3">
          <p className="text-xs text-gray-500">Ventas</p>
          <p className="text-base font-bold text-green-600">{fmt(summary.ventas)}</p>
          {summary.ventasPending > 0 && (
            <p className="text-xs text-amber-600">{fmt(summary.ventasPending)} pendiente</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-3 pb-3">
          <p className="text-xs text-gray-500">Por cobrar</p>
          <p className="text-base font-bold text-amber-600">{fmt(summary.ventasPending)}</p>
          <p className="text-xs text-gray-400">crédito pendiente</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-3 pb-3">
          <p className="text-xs text-gray-500">Comisiones</p>
          <p className="text-base font-bold text-rose-500">{fmt(summary.comisiones)}</p>
          <p className="text-xs text-gray-400">cobradas plataformas</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-3 pb-3">
          <p className="text-xs text-gray-500">Abonos</p>
          <p className="text-base font-bold text-blue-600">{fmt(summary.abonos)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-3 pb-3">
          <p className="text-xs text-gray-500">Gastos</p>
          <p className="text-base font-bold text-red-600">{fmt(summary.gastos)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-3 pb-3">
          <p className="text-xs text-gray-500">Compras</p>
          <p className="text-base font-bold text-orange-600">{fmt(summary.compras)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-3 pb-3">
          <p className="text-xs text-gray-500">Traspasos</p>
          <p className="text-base font-bold text-purple-600">{fmt(summary.traspasos)}</p>
        </CardContent>
      </Card>
      <Card className={summary.utilidad < 0 ? 'border-red-300' : 'border-green-300'}>
        <CardContent className="pt-3 pb-3">
          <p className="text-xs text-gray-500">Utilidad neta</p>
          <p className={`text-base font-bold ${summary.utilidad < 0 ? 'text-red-600' : 'text-green-700'}`}>
            {fmt(summary.utilidad)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
