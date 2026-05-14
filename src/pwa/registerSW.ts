import { registerSW as vitePWARegister } from 'virtual:pwa-register';
import { toast } from 'sonner';

// ─── Registro del Service Worker ──────────────────────────────
// Maneja: instalación, actualización, prompt de actualización.
// Se llama una vez al inicio de la app desde main.tsx.

let updateSW: (() => Promise<void>) | null = null;

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  updateSW = vitePWARegister({
    // Revisar actualizaciones periódicamente
    onRegisteredSW(swUrl, registration) {
      console.info('[PWA] Service Worker registrado:', swUrl);

      // Verificar actualizaciones cada hora
      if (registration) {
        setInterval(() => {
          registration.update().catch(() => {
            // Ignorar errores de update en offline
          });
        }, 60 * 60 * 1_000);
      }
    },

    onNeedRefresh() {
      // Hay una nueva versión disponible
      toast.info('Nueva versión disponible', {
        description: 'Actualiza para obtener las últimas mejoras.',
        duration: Infinity,
        action: {
          label: 'Actualizar ahora',
          onClick: () => {
            updateSW?.()
              .then(() => window.location.reload())
              .catch(() => window.location.reload());
          },
        },
      });
    },

    onOfflineReady() {
      toast.success('App lista para usar sin internet', {
        description: 'Los datos del POS están disponibles offline.',
        duration: 4_000,
      });
    },

    onRegisterError(error) {
      console.error('[PWA] Error al registrar Service Worker:', error);
    },
  });
}

// ─── Forzar actualización desde fuera ─────────────────────────
export function forceUpdate(): void {
  if (updateSW) {
    updateSW().then(() => window.location.reload());
  }
}

// ─── Hook de prompt de instalación ────────────────────────────
// Expuesto para usar en componente de "Instalar app"
let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

window.addEventListener('beforeinstallprompt', (e: Event) => {
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;
});

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome;
}

export function canInstall(): boolean {
  return deferredPrompt !== null;
}
