import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  Package,
  ShoppingCart,
  Calculator,
  Users,
  BarChart3,
  Settings,
  FileText,
  AlertCircle,
  Banknote,
  ShoppingBag,
  Building2,
  Warehouse,
  LogOut,
  ShieldCheck,
  User,
  UserCheck,
  ClipboardList,
  RotateCcw,
  Activity
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const allNavigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3, adminOnly: false },
  { name: 'Contabilidad', href: '/accounting', icon: Banknote, adminOnly: true },
  { name: 'Inventario', href: '/inventory', icon: Package, adminOnly: false },
  { name: 'Ventas', href: '/sales', icon: ShoppingCart, adminOnly: false },
  { name: 'Separados', href: '/quotes', icon: FileText, adminOnly: false },
  { name: 'Compras', href: '/purchases', icon: ShoppingBag, adminOnly: true },
  { name: 'Proveedores', href: '/suppliers', icon: Building2, adminOnly: false },
  { name: 'Bodegas Externas', href: '/warehouses', icon: Warehouse, adminOnly: false },
  { name: 'Arqueo de Caja', href: '/cash-register', icon: Calculator, adminOnly: false },
  { name: 'Clientes', href: '/customers', icon: UserCheck, adminOnly: false },
  { name: 'Asesores', href: '/advisors', icon: Users, adminOnly: false },
  { name: 'Comisiones', href: '/advisor-commissions', icon: RotateCcw, adminOnly: true },
  { name: 'Conciliación Stock', href: '/stock-conciliation', icon: ClipboardList, adminOnly: true },
  { name: 'Informes', href: '/reports', icon: Activity, adminOnly: false },
  { name: 'Alertas', href: '/alerts', icon: AlertCircle, adminOnly: false },
  { name: 'Configuración', href: '/settings', icon: Settings, adminOnly: true },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const navigation = allNavigation.filter(
    (item) => !item.adminOnly || isAdmin()
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="hidden md:flex md:w-64 md:flex-col">
          <div className="flex flex-col flex-grow pt-5 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <Package className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                2Ruedas Shop
              </span>
            </div>

            <div className="mt-8 flex-grow flex flex-col">
              <nav className="flex-1 px-2 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        isActive
                          ? 'bg-blue-50 border-r-2 border-blue-600 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        'group flex items-center px-2 py-2 text-sm font-medium rounded-l-md'
                      )}
                    >
                      <Icon
                        className={cn(
                          isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500',
                          'mr-3 h-5 w-5'
                        )}
                      />
                      {item.name}
                      {item.adminOnly && (
                        <ShieldCheck className="ml-auto h-3.5 w-3.5 text-blue-400 opacity-70" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* User info + logout */}
            <div className="flex-shrink-0 border-t border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  {isAdmin() ? (
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                  ) : (
                    <User className="h-4 w-4 text-gray-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role === 'admin' ? 'Administrador' : 'Usuario'}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
