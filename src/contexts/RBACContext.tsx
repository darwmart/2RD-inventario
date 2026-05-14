import {
  createContext, useContext, useCallback, useMemo, ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

// ─── Tipos ────────────────────────────────────────────────────
export type AppRole =
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'cashier'
  | 'advisor'
  | 'accountant'
  | 'warehouse'
  | 'viewer';

export type Permission =
  | 'can_manage_users'
  | 'can_edit_prices'
  | 'can_delete_sales'
  | 'can_view_reports'
  | 'can_close_cash'
  | 'can_edit_products'
  | 'can_edit_suppliers'
  | 'can_view_costs'
  | 'can_manage_purchases'
  | 'can_view_accounting'
  | 'can_manage_warehouse'
  | 'can_export_data'
  | 'can_view_audit'
  | 'can_view_commissions'
  | 'can_create_sales'
  | 'can_apply_discounts';

type PermissionMap = Partial<Record<Permission, boolean>>;

// Permisos locales de fallback (cuando Supabase no está disponible)
const FALLBACK_PERMISSIONS: Record<AppRole, PermissionMap> = {
  super_admin: {
    can_manage_users: true, can_edit_prices: true, can_delete_sales: true,
    can_view_reports: true, can_close_cash: true, can_edit_products: true,
    can_edit_suppliers: true, can_view_costs: true, can_manage_purchases: true,
    can_view_accounting: true, can_manage_warehouse: true, can_export_data: true,
    can_view_audit: true, can_view_commissions: true, can_create_sales: true,
    can_apply_discounts: true,
  },
  admin: {
    can_manage_users: true, can_edit_prices: true, can_delete_sales: true,
    can_view_reports: true, can_close_cash: true, can_edit_products: true,
    can_edit_suppliers: true, can_view_costs: true, can_manage_purchases: true,
    can_view_accounting: true, can_manage_warehouse: true, can_export_data: true,
    can_view_audit: true, can_view_commissions: true, can_create_sales: true,
    can_apply_discounts: true,
  },
  manager: {
    can_edit_prices: true, can_delete_sales: true, can_view_reports: true,
    can_close_cash: true, can_edit_products: true, can_view_costs: true,
    can_manage_purchases: true, can_view_accounting: true, can_manage_warehouse: true,
    can_export_data: true, can_view_audit: true, can_view_commissions: true,
    can_create_sales: true, can_apply_discounts: true,
  },
  cashier: {
    can_close_cash: true, can_create_sales: true,
  },
  advisor: {
    can_create_sales: true, can_apply_discounts: true, can_view_commissions: true,
  },
  accountant: {
    can_view_reports: true, can_view_costs: true, can_view_accounting: true,
    can_export_data: true, can_view_commissions: true,
  },
  warehouse: {
    can_manage_purchases: true, can_manage_warehouse: true,
  },
  viewer: {
    can_view_reports: true,
  },
};

// ─── Context ──────────────────────────────────────────────────
type RBACContextType = {
  role: AppRole;
  permissions: PermissionMap;
  can: (permission: Permission) => boolean;
  isAtLeast: (minRole: AppRole) => boolean;
  isLoading: boolean;
};

const ROLE_HIERARCHY: Record<AppRole, number> = {
  super_admin: 8,
  admin: 7,
  manager: 6,
  cashier: 5,
  advisor: 4,
  accountant: 3,
  warehouse: 2,
  viewer: 1,
};

const RBACContext = createContext<RBACContextType>({
  role: 'viewer',
  permissions: {},
  can: () => false,
  isAtLeast: () => false,
  isLoading: false,
});

export function RBACProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const role = useMemo((): AppRole => {
    if (!user) return 'viewer';
    // Compatibilidad con el sistema anterior admin/user
    if (user.role === 'admin') return 'admin';
    return (user.role as AppRole) ?? 'viewer';
  }, [user]);

  // Intentar cargar permisos desde Supabase
  const { data: dbPermissions, isLoading } = useQuery({
    queryKey: ['role_permissions', role],
    queryFn: async (): Promise<PermissionMap> => {
      if (!supabase) return FALLBACK_PERMISSIONS[role] ?? {};
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission, granted')
        .eq('role', role);
      if (error) return FALLBACK_PERMISSIONS[role] ?? {};
      return Object.fromEntries(data.map(r => [r.permission, r.granted]));
    },
    staleTime: 1000 * 60 * 10,
    enabled: Boolean(user),
  });

  const permissions: PermissionMap = dbPermissions ?? FALLBACK_PERMISSIONS[role] ?? {};

  const can = useCallback(
    (permission: Permission): boolean => permissions[permission] ?? false,
    [permissions],
  );

  const isAtLeast = useCallback(
    (minRole: AppRole): boolean =>
      ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole],
    [role],
  );

  return (
    <RBACContext.Provider value={{ role, permissions, can, isAtLeast, isLoading }}>
      {children}
    </RBACContext.Provider>
  );
}

export function useRBAC() {
  return useContext(RBACContext);
}

// ─── Hook de conveniencia para permisos específicos ───────────
export function usePermission(permission: Permission): boolean {
  const { can } = useRBAC();
  return can(permission);
}
