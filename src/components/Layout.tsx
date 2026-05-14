import { useState, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { OfflineBanner, SyncStatusIndicator } from '@/components/OfflineBanner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MobileBarcodeSearch } from '@/components/MobileBarcodeSearch';
import {
  Package, ShoppingCart, Calculator, Users, BarChart3, Settings,
  FileText, AlertCircle, Banknote, ShoppingBag, Building2, Warehouse,
  LogOut, ShieldCheck, User, UserCheck, ClipboardList, RotateCcw,
  Activity, Menu, X,
} from 'lucide-react';

interface LayoutProps { children: ReactNode }

const allNavigation = [
  { name: 'Dashboard',         href: '/',                    icon: BarChart3,     adminOnly: true  },
  { name: 'Contabilidad',      href: '/accounting',          icon: Banknote,      adminOnly: true  },
  { name: 'Inventario',        href: '/inventory',           icon: Package,       adminOnly: false },
  { name: 'Ventas',            href: '/sales',               icon: ShoppingCart,  adminOnly: false },
  { name: 'Separados',         href: '/quotes',              icon: FileText,      adminOnly: false },
  { name: 'Compras',           href: '/purchases',           icon: ShoppingBag,   adminOnly: true  },
  { name: 'Proveedores',       href: '/suppliers',           icon: Building2,     adminOnly: false },
  { name: 'Bodegas Externas',  href: '/warehouses',          icon: Warehouse,     adminOnly: false },
  { name: 'Arqueo de Caja',    href: '/cash-register',       icon: Calculator,    adminOnly: false },
  { name: 'Clientes',          href: '/customers',           icon: UserCheck,     adminOnly: false },
  { name: 'Asesores',          href: '/advisors',            icon: Users,         adminOnly: false },
  { name: 'Comisiones',        href: '/advisor-commissions', icon: RotateCcw,     adminOnly: true  },
  { name: 'Conciliación Stock',href: '/stock-conciliation',  icon: ClipboardList, adminOnly: true  },
  { name: 'Informes',          href: '/reports',             icon: Activity,      adminOnly: false },
  { name: 'Alertas',           href: '/alerts',              icon: AlertCircle,   adminOnly: false },
  { name: 'Configuración',     href: '/settings',            icon: Settings,      adminOnly: true  },
];

// ─── Lista de nav (compartida sidebar y drawer) ───────────────
function NavList({
  navigation,
  location,
  onItemClick,
}: {
  navigation: typeof allNavigation;
  location: { pathname: string };
  onItemClick?: () => void;
}) {
  return (
    <nav className="flex-1 px-2 space-y-0.5">
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={onItemClick}
            className={cn(
              'group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            )}
          >
            <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500')} />
            <span className="flex-1 truncate">{item.name}</span>
            {item.adminOnly && (
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-blue-300 opacity-70" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Footer de usuario (compartido) ──────────────────────────
function UserFooter({ onLogout, user, isAdmin }: { onLogout: () => void; user: { name: string; role: string } | null; isAdmin: boolean }) {
  return (
    <div className="shrink-0 border-t border-gray-200 p-3">
      <div className="flex items-center gap-3 mb-2">
        <div className="shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
          {isAdmin
            ? <ShieldCheck className="h-4 w-4 text-blue-600" />
            : <User className="h-4 w-4 text-gray-500" />
          }
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500">{isAdmin ? 'Administrador' : 'Usuario'}</p>
            <SyncStatusIndicator />
          </div>
        </div>
      </div>
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </button>
    </div>
  );
}

// ─── Layout principal ─────────────────────────────────────────
export default function Layout({ children }: LayoutProps) {
  const location  = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navigation = allNavigation.filter(item => !item.adminOnly || isAdmin());

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">

        {/* ── SIDEBAR DESKTOP (md+) ───────────────────────────── */}
        <aside className="hidden md:flex md:w-64 md:flex-col shrink-0">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200 overflow-y-auto">
            {/* Logo */}
            <div className="flex items-center gap-2 px-4 pt-5 pb-4 shrink-0">
              <Package className="h-8 w-8 text-blue-600 shrink-0" />
              <span className="text-xl font-bold text-gray-900 truncate">2Ruedas Shop</span>
            </div>

            {/* Nav */}
            <div className="flex-1 min-h-0 overflow-y-auto py-2">
              <NavList navigation={navigation} location={location} />
            </div>

            {/* User */}
            <UserFooter onLogout={logout} user={user} isAdmin={isAdmin()} />
          </div>
        </aside>

        {/* ── PANEL DERECHO ───────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

          {/* ── HEADER MOBILE (visible solo en <md) ─────────── */}
          <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0 z-10">
            {/* Hamburguesa */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              aria-label="Abrir menú"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Logo compacto */}
            <div className="flex items-center gap-2 mr-auto">
              <Package className="h-6 w-6 text-blue-600 shrink-0" />
              <span className="font-bold text-gray-900 text-base leading-none">2RD</span>
            </div>

            {/* Barra de búsqueda / escáner — visible en mobile header */}
            <MobileBarcodeSearch />
          </header>

          {/* ── OFFLINE BANNER ──────────────────────────────── */}
          <OfflineBanner />

          {/* ── CONTENIDO PRINCIPAL ─────────────────────────── */}
          <main className="flex-1 overflow-y-auto focus:outline-none">
            {children}
          </main>
        </div>
      </div>

      {/* ── DRAWER MOBILE (Sheet) ────────────────────────────── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <SheetHeader className="px-4 pt-5 pb-4 border-b border-gray-100 shrink-0">
            <SheetTitle asChild>
              <div className="flex items-center gap-2">
                <Package className="h-7 w-7 text-blue-600 shrink-0" />
                <span className="text-lg font-bold text-gray-900">2Ruedas Shop</span>
              </div>
            </SheetTitle>
          </SheetHeader>

          {/* Nav en drawer */}
          <div className="flex-1 min-h-0 overflow-y-auto py-2">
            <NavList
              navigation={navigation}
              location={location}
              onItemClick={() => setDrawerOpen(false)}
            />
          </div>

          <UserFooter onLogout={() => { logout(); setDrawerOpen(false); }} user={user} isAdmin={isAdmin()} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
