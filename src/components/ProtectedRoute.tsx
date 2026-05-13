import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isAdmin, isLoading } = useAuth();

  // Espera a que Supabase restaure la sesión antes de redirigir
  if (isLoading) return null;

  if (!user) return <Navigate to="/login" replace />;

  if (requireAdmin && !isAdmin()) return <Navigate to="/sales" replace />;

  return <>{children}</>;
}
