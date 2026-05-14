import { supabase } from './supabase';
import { getDeviceFingerprint } from './security';

// ─── Gestión de sesión enterprise ────────────────────────────
// Implementa:
//  • Timeout por inactividad (configurable)
//  • Rotación de refresh token
//  • Detección de sesión expirada
//  • Warning antes de expirar

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1_000; // 30 minutos
const WARNING_BEFORE_MS     = 2 * 60 * 1_000;   // avisar 2 min antes
const EVENTS_THAT_RESET     = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

type SessionEvent =
  | 'warning'     // sesión a punto de expirar
  | 'expired'     // sesión expirada
  | 'refreshed';  // token refrescado exitosamente

type SessionListener = (event: SessionEvent) => void;

class SessionManager {
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<SessionListener>();
  private lastActivity = Date.now();
  private initialized = false;

  init(timeoutMs = INACTIVITY_TIMEOUT_MS): () => void {
    if (this.initialized) return () => this.destroy();
    this.initialized = true;

    // Resetear timer en cada interacción
    const resetTimer = () => {
      this.lastActivity = Date.now();
      this.scheduleTimers(timeoutMs);
    };

    EVENTS_THAT_RESET.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Arrancar timers
    this.scheduleTimers(timeoutMs);

    // Manejar visibilidad (tab en segundo plano)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - this.lastActivity;
        if (elapsed >= timeoutMs) {
          this.expire();
        } else {
          this.scheduleTimers(timeoutMs - elapsed);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Guardar fingerprint del dispositivo al iniciar sesión
    this.storeDeviceFingerprint();

    return () => {
      EVENTS_THAT_RESET.forEach(event => window.removeEventListener(event, resetTimer));
      document.removeEventListener('visibilitychange', handleVisibility);
      this.destroy();
    };
  }

  private scheduleTimers(remainingMs: number) {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    if (this.warningTimer)    clearTimeout(this.warningTimer);

    // Warning antes de expirar
    const warnIn = remainingMs - WARNING_BEFORE_MS;
    if (warnIn > 0) {
      this.warningTimer = setTimeout(() => {
        this.notify('warning');
      }, warnIn);
    }

    // Expirar sesión
    this.inactivityTimer = setTimeout(() => this.expire(), remainingMs);
  }

  private async expire() {
    this.notify('expired');
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem('2rd_auth_user');
    }
    // Redirigir al login
    window.location.href = '/login?reason=inactivity';
  }

  private storeDeviceFingerprint() {
    const fp = getDeviceFingerprint();
    sessionStorage.setItem('device_fp', fp);
  }

  // ─── Rotar refresh token proactivamente ──────────────────
  async refreshSession(): Promise<boolean> {
    if (!supabase) return false;
    const { error } = await supabase.auth.refreshSession();
    if (error) return false;
    this.notify('refreshed');
    return true;
  }

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: SessionEvent) {
    this.listeners.forEach(fn => fn(event));
  }

  destroy() {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    if (this.warningTimer)    clearTimeout(this.warningTimer);
    this.listeners.clear();
    this.initialized = false;
  }
}

export const sessionManager = new SessionManager();

// ─── Hook de inactividad ──────────────────────────────────────
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function useSessionManager(timeoutMinutes = 30) {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const cleanup = sessionManager.init(timeoutMinutes * 60_000);

    const unsubscribe = sessionManager.subscribe((event) => {
      if (event === 'warning') {
        setShowWarning(true);
        toast.warning('Tu sesión expirará en 2 minutos', {
          description: 'Mueve el mouse o haz clic para continuar.',
          duration: 10_000,
          action: {
            label: 'Continuar',
            onClick: () => {
              setShowWarning(false);
              sessionManager.refreshSession();
            },
          },
        });
      } else if (event === 'expired') {
        toast.error('Sesión cerrada por inactividad');
      } else if (event === 'refreshed') {
        setShowWarning(false);
      }
    });

    return () => {
      cleanup();
      unsubscribe();
    };
  }, [timeoutMinutes]);

  const extendSession = async () => {
    const ok = await sessionManager.refreshSession();
    if (ok) setShowWarning(false);
  };

  return { showWarning, extendSession };
}
