import { useState, useCallback, useRef } from 'react';
import { checkRateLimit } from './security';
import { toast } from 'sonner';

// ─── Hook de rate limiting para formularios ───────────────────
// Uso: const { withRateLimit, isBlocked } = useRateLimit('login')
// Envolver el submit: onClick={() => withRateLimit(() => handleSubmit())}

interface RateLimitOptions {
  capacity?: number;       // intentos antes de bloquear
  refillPerSecond?: number;
  blockMessage?: string;
}

export function useRateLimit(
  operation: string,
  options: RateLimitOptions = {},
) {
  const {
    capacity = 5,
    refillPerSecond = 0.5,
    blockMessage = 'Demasiados intentos. Espera un momento.',
  } = options;

  const [isBlocked, setIsBlocked] = useState(false);
  const blockTimer = useRef<ReturnType<typeof setTimeout>>();

  const withRateLimit = useCallback(
    <T>(fn: () => T | Promise<T>): T | Promise<T> | null => {
      const allowed = checkRateLimit(operation, capacity, refillPerSecond);
      if (!allowed) {
        setIsBlocked(true);
        toast.warning(blockMessage);

        // Desbloquear después de un tiempo
        if (blockTimer.current) clearTimeout(blockTimer.current);
        blockTimer.current = setTimeout(() => setIsBlocked(false), 10_000);

        return null;
      }
      return fn();
    },
    [operation, capacity, refillPerSecond, blockMessage],
  );

  return { withRateLimit, isBlocked };
}

// ─── Rate limit para búsquedas (debounce + rate limit) ────────
export function useSearchRateLimit() {
  return useRateLimit('global_search', {
    capacity: 20,
    refillPerSecond: 5,
    blockMessage: 'Búsqueda muy rápida. Espera un momento.',
  });
}

// ─── Rate limit para login ─────────────────────────────────────
export function useLoginRateLimit() {
  return useRateLimit('login', {
    capacity: 5,
    refillPerSecond: 0.1, // 1 intento cada 10 segundos
    blockMessage: 'Demasiados intentos de login. Espera 10 segundos.',
  });
}
