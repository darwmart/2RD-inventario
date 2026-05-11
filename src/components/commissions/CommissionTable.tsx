import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { CommissionTotals } from './CommissionStatsCards';

export interface AdvisorCommission {
  advisorId: string;
  advisorName: string;
  salesCount: number;
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  commissionAmount: number;
  byPaymentType: { cash: number; electronic: number; credit: number };
}

interface Props {
  advisors: AdvisorCommission[];
  totals: CommissionTotals;
  commissionRate: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const pct = (a: number, total: number) => (total > 0 ? `${((a / total) * 100).toFixed(1)}%` : '0%');

export default function CommissionTable({ advisors, totals, commissionRate }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalle por Asesor</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asesor</TableHead>
              <TableHead className="text-center">Ventas</TableHead>
              <TableHead className="text-right">Total vendido</TableHead>
              <TableHead className="text-right">Utilidad</TableHead>
              <TableHead className="text-center">% del total</TableHead>
              <TableHead className="text-right">Comisión ({commissionRate}%)</TableHead>
              <TableHead>Por tipo de pago</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {advisors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-gray-400">
                  Sin ventas en el periodo seleccionado
                </TableCell>
              </TableRow>
            ) : (
              advisors.map(advisor => (
                <TableRow key={advisor.advisorId}>
                  <TableCell className="font-medium">{advisor.advisorName}</TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-blue-100 text-blue-800">{advisor.salesCount}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{fmt(advisor.totalSales)}</TableCell>
                  <TableCell className="text-right text-purple-700">{fmt(advisor.totalProfit)}</TableCell>
                  <TableCell className="text-center text-gray-600">{pct(advisor.totalSales, totals.totalSales)}</TableCell>
                  <TableCell className="text-right font-bold text-orange-700">{fmt(advisor.commissionAmount)}</TableCell>
                  <TableCell>
                    <div className="text-xs space-y-0.5">
                      {advisor.byPaymentType.cash > 0 && <div className="text-green-700">Efectivo: {fmt(advisor.byPaymentType.cash)}</div>}
                      {advisor.byPaymentType.electronic > 0 && <div className="text-blue-700">Electrónico: {fmt(advisor.byPaymentType.electronic)}</div>}
                      {advisor.byPaymentType.credit > 0 && <div className="text-orange-700">Crédito: {fmt(advisor.byPaymentType.credit)}</div>}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {advisors.length > 0 && (
            <TableFooter>
              <TableRow className="font-bold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-center">{totals.salesCount}</TableCell>
                <TableCell className="text-right">{fmt(totals.totalSales)}</TableCell>
                <TableCell className="text-right">{fmt(totals.totalProfit)}</TableCell>
                <TableCell className="text-center">100%</TableCell>
                <TableCell className="text-right text-orange-700">{fmt(totals.totalCommissions)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </CardContent>
    </Card>
  );
}
