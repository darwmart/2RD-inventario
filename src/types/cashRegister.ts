// ── Tipos Enterprise del Módulo de Caja ──────────────────────────────────────

export type CashSessionStatus = 'OPEN' | 'CLOSED' | 'REOPENED' | 'CANCELLED';

export type CashMovementType =
  | 'SALE'
  | 'EXPENSE'
  | 'CREDIT_PAYMENT'
  | 'CAPITAL_INJECTION'
  | 'CASH_WITHDRAWAL'
  | 'SAFE_TRANSFER'
  | 'REFUND'
  | 'ADJUSTMENT'
  | 'REVERSAL';

export type CashAuditAction =
  | 'INSERT' | 'UPDATE' | 'CLOSE' | 'REOPEN' | 'VOID' | 'REVERSAL' | 'CANCEL';

// ── Entidades ─────────────────────────────────────────────────────────────────

export type CashSession = {
  id: string;
  sessionNumber: string;
  posId: string;
  openedBy: string;
  openedByName: string;
  openedAt: string;
  openingAmount: number;
  closedBy: string | null;
  closedByName: string | null;
  closedAt: string | null;
  closingAmount: number | null;
  expectedAmount: number | null;
  differenceAmount: number | null;
  status: CashSessionStatus;
  notes: string | null;
  dateKey: string;
  createdAt: string;
  updatedAt: string;
  // calculados opcionales (desde vistas)
  currentBalance?: number;
  movementCount?: number;
};

export type CashMovement = {
  id: string;
  sessionId: string;
  movementType: CashMovementType;
  amount: number;
  description: string;
  referenceId: string | null;
  referenceTable: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  metadata: Record<string, unknown>;
  // join opcionales
  sessionNumber?: string;
  dateKey?: string;
};

export type CashReopenHistory = {
  id: string;
  sessionId: string;
  reopenedBy: string;
  reopenedByName: string;
  reopenedAt: string;
  reason: string;
  previousStatus: CashSessionStatus;
  previousClosingAmount: number | null;
  previousExpectedAmount: number | null;
  previousDifferenceAmount: number | null;
  approvedBy: string | null;
  approvedByName: string | null;
};

export type CashWithdrawal = {
  id: string;
  sessionId: string;
  amount: number;
  reason: string;
  authorizedBy: string | null;
  authorizedByName: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  isReversed: boolean;
  reversedAt: string | null;
  reversedBy: string | null;
  reversalReason: string | null;
};

export type SaleReversal = {
  id: string;
  saleId: string;
  sessionId: string | null;
  amount: number;
  reason: string;
  approvedBy: string | null;
  approvedByName: string | null;
  reversedBy: string;
  reversedByName: string;
  reversedAt: string;
};

export type CashAuditLog = {
  id: number;
  tableName: string;
  recordId: string;
  action: CashAuditAction;
  changedBy: string | null;
  changedByName: string | null;
  changedAt: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  notes: string | null;
};

// ── Resúmenes (desde RPCs) ────────────────────────────────────────────────────

export type SessionSummary = {
  totalIngresos: number;
  totalEgresos: number;
  balanceEfectivo: number;
  totalVentas: number;
  totalGastos: number;
  totalAbonos: number;
  totalRetiros: number;
  totalTraspasos: number;
  numMovimientos: number;
};

export type DailyCashReport = {
  sessionId: string;
  sessionNumber: string;
  status: CashSessionStatus;
  openingAmount: number;
  closingAmount: number | null;
  expectedAmount: number | null;
  differenceAmount: number | null;
  totalIngresos: number;
  totalEgresos: number;
  openedByName: string;
  closedByName: string | null;
  openedAt: string;
  closedAt: string | null;
  numReopens: number;
};

// ── Inputs para operaciones ───────────────────────────────────────────────────

export type OpenSessionInput = {
  openingAmount: number;
  openedByName: string;
  posId?: string;
  notes?: string;
};

export type CloseSessionInput = {
  sessionId: string;
  closingAmount: number;
  closedByName: string;
  notes?: string;
};

export type ReopenSessionInput = {
  sessionId: string;
  reason: string;
  reopenedByName: string;
};

export type AddMovementInput = {
  sessionId: string;
  movementType: CashMovementType;
  amount: number;
  description: string;
  createdByName: string;
  referenceId?: string;
  referenceTable?: string;
  metadata?: Record<string, unknown>;
};

export type AddWithdrawalInput = {
  sessionId: string;
  amount: number;
  reason: string;
  authorizedByName?: string;
  createdByName: string;
};

// Etiquetas legibles para tipos de movimiento
export const MOVEMENT_TYPE_LABELS: Record<CashMovementType, string> = {
  SALE:              'Venta',
  EXPENSE:           'Gasto',
  CREDIT_PAYMENT:    'Abono Crédito',
  CAPITAL_INJECTION: 'Inyección Capital',
  CASH_WITHDRAWAL:   'Retiro Efectivo',
  SAFE_TRANSFER:     'Traspaso Caja Fuerte',
  REFUND:            'Devolución',
  ADJUSTMENT:        'Ajuste',
  REVERSAL:          'Reverso',
};

export const MOVEMENT_TYPE_SIGN: Record<CashMovementType, 1 | -1> = {
  SALE:              1,
  EXPENSE:          -1,
  CREDIT_PAYMENT:    1,
  CAPITAL_INJECTION: 1,
  CASH_WITHDRAWAL:  -1,
  SAFE_TRANSFER:    -1,
  REFUND:           -1,
  ADJUSTMENT:        1,
  REVERSAL:          1,
};
