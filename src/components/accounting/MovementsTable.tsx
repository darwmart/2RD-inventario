import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDownCircle, ArrowUpCircle, ShoppingBag, ArrowRightLeft, Calculator } from 'lucide-react';
import { fmtDateTime } from '@/utils/dates';

export type Movement = {
  id: string;
  date: Date;
  type: 'venta' | 'abono' | 'gasto' | 'compra' | 'traspaso' | 'apertura' | 'ingreso';
  description: string;
  amount: number;
  grossAmount?: number;
  commissionAmt?: number;
  bank: string;
  bankLabel: string;
  direction: 'in' | 'out';
  settled: boolean;
  expectedDate?: Date;
};

interface Props {
  movements: Movement[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  venta:    { label: 'Venta',         color: 'bg-green-100 text-green-700',   icon: <ArrowDownCircle className="h-3 w-3" /> },
  abono:    { label: 'Abono',         color: 'bg-blue-100 text-blue-700',     icon: <ArrowDownCircle className="h-3 w-3" /> },
  gasto:    { label: 'Gasto',         color: 'bg-red-100 text-red-700',       icon: <ArrowUpCircle className="h-3 w-3" /> },
  compra:   { label: 'Compra',        color: 'bg-orange-100 text-orange-700', icon: <ShoppingBag className="h-3 w-3" /> },
  traspaso: { label: 'A Caja Fuerte', color: 'bg-purple-100 text-purple-700', icon: <ArrowRightLeft className="h-3 w-3" /> },
  apertura: { label: 'Apertura Caja', color: 'bg-indigo-100 text-indigo-700', icon: <ArrowRightLeft className="h-3 w-3" /> },
  ingreso:  { label: 'Ingreso Capital', color: 'bg-emerald-100 text-emerald-700', icon: <ArrowDownCircle className="h-3 w-3" /> },
};

export default function MovementsTable({ movements }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Movimientos ({movements.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {movements.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No hay movimientos para el período seleccionado</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Entrada</TableHead>
                <TableHead className="text-right">Salida</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map(m => {
                const cfg = TYPE_CONFIG[m.type];
                return (
                  <TableRow key={m.id} className={!m.settled && m.direction === 'in' ? 'bg-amber-50' : ''}>
                    <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                      {fmtDateTime(m.date)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${cfg.color} gap-1 text-xs font-medium`}>
                        {cfg.icon}{cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-xs">
                      <span className="truncate block">{m.description}</span>
                      {m.commissionAmt && (
                        <span className="text-xs text-rose-500">Comisión: -{fmt(m.commissionAmt)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{m.bankLabel}</TableCell>
                    <TableCell className="text-xs">
                      {!m.settled && m.direction === 'in' ? (
                        <span className="text-amber-600 font-medium">
                          Por cobrar{m.expectedDate
                            ? ` ${m.expectedDate.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })}`
                            : ''}
                        </span>
                      ) : (
                        <span className="text-gray-400">Acreditado</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {m.direction === 'in' ? (
                        <span className={m.settled ? 'text-green-600' : 'text-amber-500'}>{fmt(m.amount)}</span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {m.direction === 'out' ? (
                        <span className="text-red-600">{fmt(m.amount)}</span>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
