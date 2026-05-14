-- ============================================================
-- MIGRACIÓN 014: Vistas y funciones optimizadas para Dashboard
-- Evita N+1 queries y cálculos en el frontend.
-- ============================================================

-- ─── FUNCIÓN: KPIs DEL DÍA ───────────────────────────────────
create or replace function get_daily_kpis(p_date date default current_date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'total_sales',       count(*) filter (where type = 'sale' and status = 'completed'),
    'revenue',           coalesce(sum(total) filter (where type = 'sale' and status = 'completed'), 0),
    'gross_profit',      coalesce(sum(
                           total - (
                             select coalesce(sum(si.cost * si.quantity), 0)
                             from sale_items si where si.sale_id = s.id
                           )
                         ) filter (where type = 'sale' and status = 'completed'), 0),
    'avg_ticket',        coalesce(avg(total) filter (where type = 'sale' and status = 'completed'), 0),
    'total_returns',     count(*) filter (where type = 'sale' and status = 'returned'),
    'returns_amount',    coalesce(sum(total) filter (where type = 'sale' and status = 'returned'), 0),
    'pending_quotes',    count(*) filter (where type = 'quote' and status = 'pending'),
    'pending_reserved',  count(*) filter (where type = 'reserved' and status = 'pending')
  )
  into v_result
  from sales s
  where date_trunc('day', created_at) = p_date;

  return v_result;
end;
$$;

-- ─── FUNCIÓN: KPIs DEL MES ───────────────────────────────────
create or replace function get_monthly_kpis(
  p_year  integer default extract(year from current_date)::integer,
  p_month integer default extract(month from current_date)::integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_start  date := make_date(p_year, p_month, 1);
  v_end    date := (make_date(p_year, p_month, 1) + interval '1 month - 1 day')::date;
begin
  select jsonb_build_object(
    'revenue',         coalesce(sum(total) filter (where type = 'sale' and status = 'completed'), 0),
    'total_sales',     count(*) filter (where type = 'sale' and status = 'completed'),
    'avg_daily',       coalesce(sum(total) filter (where type = 'sale' and status = 'completed')
                         / nullif(count(distinct date_trunc('day', created_at)
                           filter (where type = 'sale' and status = 'completed')), 0), 0),
    'avg_ticket',      coalesce(avg(total) filter (where type = 'sale' and status = 'completed'), 0),
    'best_day_revenue', (
      select coalesce(max(daily_total), 0)
      from (
        select sum(total) as daily_total
        from sales
        where type = 'sale' and status = 'completed'
          and created_at::date between v_start and v_end
        group by created_at::date
      ) sub
    )
  )
  into v_result
  from sales
  where created_at::date between v_start and v_end;

  return v_result;
end;
$$;

-- ─── FUNCIÓN: VENTAS POR DÍA (ÚLTIMOS N DÍAS) ────────────────
create or replace function get_sales_by_day(p_days integer default 30)
returns table (
  day           date,
  total_sales   bigint,
  revenue       numeric,
  gross_profit  numeric
)
language sql
security definer
set search_path = public
as $$
  select
    created_at::date as day,
    count(*) filter (where type = 'sale' and status = 'completed') as total_sales,
    coalesce(sum(total) filter (where type = 'sale' and status = 'completed'), 0) as revenue,
    coalesce(sum(
      total - (
        select coalesce(sum(si.cost * si.quantity), 0)
        from sale_items si where si.sale_id = s.id
      )
    ) filter (where type = 'sale' and status = 'completed'), 0) as gross_profit
  from sales s
  where created_at >= current_date - (p_days || ' days')::interval
  group by 1
  order by 1;
$$;

-- ─── FUNCIÓN: VENTAS POR ASESOR (MES ACTUAL) ─────────────────
create or replace function get_sales_by_advisor(
  p_start date default date_trunc('month', current_date)::date,
  p_end   date default current_date
)
returns table (
  advisor_id     uuid,
  advisor_name   text,
  total_sales    bigint,
  revenue        numeric,
  commission_earned numeric
)
language sql
security definer
set search_path = public
as $$
  select
    advisor_id,
    advisor_name,
    count(*) filter (where type = 'sale' and status = 'completed') as total_sales,
    coalesce(sum(total) filter (where type = 'sale' and status = 'completed'), 0) as revenue,
    coalesce(sum(commission_amount) filter (where type = 'sale' and status = 'completed'), 0) as commission_earned
  from sales
  where created_at::date between p_start and p_end
  group by advisor_id, advisor_name
  order by revenue desc;
$$;

-- ─── FUNCIÓN: TOP PRODUCTOS MÁS VENDIDOS ─────────────────────
create or replace function get_top_products(
  p_limit integer default 10,
  p_days  integer default 30
)
returns table (
  product_id    uuid,
  product_name  text,
  units_sold    bigint,
  revenue       numeric,
  profit        numeric
)
language sql
security definer
set search_path = public
as $$
  select
    si.product_id,
    si.product_name,
    sum(si.quantity) as units_sold,
    sum(si.total) as revenue,
    sum(si.total - si.cost * si.quantity) as profit
  from sale_items si
  inner join sales s on s.id = si.sale_id
  where s.type = 'sale'
    and s.status = 'completed'
    and s.created_at >= current_date - (p_days || ' days')::interval
  group by si.product_id, si.product_name
  order by units_sold desc
  limit p_limit;
$$;

-- ─── FUNCIÓN: PRODUCTOS CON STOCK BAJO ───────────────────────
create or replace function get_low_stock_products()
returns table (
  id          uuid,
  name        text,
  stock       integer,
  min_stock   integer,
  deficit     integer,
  category    text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.name,
    p.stock,
    p.min_stock,
    p.min_stock - p.stock as deficit,
    c.name as category
  from products p
  left join categories c on c.id = p.category_id
  where p.stock <= p.min_stock
    and p.deleted_at is null
  order by (p.min_stock - p.stock) desc;
$$;

-- ─── FUNCIÓN: FLUJO DE CAJA DIARIO ───────────────────────────
create or replace function get_cash_flow(p_date date default current_date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'income_sales',     coalesce((
      select sum(total) from sales
      where type = 'sale' and status = 'completed'
        and created_at::date = p_date
    ), 0),
    'income_deposits',  coalesce((
      select sum(amount) from sale_deposits
      where created_at::date = p_date
    ), 0),
    'expenses',         coalesce((
      select sum(amount) from expenses
      where created_at::date = p_date
    ), 0),
    'purchases_paid',   coalesce((
      select sum(amount) from purchase_payments
      where created_at::date = p_date
    ), 0)
  ) into v_result;

  return v_result;
end;
$$;

-- ─── VISTA: RESUMEN DE INVENTARIO ────────────────────────────
create or replace view v_inventory_summary as
select
  c.name as category,
  count(p.id) as total_products,
  sum(p.stock) as total_units,
  sum(p.stock * p.cost) as total_cost_value,
  sum(p.stock * p.current_price) as total_retail_value,
  count(*) filter (where p.stock = 0) as out_of_stock,
  count(*) filter (where p.stock > 0 and p.stock <= p.min_stock) as low_stock
from products p
left join categories c on c.id = p.category_id
where p.deleted_at is null
group by c.name
order by total_retail_value desc;
