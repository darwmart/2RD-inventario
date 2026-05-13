import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import type { Sale } from '@/types/sale';
import type { TaxSettings } from '@/types';
import { costWithIva } from '@/utils/ivaUtils';

interface Props {
  sales: Sale[];
  taxSettings: TaxSettings;
}

function fmtYAxis(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value}`;
}

function fmtTooltip(value: number): string {
  return `$${value.toLocaleString('es-CO')}`;
}

export default function SalesLineChart({ sales, taxSettings }: Props) {
  const data = useMemo(() => {
    const days: { label: string; ventas: number; utilidad: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const daySales = sales.filter(s => {
        if (s.status !== 'completed' || s.type !== 'sale') return false;
        const sd = new Date(s.createdAt);
        sd.setHours(0, 0, 0, 0);
        return sd.getTime() === d.getTime();
      });
      const ventas = daySales.reduce((sum, s) => sum + s.total, 0);
      const costo = daySales.reduce((sum, s) =>
        sum + s.items.reduce((si, it) => si + costWithIva(it.cost, it.hasIva, taxSettings) * it.quantity, 0), 0);
      days.push({ label, ventas, utilidad: Math.max(0, ventas - costo) });
    }
    return days;
  }, [sales, taxSettings]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4" />
          Ventas y Utilidad — Últimos 7 días
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtYAxis} tick={{ fontSize: 11 }} width={56} />
            <Tooltip formatter={(v: number) => fmtTooltip(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="ventas" name="Ventas" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="utilidad" name="Utilidad" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
