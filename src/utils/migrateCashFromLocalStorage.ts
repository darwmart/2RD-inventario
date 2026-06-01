/**
 * Migración única: localStorage → Supabase (cash_sessions)
 *
 * Se llama UNA vez al cargar la app si el usuario tiene datos en localStorage
 * y aún no existen sesiones en Supabase para esas fechas.
 *
 * Después de migrar exitosamente, marca la clave 'cashMigratedToSupabase' = true
 * para no volver a ejecutarse.
 */
import { SupabaseCashSessionRepository } from '@/repositories/supabase/SupabaseCashSessionRepository';

const KEY_SESSIONS    = 'cashSessions';
const KEY_MIGRATED    = 'cashMigratedToSupabase';

type OldSession = {
  id: string;
  date: string;
  openingAmount: number;
  openingTime: string;
  closingAmount?: number;
  closingTime?: string;
  status: 'open' | 'closed';
  difference?: number;
  notes?: string;
};

export async function migrateCashFromLocalStorage(userName: string): Promise<void> {
  if (localStorage.getItem(KEY_MIGRATED) === 'true') return;

  const raw = localStorage.getItem(KEY_SESSIONS);
  if (!raw) {
    localStorage.setItem(KEY_MIGRATED, 'true');
    return;
  }

  let sessions: OldSession[] = [];
  try { sessions = JSON.parse(raw); } catch { return; }

  if (!sessions.length) {
    localStorage.setItem(KEY_MIGRATED, 'true');
    return;
  }

  const repo = new SupabaseCashSessionRepository();
  let migrated = 0;

  for (const s of sessions) {
    try {
      await repo.migrateFromLocalStorage({
        dateKey:       s.date,
        openingAmount: s.openingAmount,
        openingAt:     s.openingTime ?? new Date(s.date).toISOString(),
        closingAmount: s.closingAmount ?? null,
        closingAt:     s.closingTime ?? null,
        status:        s.status,
        notes:         s.notes ?? null,
        openedByName:  userName,
      });
      migrated++;
    } catch {
      // Si ya existe la sesión para esa fecha, ignorar
    }
  }

  if (migrated > 0) {
    console.info(`[CashMigration] ${migrated} sesión(es) migrada(s) desde localStorage a Supabase.`);
  }

  localStorage.setItem(KEY_MIGRATED, 'true');
}
