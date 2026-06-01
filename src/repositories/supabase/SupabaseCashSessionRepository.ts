import { supabase } from '@/lib/supabase';
import type {
  CashSession, CashMovement, CashWithdrawal, CashReopenHistory,
  SessionSummary, DailyCashReport,
  OpenSessionInput, CloseSessionInput, ReopenSessionInput,
  AddMovementInput, AddWithdrawalInput,
} from '@/types/cashRegister';

// ── Mappers row → dominio ─────────────────────────────────────────────────────

function toSession(r: Record<string, unknown>): CashSession {
  return {
    id:               r.id as string,
    sessionNumber:    r.session_number as string,
    posId:            r.pos_id as string,
    openedBy:         r.opened_by as string,
    openedByName:     r.opened_by_name as string,
    openedAt:         r.opened_at as string,
    openingAmount:    Number(r.opening_amount),
    closedBy:         (r.closed_by as string) ?? null,
    closedByName:     (r.closed_by_name as string) ?? null,
    closedAt:         (r.closed_at as string) ?? null,
    closingAmount:    r.closing_amount != null ? Number(r.closing_amount) : null,
    expectedAmount:   r.expected_amount != null ? Number(r.expected_amount) : null,
    differenceAmount: r.difference_amount != null ? Number(r.difference_amount) : null,
    status:           r.status as CashSession['status'],
    notes:            (r.notes as string) ?? null,
    dateKey:          r.date_key as string,
    createdAt:        r.created_at as string,
    updatedAt:        r.updated_at as string,
    currentBalance:   r.current_balance != null ? Number(r.current_balance) : undefined,
    movementCount:    r.movement_count != null ? Number(r.movement_count) : undefined,
  };
}

function toMovement(r: Record<string, unknown>): CashMovement {
  return {
    id:             r.id as string,
    sessionId:      r.session_id as string,
    movementType:   r.movement_type as CashMovement['movementType'],
    amount:         Number(r.amount),
    description:    r.description as string,
    referenceId:    (r.reference_id as string) ?? null,
    referenceTable: (r.reference_table as string) ?? null,
    createdBy:      r.created_by as string,
    createdByName:  r.created_by_name as string,
    createdAt:      r.created_at as string,
    metadata:       (r.metadata as Record<string, unknown>) ?? {},
    sessionNumber:  (r.session_number as string) ?? undefined,
    dateKey:        (r.date_key as string) ?? undefined,
  };
}

function toWithdrawal(r: Record<string, unknown>): CashWithdrawal {
  return {
    id:                r.id as string,
    sessionId:         r.session_id as string,
    amount:            Number(r.amount),
    reason:            r.reason as string,
    authorizedBy:      (r.authorized_by as string) ?? null,
    authorizedByName:  (r.authorized_by_name as string) ?? null,
    createdBy:         r.created_by as string,
    createdByName:     r.created_by_name as string,
    createdAt:         r.created_at as string,
    isReversed:        Boolean(r.is_reversed),
    reversedAt:        (r.reversed_at as string) ?? null,
    reversedBy:        (r.reversed_by as string) ?? null,
    reversalReason:    (r.reversal_reason as string) ?? null,
  };
}

function toReopenHistory(r: Record<string, unknown>): CashReopenHistory {
  return {
    id:                        r.id as string,
    sessionId:                 r.session_id as string,
    reopenedBy:                r.reopened_by as string,
    reopenedByName:            r.reopened_by_name as string,
    reopenedAt:                r.reopened_at as string,
    reason:                    r.reason as string,
    previousStatus:            r.previous_status as CashReopenHistory['previousStatus'],
    previousClosingAmount:     r.previous_closing_amount != null ? Number(r.previous_closing_amount) : null,
    previousExpectedAmount:    r.previous_expected_amount != null ? Number(r.previous_expected_amount) : null,
    previousDifferenceAmount:  r.previous_difference_amount != null ? Number(r.previous_difference_amount) : null,
    approvedBy:                (r.approved_by as string) ?? null,
    approvedByName:            (r.approved_by_name as string) ?? null,
  };
}

// ── Repositorio ───────────────────────────────────────────────────────────────

export class SupabaseCashSessionRepository {

  // ── Sesiones ────────────────────────────────────────────────────────────────

  async getActiveSession(): Promise<CashSession | null> {
    const { data, error } = await supabase
      .from('v_active_cash_session')
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toSession(data) : null;
  }

  async getSessionsByDate(dateKey: string): Promise<CashSession[]> {
    const { data, error } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('date_key', dateKey)
      .order('opened_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toSession);
  }

  async openSession(input: OpenSessionInput): Promise<CashSession> {
    const { data, error } = await supabase.rpc('rpc_open_cash_session', {
      p_opening_amount:  input.openingAmount,
      p_opened_by_name:  input.openedByName,
      p_pos_id:          input.posId ?? 'main',
      p_notes:           input.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return toSession(data);
  }

  async closeSession(input: CloseSessionInput): Promise<CashSession> {
    const { data, error } = await supabase.rpc('rpc_close_cash_session', {
      p_session_id:      input.sessionId,
      p_closing_amount:  input.closingAmount,
      p_closed_by_name:  input.closedByName,
      p_notes:           input.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return toSession(data);
  }

  async reopenSession(input: ReopenSessionInput): Promise<CashSession> {
    const { data, error } = await supabase.rpc('rpc_reopen_cash_session', {
      p_session_id:        input.sessionId,
      p_reason:            input.reason,
      p_reopened_by_name:  input.reopenedByName,
    });
    if (error) throw new Error(error.message);
    return toSession(data);
  }

  // ── Movimientos ─────────────────────────────────────────────────────────────

  async getMovementsBySession(sessionId: string): Promise<CashMovement[]> {
    const { data, error } = await supabase
      .from('cash_movements')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toMovement);
  }

  async getMovementsByDate(dateKey: string): Promise<CashMovement[]> {
    const { data, error } = await supabase
      .from('v_cash_movements_detail')
      .select('*')
      .eq('date_key', dateKey)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toMovement);
  }

  async addMovement(input: AddMovementInput): Promise<CashMovement> {
    const { data, error } = await supabase.rpc('rpc_add_cash_movement', {
      p_session_id:       input.sessionId,
      p_movement_type:    input.movementType,
      p_amount:           input.amount,
      p_description:      input.description,
      p_created_by_name:  input.createdByName,
      p_reference_id:     input.referenceId ?? null,
      p_reference_table:  input.referenceTable ?? null,
      p_metadata:         input.metadata ?? {},
    });
    if (error) throw new Error(error.message);
    return toMovement(data);
  }

  // ── Retiros ─────────────────────────────────────────────────────────────────

  async getWithdrawalsBySession(sessionId: string): Promise<CashWithdrawal[]> {
    const { data, error } = await supabase
      .from('cash_withdrawals')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toWithdrawal);
  }

  async addWithdrawal(input: AddWithdrawalInput): Promise<CashWithdrawal> {
    const { data, error } = await supabase
      .from('cash_withdrawals')
      .insert({
        session_id:          input.sessionId,
        amount:              input.amount,
        reason:              input.reason,
        authorized_by_name:  input.authorizedByName ?? null,
        created_by:          (await supabase.auth.getUser()).data.user?.id,
        created_by_name:     input.createdByName,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Registrar movimiento en libro mayor
    await this.addMovement({
      sessionId:       input.sessionId,
      movementType:    'CASH_WITHDRAWAL',
      amount:          -input.amount,
      description:     input.reason,
      createdByName:   input.createdByName,
      referenceId:     data.id,
      referenceTable:  'cash_withdrawals',
    });

    return toWithdrawal(data);
  }

  async reverseWithdrawal(withdrawalId: string, reason: string, userName: string): Promise<void> {
    const { data: w, error: we } = await supabase
      .from('cash_withdrawals')
      .select('*')
      .eq('id', withdrawalId)
      .single();
    if (we) throw new Error(we.message);
    if (w.is_reversed) throw new Error('Este retiro ya fue revertido.');

    const userId = (await supabase.auth.getUser()).data.user?.id;

    await supabase.from('cash_withdrawals').update({
      is_reversed:     true,
      reversed_at:     new Date().toISOString(),
      reversed_by:     userId,
      reversal_reason: reason,
    }).eq('id', withdrawalId);

    await this.addMovement({
      sessionId:      w.session_id,
      movementType:   'REVERSAL',
      amount:         Number(w.amount),
      description:    `Reverso retiro: ${reason}`,
      createdByName:  userName,
      referenceId:    withdrawalId,
      referenceTable: 'cash_withdrawals',
    });
  }

  // ── Historial de reaperturas ─────────────────────────────────────────────────

  async getReopenHistory(sessionId: string): Promise<CashReopenHistory[]> {
    const { data, error } = await supabase
      .from('cash_reopen_history')
      .select('*')
      .eq('session_id', sessionId)
      .order('reopened_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toReopenHistory);
  }

  // ── Resúmenes ────────────────────────────────────────────────────────────────

  async getSessionSummary(sessionId: string): Promise<SessionSummary> {
    const { data, error } = await supabase.rpc('rpc_get_session_summary', {
      p_session_id: sessionId,
    });
    if (error) throw new Error(error.message);
    const r = Array.isArray(data) ? data[0] : data;
    return {
      totalIngresos:   Number(r.total_ingresos),
      totalEgresos:    Number(r.total_egresos),
      balanceEfectivo: Number(r.balance_efectivo),
      totalVentas:     Number(r.total_ventas),
      totalGastos:     Number(r.total_gastos),
      totalAbonos:     Number(r.total_abonos),
      totalRetiros:    Number(r.total_retiros),
      totalTraspasos:  Number(r.total_traspasos),
      numMovimientos:  Number(r.num_movimientos),
    };
  }

  async getDailyReport(dateKey: string): Promise<DailyCashReport[]> {
    const { data, error } = await supabase.rpc('rpc_get_daily_cash_report', {
      p_date: dateKey,
    });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: Record<string, unknown>) => ({
      sessionId:        r.session_id as string,
      sessionNumber:    r.session_number as string,
      status:           r.status as DailyCashReport['status'],
      openingAmount:    Number(r.opening_amount),
      closingAmount:    r.closing_amount != null ? Number(r.closing_amount) : null,
      expectedAmount:   r.expected_amount != null ? Number(r.expected_amount) : null,
      differenceAmount: r.difference_amount != null ? Number(r.difference_amount) : null,
      totalIngresos:    Number(r.total_ingresos),
      totalEgresos:     Number(r.total_egresos),
      openedByName:     r.opened_by_name as string,
      closedByName:     (r.closed_by_name as string) ?? null,
      openedAt:         r.opened_at as string,
      closedAt:         (r.closed_at as string) ?? null,
      numReopens:       Number(r.num_reopens),
    }));
  }

  // ── Migración desde localStorage ────────────────────────────────────────────

  async migrateFromLocalStorage(params: {
    dateKey: string;
    openingAmount: number;
    openingAt: string;
    closingAmount: number | null;
    closingAt: string | null;
    status: string;
    notes: string | null;
    openedByName: string;
  }): Promise<string | null> {
    const { data, error } = await supabase.rpc('rpc_migrate_localstorage_session', {
      p_date_key:       params.dateKey,
      p_opening_amount: params.openingAmount,
      p_opening_at:     params.openingAt,
      p_closing_amount: params.closingAmount,
      p_closing_at:     params.closingAt,
      p_status:         params.status === 'open' ? 'OPEN' : 'CLOSED',
      p_notes:          params.notes,
      p_opened_by_name: params.openedByName,
      p_movements:      [],
    });
    if (error) throw new Error(error.message);
    return data as string | null;
  }
}
