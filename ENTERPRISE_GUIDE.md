# Guía de Arquitectura Enterprise — 2RD Inventario

## Archivos creados en esta sesión

### Migraciones SQL (ejecutar en orden en Supabase SQL Editor)

| Migración | Propósito |
|---|---|
| `010_audit_system.sql` | audit_log, stock_movements, price_history, triggers |
| `011_soft_delete.sql` | deleted_at, RPCs soft_delete_record / restore_record |
| `012_stock_transactions.sql` | RPCs deduct_stock, reintegrate_stock, adjust_stock, reserve_stock |
| `013_rbac.sql` | profiles, role_permissions, fn_create_profile_on_signup |
| `014_dashboard_views.sql` | get_daily_kpis, get_monthly_kpis, get_sales_by_day, etc. |
| `015_concurrency.sql` | close_cash_session, open_cash_session con locks |

### Archivos TypeScript creados

| Archivo | Sección |
|---|---|
| `src/contexts/RBACContext.tsx` | RBAC con 8 roles y 16 permisos granulares |
| `src/hooks/useStockRPC.ts` | Integración con RPCs de stock transaccional |
| `src/hooks/useDashboardKPIs.ts` | KPIs desde Supabase con React Query |
| `src/hooks/useKeyboardShortcuts.ts` | F1/F2/F4/ESC/Ctrl+K/Ctrl+P |
| `src/hooks/useGlobalSearch.ts` | Búsqueda global con debounce y Supabase |
| `src/hooks/useRealtime.ts` | Canales Supabase para stock, ventas, caja |
| `src/hooks/useConcurrencyGuard.ts` | Optimistic locking y double-submit guard |
| `src/hooks/useSoftDelete.ts` | Soft delete con optimistic UI |
| `src/components/GlobalSearch.tsx` | Modal de búsqueda CMD+K |
| `src/components/ErrorBoundary.tsx` | Captura de errores con recuperación |
| `src/components/PermissionGuard.tsx` | Guard declarativo de permisos |
| `src/components/dashboard/KPICards.tsx` | Cards de KPIs con permisos por rol |
| `src/components/dashboard/SalesCharts.tsx` | 4 tipos de gráficas con Recharts |
| `src/config/features.ts` | Feature flags centralizados |
| `src/utils/validation.ts` | Schemas Zod para todos los formularios |
| `src/utils/thermalPrint.ts` | Impresión térmica 58mm/80mm y etiquetas |

---

## Cómo integrar — paso a paso sin romper nada

### 1. Ejecutar migraciones
```bash
# En Supabase SQL Editor, ejecutar en orden:
# 010 → 011 → 012 → 013 → 014 → 015
```

### 2. Agregar RBACProvider en main.tsx/App.tsx
```tsx
import { RBACProvider } from '@/contexts/RBACContext';

// Envolver dentro de AuthProvider:
<AuthProvider>
  <RBACProvider>
    <App />
  </RBACProvider>
</AuthProvider>
```

### 3. Reemplazar useAuth().isAdmin() con useRBAC().can()
```tsx
// ANTES
const { isAdmin } = useAuth();
{isAdmin() && <Button>Editar precio</Button>}

// DESPUÉS (más granular)
const { can } = useRBAC();
{can('can_edit_prices') && <Button>Editar precio</Button>}

// O con el componente declarativo:
<PermissionGuard permission="can_edit_prices">
  <Button>Editar precio</Button>
</PermissionGuard>
```

### 4. Agregar GlobalSearch en Layout.tsx
```tsx
import { GlobalSearch } from '@/components/GlobalSearch';

// Dentro del header del Layout:
<GlobalSearch />
```

### 5. Agregar KPIs al Dashboard
```tsx
import { DailyKPICards } from '@/components/dashboard/KPICards';
import { SalesAreaChart, TopProductsChart, AdvisorSalesPieChart } from '@/components/dashboard/SalesCharts';

// En Dashboard.tsx, reemplazar las cards actuales:
<DailyKPICards />
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
  <SalesAreaChart />
  <TopProductsChart />
  <AdvisorSalesPieChart />
  <ComposedSalesChart />
</div>
```

### 6. Habilitar atajos POS en Sales.tsx
```tsx
import { usePOSShortcuts } from '@/hooks/useKeyboardShortcuts';

// Dentro del componente:
usePOSShortcuts({
  onNewSale: () => setIsSaleOpen(true),
  onSearchProduct: () => setIsProductSearchOpen(true),
  onCheckout: () => setIsPaymentOpen(true),
  onCancel: () => clearCart(),
  onPrint: () => handlePrint(),
});
```

### 7. Usar stock transaccional en ventas
```tsx
import { useDeductStock } from '@/hooks/useStockRPC';

const { mutateAsync: deductStock } = useDeductStock();

// Al confirmar la venta:
await deductStock({
  saleId: newSale.id,
  saleNumber: newSale.sale_number,
  items: cart.map(item => ({
    product_id: item.productId,
    quantity: item.quantity,
    product_name: item.productName,
  })),
});
```

### 8. Envolver páginas con ErrorBoundary
```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

// En App.tsx, por ruta:
<ProtectedRoute>
  <Layout>
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  </Layout>
</ProtectedRoute>
```

### 9. Activar Realtime (cuando VITE_FF_REALTIME=true)
```tsx
import { useStockRealtime } from '@/hooks/useRealtime';

// En el componente raíz de la app:
export function AppProviders() {
  useStockRealtime(); // activo solo si FEATURES.enableRealtime
  return <Outlet />;
}
```

### 10. Feature flags en .env.local
```env
VITE_FF_REALTIME=false        # cambiar a true cuando estés listo
VITE_FF_SOFT_DELETE=true
VITE_FF_STOCK_RPC=true
VITE_FF_RBAC=true
VITE_FF_GLOBAL_SEARCH=true
VITE_FF_KEYBOARD=true
VITE_FF_DASHBOARD_V2=true
VITE_FF_AUDIT=true
```

---

## Sección PWA (implementar cuando el core esté estable)

```bash
npm install vite-plugin-pwa
```

```ts
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

plugins: [
  VitePWA({
    registerType: 'autoUpdate',
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*supabase\.co\/.*/,
          handler: 'NetworkFirst',
          options: { cacheName: 'supabase-api', expiration: { maxAgeSeconds: 300 } },
        },
      ],
    },
    manifest: {
      name: '2RD Inventario',
      short_name: '2RD POS',
      theme_color: '#3b82f6',
      icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    },
  }),
]
```

---

## Estructura final de carpetas recomendada

```
src/
├── app/              ← Providers, routing, App.tsx
├── config/           ← features.ts, queryClient.ts, env.ts  ← NUEVO
├── contexts/         ← AuthContext.tsx, RBACContext.tsx       ← NUEVO
├── domain/           ← inventory.ts, sales.ts, purchases.ts
├── hooks/
│   ├── queries/      ← useProducts.ts, useSales.ts, etc.
│   ├── useDashboardKPIs.ts    ← NUEVO
│   ├── useKeyboardShortcuts.ts ← NUEVO
│   ├── useGlobalSearch.ts      ← NUEVO
│   ├── useRealtime.ts          ← NUEVO
│   ├── useConcurrencyGuard.ts  ← NUEVO
│   ├── useSoftDelete.ts        ← NUEVO
│   └── useStockRPC.ts          ← NUEVO
├── repositories/
│   ├── interfaces/
│   ├── localStorage/
│   └── supabase/
├── components/
│   ├── ui/           ← shadcn/ui (no tocar)
│   ├── dashboard/    ← KPICards, SalesCharts               ← NUEVO
│   ├── ErrorBoundary.tsx   ← NUEVO
│   ├── GlobalSearch.tsx    ← NUEVO
│   ├── PermissionGuard.tsx ← NUEVO
│   └── [módulos existentes...]
├── pages/
├── types/
├── utils/
│   ├── validation.ts      ← NUEVO (Zod schemas)
│   ├── thermalPrint.ts    ← NUEVO
│   ├── formatters.ts
│   ├── dates.ts
│   └── barcode.ts
└── test/
```
