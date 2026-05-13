import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import type { Sale } from '@/types/sale';

interface Props {
  sales: Sale[];
}

export default function TopProductsWidget({ sales }: Props) {
  const completedToday = sales.filter(s => {
    if (s.status !== 'completed' || s.type !== 'sale') return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const sd = new Date(s.createdAt); sd.setHours(0, 0, 0, 0);
    return sd.getTime() === today.getTime();
  });

  const countMap = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const s of completedToday) {
    for (const it of s.items) {
      const existing = countMap.get(it.productId);
      if (existing) {
        existing.qty += it.quantity;
        existing.revenue += it.total;
      } else {
        countMap.set(it.productId, { name: it.productName, qty: it.quantity, revenue: it.total });
      }
    }
  }

  const top5 = [...countMap.values()]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Star className="h-4 w-4" />
          Top Productos Hoy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {top5.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin ventas hoy</p>
        )}
        {top5.map((p, i) => (
          <div key={p.name} className="flex items-center gap-2 py-1 border-b last:border-0">
            <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}.</span>
            <span className="text-sm flex-1 truncate font-medium">{p.name}</span>
            <span className="text-xs text-gray-500">{p.qty} uds</span>
            <span className="text-sm font-semibold text-green-700 ml-2">
              ${p.revenue.toLocaleString('es-CO')}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
