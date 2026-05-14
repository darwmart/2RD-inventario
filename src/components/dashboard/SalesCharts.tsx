import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSalesByDay, useTopProducts, useSalesByAdvisor } from '@/hooks/useDashboardKPIs';
import { usePermission } from '@/contexts/RBACContext';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ef4444', '#06b6d4'];

// ─── Gráfica de área: ventas por día ─────────────────────────
export function SalesAreaChart({ days = 30 }: { days?: number }) {
  const { data, isLoading } = useSalesByDay(days);
  const canViewCosts = usePermission('can_view_costs');

  if (isLoading) return <ChartSkeleton title={`Ventas — últimos ${days} días`} />;

  const formatted = (data ?? []).map(row => ({
    day: new Date(row.day).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }),
    Ingresos: Number(row.revenue),
    Ventas: Number(row.total_sales),
    ...(canViewCosts ? { Utilidad: Number(row.gross_profit) } : {}),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Ingresos — últimos {days} días</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={formatted}>
            <defs>
              <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              {canViewCosts && (
                <linearGradient id="colorUtilidad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              )}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(v: number, name: string) => [`$${v.toLocaleString('es-CO')}`, name]}
            />
            <Legend />
            <Area type="monotone" dataKey="Ingresos" stroke="#3b82f6" fill="url(#colorIngresos)" strokeWidth={2} />
            {canViewCosts && (
              <Area type="monotone" dataKey="Utilidad" stroke="#22c55e" fill="url(#colorUtilidad)" strokeWidth={2} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Gráfica de barras: top productos ────────────────────────
export function TopProductsChart({ limit = 8 }: { limit?: number }) {
  const { data, isLoading } = useTopProducts(limit, 30);
  const canViewCosts = usePermission('can_view_costs');

  if (isLoading) return <ChartSkeleton title="Top productos" />;

  const formatted = (data ?? []).map(row => ({
    name: row.product_name.length > 15
      ? row.product_name.slice(0, 15) + '…'
      : row.product_name,
    Unidades: Number(row.units_sold),
    Ingresos: Number(row.revenue),
    ...(canViewCosts ? { Utilidad: Number(row.profit) } : {}),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Top {limit} productos (30 días)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={formatted} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={90} />
            <Tooltip formatter={(v: number, name: string) => [
              name === 'Unidades' ? v : `$${v.toLocaleString('es-CO')}`,
              name,
            ]} />
            <Legend />
            <Bar dataKey="Unidades" fill="#3b82f6" radius={[0, 3, 3, 0]} />
            {canViewCosts && <Bar dataKey="Utilidad" fill="#22c55e" radius={[0, 3, 3, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Gráfica de pie: ventas por asesor ───────────────────────
export function AdvisorSalesPieChart() {
  const { data, isLoading } = useSalesByAdvisor();
  const canViewReports = usePermission('can_view_reports');

  if (!canViewReports) return null;
  if (isLoading) return <ChartSkeleton title="Ventas por asesor" />;

  const formatted = (data ?? []).slice(0, 6).map(row => ({
    name: row.advisor_name,
    value: Number(row.revenue),
  }));

  const total = formatted.reduce((s, r) => s + r.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Ventas por asesor (mes)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={formatted}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              label={({ name, value }) =>
                `${name}: ${((value / total) * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {formatted.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => `$${v.toLocaleString('es-CO')}`} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Gráfica compuesta: ingresos + ventas ────────────────────
export function ComposedSalesChart() {
  const { data, isLoading } = useSalesByDay(14);

  if (isLoading) return <ChartSkeleton title="Resumen 14 días" />;

  const formatted = (data ?? []).map(row => ({
    day: new Date(row.day).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }),
    Ingresos: Number(row.revenue),
    Transacciones: Number(row.total_sales),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Ingresos vs transacciones (14 días)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="left" tickFormatter={fmt} tick={{ fontSize: 10 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(v: number, name: string) => [
                name === 'Transacciones' ? v : `$${v.toLocaleString('es-CO')}`,
                name,
              ]}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="Ingresos" fill="#3b82f6" opacity={0.8} radius={[3, 3, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="Transacciones" stroke="#f97316" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Skeleton mientras carga ──────────────────────────────────
function ChartSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center h-[220px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );
}
