import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { FEATURES } from '@/config/features';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─── Realtime de stock ────────────────────────────────────────
// Invalida el caché de productos cuando otro usuario modifica stock.
// Solo activo cuando FEATURES.enableRealtime = true.
export function useStockRealtime() {
  const qc = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!FEATURES.enableRealtime || !supabase) return;

    channelRef.current = supabase
      .channel('stock_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        (payload) => {
          // Actualización optimista: inyectar el nuevo valor directamente
          qc.setQueryData<{ id: string; stock: number }[]>(
            ['products'],
            (old) => old?.map((p) =>
              p.id === payload.new.id ? { ...p, stock: payload.new.stock } : p
            ),
          );
        },
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [qc]);
}

// ─── Realtime de ventas (caja y dashboard) ────────────────────
export function useSalesRealtime(onNewSale?: (sale: Record<string, unknown>) => void) {
  const qc = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(onNewSale);
  callbackRef.current = onNewSale;

  useEffect(() => {
    if (!FEATURES.enableRealtime || !supabase) return;

    channelRef.current = supabase
      .channel('sales_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales' },
        (payload) => {
          qc.invalidateQueries({ queryKey: ['sales'] });
          qc.invalidateQueries({ queryKey: ['dashboard'] });
          callbackRef.current?.(payload.new as Record<string, unknown>);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sales' },
        () => {
          qc.invalidateQueries({ queryKey: ['sales'] });
        },
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [qc]);
}

// ─── Realtime de caja (evitar doble cierre) ───────────────────
export function useCashSessionRealtime(sessionId: string | null) {
  const qc = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!FEATURES.enableRealtime || !supabase || !sessionId) return;

    channelRef.current = supabase
      .channel(`cash_session_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cash_register_sessions',
          filter: `id=eq.${sessionId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['cash_sessions'] });
        },
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [qc, sessionId]);
}

// ─── Realtime de alertas de stock bajo ────────────────────────
export function useLowStockAlerts(onAlert?: (product: Record<string, unknown>) => void) {
  const callbackRef = useRef(onAlert);
  callbackRef.current = onAlert;

  useEffect(() => {
    if (!FEATURES.enableRealtime || !supabase) return;

    const channel = supabase
      .channel('low_stock_alerts')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        (payload) => {
          const p = payload.new as { stock: number; min_stock: number; name: string };
          // Solo alertar cuando cruza el umbral mínimo
          const oldStock = (payload.old as { stock: number }).stock;
          if (oldStock > p.min_stock && p.stock <= p.min_stock) {
            callbackRef.current?.(payload.new as Record<string, unknown>);
          }
        },
      )
      .subscribe();

    return () => channel.unsubscribe();
  }, []);
}
