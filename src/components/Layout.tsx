import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Package,
  ShoppingCart,
  Calculator,
  Users,
  BarChart3,
  Settings,
  FileText,
  AlertCircle
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Contabilidad', href: '/accounting', icon: Package },
  { name: 'Inventario', href: '/inventory', icon: Package },
  { name: 'Ventas', href: '/sales', icon: ShoppingCart },
  { name: 'Cotizaciones', href: '/quotes', icon: FileText },
  { name: 'Arqueo de Caja', href: '/cash-register', icon: Calculator },
  { name: 'Asesores', href: '/advisors', icon: Users },
  { name: 'Alertas', href: '/alerts', icon: AlertCircle },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="hidden md:flex md:w-64 md:flex-col">
          <div className="flex flex-col flex-grow pt-5 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <Package className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                "2Ruedas Shop"
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
                    </Link>
                  );
                })}
              </nav>
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