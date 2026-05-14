import {
  TrendingUp, TrendingDown, ShoppingCart, DollarSign,
  Receipt, Clock, AlertTriangle, Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useDailyKPIs, useMonthlyKPIs, useCashFlow } from '@/hooks/useDashboardKPIs';
import { usePermission } from '@/contexts/RBACContext';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const fmtNum = (n: number) => n.toLocaleString('es-CO');

// ─── Card individual de KPI ───────────────────────────────────
interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
}

const colorMap = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   border: 'border-blue-100' },
  green:  { bg: 'bg-green-50',  icon: 'text-green-600',  border: 'border-green-100' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-100' },
  red:    { bg: 'bg-red-50',    icon: 'text-red-600',     border: 'border-red-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100' },
};

function KPICard({ title, value, subtitle, icon: Icon, trend, loading, color = 'blue' }: KPICardProps) {
  const c = colorMap[color];

  return (
    <Card className={`border ${c.border}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
              {title}
            </p>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin mt-2 text-muted-foreground" />
            ) : (
              <p className="text-2xl font-bold mt-1 truncate">{value}</p>
            )}
            {subtitle && !loading && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className={`rounded-lg p-2 ${c.bg} shrink-0 ml-2`}>
            <Icon className={`h-5 w-5 ${c.icon}`} />
          </div>
        </div>
        {trend && !loading && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'}`}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Grid de KPIs diarios ─────────────────────────────────────
export function DailyKPICards() {
  const { data: daily, isLoading: loadingDaily } = useDailyKPIs();
  const { data: monthly, isLoading: loadingMonthly } = useMonthlyKPIs();
  const { data: cashFlow, isLoading: loadingCash } = useCashFlow();
  const canViewCosts = usePermission('can_view_costs');
  const canViewAccounting = usePermission('can_view_accounting');

  const netCashFlow = cashFlow
    ? cashFlow.income_sales + cashFlow.income_deposits - cashFlow.expenses - cashFlow.purchases_paid
    : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      <KPICard
        title="Ventas hoy"
        value={fmtNum(daily?.total_sales ?? 0)}
        subtitle={`${fmtNum(daily?.total_returns ?? 0)} devoluciones`}
        icon={ShoppingCart}
        loading={loadingDaily}
        color="blue"
      />

      <KPICard
        title="Ingresos hoy"
        value={fmt(daily?.revenue ?? 0)}
        icon={DollarSign}
        loading={loadingDaily}
        color="green"
      />

      {canViewCosts && (
        <KPICard
          title="Utilidad bruta"
          value={fmt(daily?.gross_profit ?? 0)}
          subtitle={daily?.revenue
            ? `${((daily.gross_profit / daily.revenue) * 100).toFixed(1)}% margen`
            : ''}
          icon={TrendingUp}
          loading={loadingDaily}
          color="purple"
        />
      )}

      <KPICard
        title="Ticket promedio"
        value={fmt(daily?.avg_ticket ?? 0)}
        icon={Receipt}
        loading={loadingDaily}
        color="orange"
      />

      <KPICard
        title="Ventas del mes"
        value={fmt(monthly?.revenue ?? 0)}
        subtitle={`${fmtNum(monthly?.total_sales ?? 0)} transacciones`}
        icon={TrendingUp}
        loading={loadingMonthly}
        color="blue"
      />

      {canViewAccounting && (
        <KPICard
          title="Flujo de caja"
          value={fmt(netCashFlow)}
          subtitle="Ingr. - Gastos - Compras"
          icon={DollarSign}
          trend={netCashFlow >= 0 ? 'up' : 'down'}
          loading={loadingCash}
          color={netCashFlow >= 0 ? 'green' : 'red'}
        />
      )}

      <KPICard
        title="Cotizaciones"
        value={fmtNum(daily?.pending_quotes ?? 0)}
        subtitle="pendientes"
        icon={Clock}
        loading={loadingDaily}
        color="orange"
      />

      <KPICard
        title="Separados"
        value={fmtNum(daily?.pending_reserved ?? 0)}
        subtitle="pendientes"
        icon={AlertTriangle}
        loading={loadingDaily}
        color="orange"
      />
    </div>
  );
}
