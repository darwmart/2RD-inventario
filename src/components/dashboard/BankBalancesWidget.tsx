import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Landmark } from 'lucide-react';
import type { Bank } from '@/types/settings';

interface Props {
  banks: Bank[];
}

const fmt = (n: number) => `$${n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function BankBalancesWidget({ banks }: Props) {
  const active = banks.filter(b => b.isActive);
  const total = active.reduce((sum, b) => sum + (b.balance ?? 0), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Landmark className="h-4 w-4" />
          Saldos Bancarios
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {active.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay cuentas activas</p>
        )}
        {active.map(bank => (
          <div key={bank.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
            <span className="text-sm font-medium">{bank.name}</span>
            <span className={`text-sm font-semibold ${(bank.balance ?? 0) < 0 ? 'text-red-600' : 'text-green-700'}`}>
              {fmt(bank.balance ?? 0)}
            </span>
          </div>
        ))}
        {active.length > 0 && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-bold text-gray-700">Total</span>
            <span className={`text-sm font-bold ${total < 0 ? 'text-red-600' : 'text-green-700'}`}>
              {fmt(total)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
