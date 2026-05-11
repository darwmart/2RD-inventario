import { Card, CardContent } from '@/components/ui/card';

interface Bank { id: string; name: string; isActive: boolean }

interface Props {
  banks: Bank[];
  bankBalances: Record<string, number>;
  pendingByBank: Record<string, number>;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export default function BankBalancesGrid({ banks, bankBalances, pendingByBank }: Props) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
        Saldo consolidado (Caja Fuerte y Bancos)
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {banks.filter(b => b.isActive && b.id !== 'efectivo').map(b => {
          const balance = bankBalances[b.id] ?? 0;
          const pending = pendingByBank[b.id] ?? 0;
          return (
            <Card key={b.id} className={balance < 0 ? 'border-red-200' : ''}>
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500 mb-1">{b.name}</p>
                <p className={`text-xl font-bold ${balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {fmt(balance)}
                </p>
                {pending > 0 && (
                  <p className="text-xs text-amber-600 mt-1">+ {fmt(pending)} por cobrar</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
