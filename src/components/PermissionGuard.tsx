import type { ReactNode } from 'react';
import { useRBAC, type Permission, type AppRole } from '@/contexts/RBACContext';

// ─── Guard de permisos ────────────────────────────────────────
// Uso: <PermissionGuard permission="can_edit_prices">...</PermissionGuard>
// Uso: <PermissionGuard minRole="manager">...</PermissionGuard>

interface PermissionGuardProps {
  children: ReactNode;
  permission?: Permission;
  minRole?: AppRole;
  fallback?: ReactNode;
}

export function PermissionGuard({
  children,
  permission,
  minRole,
  fallback = null,
}: PermissionGuardProps) {
  const { can, isAtLeast } = useRBAC();

  if (permission && !can(permission)) return <>{fallback}</>;
  if (minRole && !isAtLeast(minRole)) return <>{fallback}</>;

  return <>{children}</>;
}

// ─── HOC version ─────────────────────────────────────────────
export function requirePermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: Permission,
) {
  return function GuardedComponent(props: P) {
    return (
      <PermissionGuard permission={permission}>
        <Component {...props} />
      </PermissionGuard>
    );
  };
}
