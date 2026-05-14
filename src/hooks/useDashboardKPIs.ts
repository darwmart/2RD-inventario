import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ─── KPIs del día ────────────────────────────────────────────
export interface DailyKPIs {
  total_sales: number;
  revenue: number;
  gross_profit: number;
  avg_ticket: number;
  total_returns: number;
  returns_amount: number;
  pending_quotes: number;
  pending_reserved: number;
}

export function useDailyKPIs(date?: string) {
  const targetDate = date ?? new Date().toISOString().slice(0, 10);

  return useQuery<DailyKPIs>({
    queryKey: ['dashboard', 'daily_kpis', targetDate],
    queryFn: async () => {
      if (!supabase) return getEmptyDailyKPIs();
      const { data, error } = await supabase.rpc('get_daily_kpis', {
        p_date: targetDate,
      });
      if (error) throw error;
      return data as DailyKPIs;
    },
    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchInterval: 1000 * 60 * 5, // refresca cada 5 min
  });
}

// ─── KPIs del mes ────────────────────────────────────────────
export interface MonthlyKPIs {
  revenue: number;
  total_sales: number;
  avg_daily: number;
  avg_ticket: number;
  best_day_revenue: number;
}

export function useMonthlyKPIs(year?: number, month?: number) {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1;

  return useQuery<MonthlyKPIs>({
    queryKey: ['dashboard', 'monthly_kpis', y, m],
    queryFn: async () => {
      if (!supabase) return getEmptyMonthlyKPIs();
      const { data, error } = await supabase.rpc('get_monthly_kpis', {
        p_year: y,
        p_month: m,
      });
      if (error) throw error;
      return data as MonthlyKPIs;
    },
    staleTime: 1000 * 60 * 10,
  });
}

// ─── Ventas por día (gráfica de líneas) ──────────────────────
export interface SalesByDay {
  day: string;
  total_sales: number;
  revenue: number;
  gross_profit: number;
}

export function useSalesByDay(days = 30) {
  return useQuery<SalesByDay[]>({
    queryKey: ['dashboard', 'sales_by_day', days],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase.rpc('get_sales_by_day', {
        p_days: days,
      });
      if (error) throw error;
      return (data ?? []).map((row: SalesByDay) => ({
        ...row,
        revenue: Number(row.revenue),
        gross_profit: Number(row.gross_profit),
      }));
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Top productos ────────────────────────────────────────────
export interface TopProduct {
  product_id: string;
  product_name: string;
  units_sold: number;
  revenue: number;
  profit: number;
}

export function useTopProducts(limit = 10, days = 30) {
  return useQuery<TopProduct[]>({
    queryKey: ['dashboard', 'top_products', limit, days],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase.rpc('get_top_products', {
        p_limit: limit,
        p_days: days,
      });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 10,
  });
}

// ─── Ventas por asesor ────────────────────────────────────────
export interface AdvisorSales {
  advisor_id: string;
  advisor_name: string;
  total_sales: number;
  revenue: number;
  commission_earned: number;
}

export function useSalesByAdvisor(start?: string, end?: string) {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().slice(0, 10);
  const defaultEnd = now.toISOString().slice(0, 10);

  return useQuery<AdvisorSales[]>({
    queryKey: ['dashboard', 'sales_by_advisor', start, end],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase.rpc('get_sales_by_advisor', {
        p_start: start ?? defaultStart,
        p_end: end ?? defaultEnd,
      });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Productos con stock bajo ─────────────────────────────────
export interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  min_stock: number;
  deficit: number;
  category: string;
}

export function useLowStockProducts() {
  return useQuery<LowStockProduct[]>({
    queryKey: ['dashboard', 'low_stock'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase.rpc('get_low_stock_products');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 3,
  });
}

// ─── Flujo de caja ────────────────────────────────────────────
export interface CashFlow {
  income_sales: number;
  income_deposits: number;
  expenses: number;
  purchases_paid: number;
}

export function useCashFlow(date?: string) {
  const targetDate = date ?? new Date().toISOString().slice(0, 10);
  return useQuery<CashFlow>({
    queryKey: ['dashboard', 'cash_flow', targetDate],
    queryFn: async () => {
      if (!supabase) return { income_sales: 0, income_deposits: 0, expenses: 0, purchases_paid: 0 };
      const { data, error } = await supabase.rpc('get_cash_flow', { p_date: targetDate });
      if (error) throw error;
      return data as CashFlow;
    },
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Helpers ──────────────────────────────────────────────────
function getEmptyDailyKPIs(): DailyKPIs {
  return {
    total_sales: 0, revenue: 0, gross_profit: 0, avg_ticket: 0,
    total_returns: 0, returns_amount: 0, pending_quotes: 0, pending_reserved: 0,
  };
}

function getEmptyMonthlyKPIs(): MonthlyKPIs {
  return { revenue: 0, total_sales: 0, avg_daily: 0, avg_ticket: 0, best_day_revenue: 0 };
}
