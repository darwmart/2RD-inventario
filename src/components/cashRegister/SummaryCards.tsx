import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Banknote, CreditCard, Smartphone } from 'lucide-react';

interface TotalsWithDeposits {
  total: number;
  cash: number;
  electronic: number;
  credit: number;
}

interface Summary {
  totalTransactions: number;
}

interface DepositSummary {
  totalTransactions: number;
}

interface Props {
  totalsWithDeposits: TotalsWithDeposits;
  summary: Summary;
  depositSummary: DepositSummary;
  estimatedCloseCash: number;
}

export default function SummaryCards({ totalsWithDeposits, summary, depositSummary, estimatedCloseCash }: Props) {
  const total = totalsWithDeposits.total || 1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
          <Calculator className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalsWithDeposits.total.toLocaleString('es-CO')}</div>
          <p className="text-xs text-muted-foreground">
            {summary.totalTransactions} ventas • {depositSummary.totalTransactions} abonos
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ventas en Efectivo</CardTitle>
          <Banknote className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">${totalsWithDeposits.cash.toLocaleString('es-CO')}</div>
          <p className="text-xs text-muted-foreground">
            {((totalsWithDeposits.cash / total) * 100).toFixed(1)}% del total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Medios Electrónicos</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">${totalsWithDeposits.electronic.toLocaleString('es-CO')}</div>
          <p className="text-xs text-muted-foreground">
            {((totalsWithDeposits.electronic / total) * 100).toFixed(1)}% del total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Créditos</CardTitle>
          <Smartphone className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">${totalsWithDeposits.credit.toLocaleString('es-CO')}</div>
          <p className="text-xs text-muted-foreground">
            {((totalsWithDeposits.credit / total) * 100).toFixed(1)}% del total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cierre Estimado</CardTitle>
          <Calculator className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-indigo-600">${estimatedCloseCash.toLocaleString('es-CO')}</div>
          <p className="text-xs text-muted-foreground">Apertura + efectivo − gastos</p>
        </CardContent>
      </Card>
    </div>
  );
}
