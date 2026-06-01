/**
 * CashRegisterV2 — Módulo de Caja Enterprise
 * Toda la persistencia va a Supabase. Sin localStorage.
 * Auditoría completa, libro mayor inmutable, reapertura controlada.
 */
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Lock, Unlock, RotateCcw, ArrowDownCircle, ArrowUpCircle,
  Banknote, RefreshCw, FileText, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, Wallet, BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { fmtMoneyInput, parseMoney } from '@/utils/formatters';
import {
  useActiveSession,
  useSessionsByDate,
  useCashMovements,
  useSessionSummary,
  useCashWithdrawals,
  useCashReopenHistory,
  useCashSessionMutations,
} from '@/hooks/queries/useCashSession';
import { useExpensesData } from '@/hooks/queries/useExpensesData';
import { useAdvisors } from '@/hooks/queries/useAdvisors';
import CashMovementsTable from '@/components/cashRegister/CashMovementsTable';
import ReopenSessionDialog from '@/components/cashRegister/ReopenSessionDialog';
import type { CashMovementType } from '@/types/cashRegister';

const toDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  OPEN:      { label: 'Abierta',   class: 'bg-green-100 text-green-800 border-green-300' },
  CLOSED:    { label: 'Cerrada',   class: 'bg-gray-100 text-gray-700 border-gray-300' },
  REOPENED:  { label: 'Reabierta', class: 'bg-amber-100 text-amber-800 border-amber-300' },
  CANCELLED: { label: 'Cancelada', class: 'bg-red-100 text-red-800 border-red-300' },
};

export default function CashRegisterV2() {
  const { user, isAdmin } = useAuth();
  const userName = (user as any)?.user_metadata?.full_name ?? user?.email ?? 'Usuario';

  const [selectedDate, setSelectedDate] = useState(() => toDateKey());
  const [isReopenOpen, setIsReopenOpen] = useState(false);

  // Queries
  const { data: activeSession, isLoading: loadingSession } = useActiveSession();
  const { data: dateSessions = [] } = useSessionsByDate(selectedDate);
  const viewSession = activeSession ?? dateSessions[0] ?? null;

  const { data: movements = [], isLoading: loadingMovements } = useCashMovements(viewSession?.id);
  const { data: summary } = useSessionSummary(viewSession?.id);
  const { data: withdrawals = [] } = useCashWithdrawals(viewSession?.id);
  const { data: reopenHistory = [] } = useCashReopenHistory(viewSession?.id);

  const { addExpense, getExpensesByDate } = useExpensesData();
  const { advisors } = useAdvisors();
  const dailyExpenses = getExpensesByDate(selectedDate);

  // Mutations
  const { openSession, closeSession, reopenSession, addMovement, addWithdrawal } = useCashSessionMutations();

  // ── Estado formulario apertura ─────────────────────────────────────────────
  const [openAmtStr, setOpenAmtStr] = useState('');
  const [openNotes, setOpenNotes]   = useState('');

  // ── Estado formulario cierre ───────────────────────────────────────────────
  const [closeAmtStr, setCloseAmtStr] = useState('');
  const [closeNotes, setCloseNotes]   = useState('');

  // ── Estado formulario ingreso manual ──────────────────────────────────────
  const [ingressType, setIngressType] = useState<CashMovementType>('CREDIT_PAYMENT');
  const [ingressAmtStr, setIngressAmtStr] = useState('');
  const [ingressDesc, setIngressDesc]     = useState('');
  const [ingressPlatform, setIngressPlatform] = useState('');

  // ── Estado formulario egreso ───────────────────────────────────────────────
  const [expAdvisor, setExpAdvisor]   = useState('');
  const [expAmtStr, setExpAmtStr]     = useState('');
  const [expDesc, setExpDesc]         = useState('');
  const [expType, setExpType]         = useState<'gasto' | 'prestamo'>('gasto');

  // ── Estado formulario retiro ───────────────────────────────────────────────
  const [wdAmtStr, setWdAmtStr]   = useState('');
  const [wdReason, setWdReason]   = useState('');

  const isSessionOpen = viewSession?.status === 'OPEN' || viewSession?.status === 'REOPENED';
  const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleOpen = () => {
    const amt = parseMoney(openAmtStr);
    if (amt < 0) { toast.error('El monto de apertura debe ser mayor o igual a $0'); return; }
    openSession.mutate({ openingAmount: amt, openedByName: userName, notes: openNotes || undefined });
    setOpenAmtStr(''); setOpenNotes('');
  };

  const handleClose = () => {
    if (!viewSession) return;
    const amt = parseMoney(closeAmtStr);
    if (amt < 0) { toast.error('El monto de cierre no puede ser negativo'); return; }
    closeSession.mutate({ sessionId: viewSession.id, closingAmount: amt, closedByName: userName, notes: closeNotes || undefined });
    setCloseAmtStr(''); setCloseNotes('');
  };

  const handleAddIngress = () => {
    if (!viewSession) return;
    const amt = parseMoney(ingressAmtStr);
    if (amt <= 0) { toast.error('El monto debe ser mayor a $0'); return; }
    const desc = ingressType === 'CREDIT_PAYMENT' && ingressPlatform
      ? `${ingressPlatform}${ingressDesc ? ' — ' + ingressDesc : ''}`
      : ingressDesc;
    if (!desc.trim()) { toast.error('Ingresa una descripción'); return; }
    addMovement.mutate({
      sessionId: viewSession.id, movementType: ingressType,
      amount: amt, description: desc, createdByName: userName,
    });
    setIngressAmtStr(''); setIngressDesc(''); setIngressPlatform('');
  };

  const handleAddExpense = () => {
    if (!viewSession) return;
    const amt = parseMoney(expAmtStr);
    if (!expAdvisor) { toast.error('Selecciona un asesor'); return; }
    if (amt <= 0) { toast.error('El monto debe ser mayor a $0'); return; }
    if (!expDesc.trim()) { toast.error('La descripción es obligatoria'); return; }
    const advisor = advisors.find(a => a.id === expAdvisor);
    addExpense({ advisorId: expAdvisor, advisorName: advisor?.name ?? expAdvisor, type: expType, amount: amt, description: expDesc });
    addMovement.mutate({
      sessionId: viewSession.id, movementType: 'EXPENSE',
      amount: -amt, description: `${expType.toUpperCase()} — ${advisor?.name ?? expAdvisor}: ${expDesc}`,
      createdByName: userName,
    });
    setExpAmtStr(''); setExpDesc('');
  };

  const handleAddWithdrawal = () => {
    if (!viewSession) return;
    const amt = parseMoney(wdAmtStr);
    if (amt <= 0) { toast.error('El monto debe ser mayor a $0'); return; }
    if (!wdReason.trim()) { toast.error('El motivo es obligatorio'); return; }
    addWithdrawal.mutate({ sessionId: viewSession.id, amount: amt, reason: wdReason, createdByName: userName });
    setWdAmtStr(''); setWdReason('');
  };

  const handleReopen = (reason: string) => {
    if (!viewSession) return;
    reopenSession.mutate({ sessionId: viewSession.id, reason, reopenedByName: userName });
    setIsReopenOpen(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loadingSession) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Cargando módulo de caja...
      </div>
    );
  }

  return (
    <ScrollArea className="h-screen">
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">

        {/* ── Encabezado ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="h-6 w-6 text-blue-600" />
              Arqueo de Caja
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {viewSession ? viewSession.sessionNumber : 'Sin sesión activa'}
              {viewSession && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs border font-medium ${STATUS_BADGE[viewSession.status]?.class}`}>
                  {STATUS_BADGE[viewSession.status]?.label}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="h-8 w-40 text-sm"
            />
            {viewSession?.status === 'CLOSED' && isAdmin() && (
              <Button variant="outline" size="sm" onClick={() => setIsReopenOpen(true)} className="text-amber-700 border-amber-300">
                <RotateCcw className="h-4 w-4 mr-1" /> Reabrir
              </Button>
            )}
          </div>
        </div>

        {/* ── Sin sesión → formulario apertura ───────────────────────────── */}
        {!viewSession || (!isSessionOpen && !viewSession) ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Unlock className="h-5 w-5" />
                Abrir Caja
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Base de apertura</Label>
                <Input type="text" inputMode="numeric"
                  value={openAmtStr} onChange={e => setOpenAmtStr(fmtMoneyInput(e.target.value))}
                  placeholder="$0" className="mt-1" />
              </div>
              <div className="md:col-span-2">
                <Label>Notas (opcional)</Label>
                <Input value={openNotes} onChange={e => setOpenNotes(e.target.value)}
                  placeholder="Observaciones de apertura" className="mt-1" />
              </div>
              <div className="md:col-span-3">
                <Button onClick={handleOpen} disabled={openSession.isPending} className="bg-green-600 hover:bg-green-700">
                  <Unlock className="h-4 w-4 mr-2" />
                  {openSession.isPending ? 'Abriendo...' : 'Abrir Caja'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* ── Resumen KPIs ────────────────────────────────────────────────── */}
        {viewSession && summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { label: 'Apertura',       value: viewSession.openingAmount,     icon: Unlock,        color: 'text-gray-700' },
              { label: 'Ventas',         value: summary.totalVentas,           icon: TrendingUp,    color: 'text-green-700' },
              { label: 'Abonos',         value: summary.totalAbonos,           icon: ArrowDownCircle, color: 'text-blue-700' },
              { label: 'Gastos',         value: summary.totalGastos,           icon: TrendingDown,  color: 'text-red-700' },
              { label: 'Retiros',        value: summary.totalRetiros,          icon: Banknote,      color: 'text-orange-700' },
              { label: 'Balance Caja',   value: summary.balanceEfectivo,       icon: Wallet,        color: 'text-indigo-700' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </div>
                  <div className={`text-xl font-bold ${color}`}>{fmt(value)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── Operaciones (solo si caja activa) ──────────────────────────── */}
        {isSessionOpen && viewSession && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Ingresos manuales */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-700">
                  <ArrowDownCircle className="h-4 w-4" />
                  Registrar Ingreso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={ingressType} onValueChange={v => setIngressType(v as CashMovementType)}>
                    <SelectTrigger className="h-8 mt-1 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CREDIT_PAYMENT">Abono a Crédito</SelectItem>
                      <SelectItem value="CAPITAL_INJECTION">Inyección Capital</SelectItem>
                      <SelectItem value="REFUND">Devolución recibida</SelectItem>
                      <SelectItem value="ADJUSTMENT">Ajuste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {ingressType === 'CREDIT_PAYMENT' && (
                  <div>
                    <Label className="text-xs">Plataforma</Label>
                    <Select value={ingressPlatform} onValueChange={setIngressPlatform}>
                      <SelectTrigger className="h-8 mt-1 text-sm">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {['Addi','Sistecrédito','Fincomercio','Alkosto','Codensa','Efectivo directo','Otro'].map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label className="text-xs">Monto</Label>
                  <Input type="text" inputMode="numeric" className="h-8 mt-1 text-sm"
                    value={ingressAmtStr} onChange={e => setIngressAmtStr(fmtMoneyInput(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Descripción</Label>
                  <Input className="h-8 mt-1 text-sm" value={ingressDesc}
                    onChange={e => setIngressDesc(e.target.value)} placeholder="Detalle del ingreso" />
                </div>
                <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" onClick={handleAddIngress}>
                  Registrar Ingreso
                </Button>
              </CardContent>
            </Card>

            {/* Egresos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-700">
                  <ArrowUpCircle className="h-4 w-4" />
                  Registrar Egreso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Asesor</Label>
                  <select value={expAdvisor} onChange={e => setExpAdvisor(e.target.value)}
                    className="w-full mt-1 h-8 border rounded text-sm px-2">
                    <option value="">Seleccione...</option>
                    {advisors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <select value={expType} onChange={e => setExpType(e.target.value as 'gasto' | 'prestamo')}
                    className="w-full mt-1 h-8 border rounded text-sm px-2">
                    <option value="gasto">Gasto</option>
                    <option value="prestamo">Préstamo</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Monto</Label>
                  <Input type="text" inputMode="numeric" className="h-8 mt-1 text-sm"
                    value={expAmtStr} onChange={e => setExpAmtStr(fmtMoneyInput(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Descripción</Label>
                  <Input className="h-8 mt-1 text-sm" value={expDesc}
                    onChange={e => setExpDesc(e.target.value)} placeholder="Detalle" />
                </div>
                <Button size="sm" variant="outline" className="w-full border-red-300 text-red-700 hover:bg-red-50" onClick={handleAddExpense}>
                  Registrar Egreso
                </Button>
              </CardContent>
            </Card>

            {/* Retiros y cierre */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-orange-700">
                    <Banknote className="h-4 w-4" />
                    Retiro de Efectivo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Monto</Label>
                    <Input type="text" inputMode="numeric" className="h-8 mt-1 text-sm"
                      value={wdAmtStr} onChange={e => setWdAmtStr(fmtMoneyInput(e.target.value))} />
                  </div>
                  <div>
                    <Label className="text-xs">Motivo</Label>
                    <Input className="h-8 mt-1 text-sm" value={wdReason}
                      onChange={e => setWdReason(e.target.value)} placeholder="Razón del retiro" />
                  </div>
                  <Button size="sm" variant="outline" className="w-full border-orange-300 text-orange-700 hover:bg-orange-50" onClick={handleAddWithdrawal}>
                    Registrar Retiro
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-gray-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                    <Lock className="h-4 w-4" />
                    Cerrar Caja
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {summary && (
                    <div className="text-xs bg-gray-50 rounded p-2 space-y-1">
                      <p className="flex justify-between">
                        <span className="text-gray-500">Efectivo esperado:</span>
                        <span className="font-medium">{fmt(summary.balanceEfectivo)}</span>
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Conteo real en caja</Label>
                    <Input type="text" inputMode="numeric" className="h-8 mt-1 text-sm"
                      value={closeAmtStr} onChange={e => setCloseAmtStr(fmtMoneyInput(e.target.value))} />
                  </div>
                  {closeAmtStr && summary && (() => {
                    const real = parseMoney(closeAmtStr);
                    const diff = real - summary.balanceEfectivo;
                    return (
                      <div className={`flex items-center gap-1 text-xs font-medium ${diff === 0 ? 'text-green-700' : diff > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                        {diff === 0 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                        {diff === 0 ? 'Cuadre exacto' : `${diff > 0 ? 'Sobrante' : 'Faltante'}: ${fmt(Math.abs(diff))}`}
                      </div>
                    );
                  })()}
                  <div>
                    <Label className="text-xs">Notas de cierre</Label>
                    <Textarea rows={2} className="mt-1 text-sm resize-none" value={closeNotes}
                      onChange={e => setCloseNotes(e.target.value)} placeholder="Observaciones..." />
                  </div>
                  <Button size="sm" className="w-full" onClick={handleClose} disabled={closeSession.isPending}>
                    <Lock className="h-4 w-4 mr-2" />
                    {closeSession.isPending ? 'Cerrando...' : 'Cerrar Caja'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── Libro Mayor de Movimientos ─────────────────────────────────── */}
        {viewSession && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Libro Mayor — {viewSession.sessionNumber}
                <Badge variant="outline" className="ml-auto text-xs">
                  {movements.length} movimientos
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CashMovementsTable movements={movements} isLoading={loadingMovements} maxHeight={400} />
            </CardContent>
          </Card>
        )}

        {/* ── Historial de reaperturas ───────────────────────────────────── */}
        {reopenHistory.length > 0 && (
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-amber-800">
                <RotateCcw className="h-4 w-4" />
                Historial de Reaperturas ({reopenHistory.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {reopenHistory.map(rh => (
                <div key={rh.id} className="text-sm bg-amber-50 border border-amber-200 rounded p-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{rh.reopenedByName}</span>
                    <span>{new Date(rh.reopenedAt).toLocaleString('es-CO')}</span>
                  </div>
                  <p className="font-medium text-amber-900">{rh.reason}</p>
                  {rh.previousClosingAmount != null && (
                    <p className="text-xs text-gray-500 mt-1">
                      Cierre anterior: ${rh.previousClosingAmount.toLocaleString('es-CO')}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

      </div>

      <ReopenSessionDialog
        open={isReopenOpen}
        session={viewSession}
        onClose={() => setIsReopenOpen(false)}
        onConfirm={handleReopen}
        isLoading={reopenSession.isPending}
      />
    </ScrollArea>
  );
}
