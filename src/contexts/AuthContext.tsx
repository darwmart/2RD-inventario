import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'admin' | 'user';

export type AuthUser = {
  id: string;
  username: string;
  name: string;
  role: UserRole;
};

type AuthContextType = {
  user: AuthUser | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAdmin: () => boolean;
  canEdit: () => boolean;
};

const USERS: Array<AuthUser & { password: string }> = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123',
    name: 'Administrador',
    role: 'admin',
  },
  {
    id: '2',
    username: 'usuario',
    password: 'user123',
    name: 'Usuario',
    role: 'user',
  },
];

const AUTH_STORAGE_KEY = '2rd_auth_user';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [user]);

  const login = (username: string, password: string): boolean => {
    const found = USERS.find(
      (u) => u.username === username && u.password === password
    );
    if (found) {
      const { password: _p, ...authUser } = found;
      setUser(authUser);
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

  const isAdmin = () => user?.role === 'admin';

  const canEdit = () => user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, canEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
