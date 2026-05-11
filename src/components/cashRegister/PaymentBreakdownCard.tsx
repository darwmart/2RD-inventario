import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Banknote, CreditCard, Smartphone, Calculator } from 'lucide-react';
import { PaymentMethod } from '@/types';

interface SummaryData {
  paymentBreakdown: { [key: string]: { count: number; amount: number } };
  totalSales: number;
}

interface DepositSummaryData {
  depositBreakdown: { [key: string]: { count: number; amount: number } };
  totalDeposits: number;
}

interface Props {
  paymentMethods: PaymentMethod[];
  summary: SummaryData;
  depositSummary: DepositSummaryData;
}

function getPaymentIcon(type: 'cash' | 'electronic' | 'credit') {
  if (type === 'cash') return <Banknote className="h-4 w-4" />;
  if (type === 'electronic') return <CreditCard className="h-4 w-4" />;
  if (type === 'credit') return <Smartphone className="h-4 w-4" />;
  return <Calculator className="h-4 w-4" />;
}

export default function PaymentBreakdownCard({ paymentMethods, summary, depositSummary }: Props) {
  const allMethods = new Set([
    ...Object.keys(summary.paymentBreakdown),
    ...Object.keys(depositSummary.depositBreakdown),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desglose por Método de Pago</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from(allMethods).map(method => {
            const pm = paymentMethods.find(p => p.name === method);
            const salesData = summary.paymentBreakdown[method] || { count: 0, amount: 0 };
            const depositData = depositSummary.depositBreakdown[method] || { count: 0, amount: 0 };
            return (
              <div key={method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {pm && getPaymentIcon(pm.type)}
                  <div>
                    <p className="font-medium">{method}</p>
                    <p className="text-xs text-gray-600">
                      {salesData.count > 0 && `${salesData.count} ventas`}
                      {salesData.count > 0 && depositData.count > 0 && ' • '}
                      {depositData.count > 0 && `${depositData.count} abonos`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {salesData.amount > 0 && (
                    <>
                      <p className="font-bold">Ventas: ${salesData.amount.toLocaleString('es-CO')}</p>
                      <p className="text-xs text-gray-600 mb-1">
                        {((salesData.amount / (summary.totalSales || 1)) * 100).toFixed(1)}% del total ventas
                      </p>
                    </>
                  )}
                  {depositData.amount > 0 && (
                    <>
                      <p className="font-bold text-purple-700">Abonos: ${depositData.amount.toLocaleString('es-CO')}</p>
                      <p className="text-xs text-gray-600">
                        {((depositData.amount / (depositSummary.totalDeposits || 1)) * 100).toFixed(1)}% del total abonos
                      </p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
