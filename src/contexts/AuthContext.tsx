import {
  createContext, useContext, useState, useEffect, useCallback, ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'user';

export type AuthUser = {
  id: string;
  username: string;
  name: string;
  role: UserRole;
};

type AuthContextType = {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  canEdit: () => boolean;
};

const FALLBACK_USERS: Array<AuthUser & { password: string; email: string }> = [
  { id: '1', username: 'admin',   email: 'admin@2rd.local',   password: 'admin123', name: 'Administrador', role: 'admin' },
  { id: '2', username: 'usuario', email: 'user@2rd.local',    password: 'user123',  name: 'Usuario',       role: 'user' },
];

const SUPABASE_CONFIGURED =
  import.meta.env.VITE_SUPABASE_URL?.startsWith('https') &&
  import.meta.env.VITE_SUPABASE_ANON_KEY?.length > 10;

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Helper: extrae AuthUser desde un User de Supabase ───────────────────────
// El rol se lee desde user_metadata.role (definido al crear el usuario en Supabase)
function supabaseUserToAuthUser(supabaseUser: User): AuthUser {
  const meta = supabaseUser.user_metadata ?? {};
  return {
    id: supabaseUser.id,
    username: meta.username ?? supabaseUser.email?.split('@')[0] ?? 'user',
    name: meta.name ?? meta.full_name ?? supabaseUser.email ?? 'Usuario',
    role: (meta.role as UserRole) ?? 'user',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Inicialización ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      // Modo fallback: leer sesión local
      try {
        const stored = localStorage.getItem('2rd_auth_user');
        if (stored) setUser(JSON.parse(stored));
      } catch { /* ignore */ }
      setIsLoading(false);
      return;
    }

    // Modo Supabase: restaura sesión activa
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ? supabaseUserToAuthUser(session.user) : null);
      setIsLoading(false);
    });

    // Escucha cambios de autenticación (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ? supabaseUserToAuthUser(session.user) : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─── Sincroniza fallback con localStorage ─────────────────────────────────
  useEffect(() => {
    if (SUPABASE_CONFIGURED) return;
    if (user) localStorage.setItem('2rd_auth_user', JSON.stringify(user));
    else localStorage.removeItem('2rd_auth_user');
  }, [user]);

  // ─── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    if (!SUPABASE_CONFIGURED) {
      // Fallback: usuarios locales
      const found = FALLBACK_USERS.find(u => u.username === username && u.password === password);
      if (!found) return false;
      const { password: _p, email: _e, ...authUser } = found;
      setUser(authUser);
      return true;
    }

    // Supabase: el email es username@dominio o directamente el email ingresado
    // Intenta login con username como email (si contiene @) o construye el email
    const emailInput = username.includes('@') ? username : `${username}@2rd.local`;
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailInput,
      password,
    });

    if (error || !data.user) return false;

    // El user ya se actualiza vía onAuthStateChange
    return true;
  }, []);

  // ─── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    if (SUPABASE_CONFIGURED) {
      await supabase.auth.signOut().catch(() => {});
      setUser(null);
      setSession(null);
    } else {
      setUser(null);
    }
  }, []);

  const isAdmin  = useCallback(() => user?.role === 'admin', [user]);
  const canEdit  = useCallback(() => user?.role === 'admin', [user]);

  return (
    <AuthContext.Provider value={{ user, session, isLoading, login, logout, isAdmin, canEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
