import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ─── Optimistic Locking para productos ───────────────────────
// La columna `version` en products se incrementa automáticamente
// en cada UPDATE via trigger. Si el cliente envía la versión
// incorrecta → alguien modificó el registro desde que lo cargó.

interface VersionedUpdate<T> {
  id: string;
  version: number;
  data: Partial<T>;
  table: string;
}

export function useVersionedUpdate<T extends object>() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, version, data, table }: VersionedUpdate<T>) => {
      if (!supabase) throw new Error('Supabase no disponible');

      // Verificar que la versión coincide antes de actualizar
      const { data: current, error: fetchError } = await supabase
        .from(table)
        .select('version')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (current.version !== version) {
        throw new Error(
          `CONFLICT: El registro fue modificado por otro usuario (versión ${current.version}, esperada ${version}). Recarga y vuelve a intentarlo.`
        );
      }

      const { data: updated, error } = await supabase
        .from(table)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('version', version)  // Double-check con eq en la misma query
        .select()
        .single();

      if (error) throw error;
      if (!updated) throw new Error('CONFLICT: No se pudo actualizar. Intenta de nuevo.');

      return updated;
    },
    onError: (error: Error) => {
      if (error.message.startsWith('CONFLICT')) {
        toast.error(error.message, { duration: 8000 });
      } else {
        toast.error(`Error al guardar: ${error.message}`);
      }
    },
  });
}

// ─── Guard para evitar doble cierre de caja ───────────────────
// Usa un flag local para prevenir doble clic mientras se procesa.
export function useDoubleSubmitGuard() {
  const [isProcessing, setIsProcessing] = useState(false);

  const guard = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    if (isProcessing) {
      toast.warning('Operación en curso, espera...');
      return null;
    }
    setIsProcessing(true);
    try {
      return await fn();
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  return { isProcessing, guard };
}

// ─── Guard para sesión de caja: detecta si ya está cerrada ───
export function useCashSessionGuard() {
  const qc = useQueryClient();

  const checkSessionOpen = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!supabase) return true; // modo local, asumir abierta

    const { data } = await supabase
      .from('cash_register_sessions')
      .select('status')
      .eq('id', sessionId)
      .single();

    if (data?.status === 'closed') {
      toast.error('La sesión de caja ya fue cerrada por otro usuario.');
      qc.invalidateQueries({ queryKey: ['cash_sessions'] });
      return false;
    }

    return true;
  }, [qc]);

  return { checkSessionOpen };
}
