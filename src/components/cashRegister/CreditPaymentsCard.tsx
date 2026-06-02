import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowDownCircle, Trash2, Ban } from 'lucide-react';
import { CashRegisterSession } from '@/types';
import { fmtMoneyInput, parseMoney } from '@/utils/formatters';
import { toast } from 'sonner';
import type { CashMovement } from '@/types/cashRegister';
import type { PaymentMethod } from '@/types';

export interface CreditPaymentInput {
  platform: string;
  paymentMethodId: string;
  paymentMethodName: string;
  amount: number;
  description: string;
}

interface Props {
  currentSession: CashRegisterSession | undefined;
  dailyMovements: CashMovement[];
  reversedIds: Set<string>;
  totalPayments: number;
  creditPlatforms: PaymentMethod[];
  paymentMethods: PaymentMethod[];
  isAdmin: boolean;
  onAdd: (data: CreditPaymentInput) => void;
  onReverse: (movementId: string, amount: number, metadata: Record<string, unknown>) => void;
}

export default function CreditPaymentsCard({
  currentSession, dailyMovements, reversedIds, totalPayments,
  creditPlatforms, paymentMethods, isAdmin, onAdd, onReverse,
}: Props) {
  const [platform, setPlatform]         = useState('');
  const [customPlatform, setCustomPlatform] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [amountStr, setAmountStr]       = useState('');
  const [description, setDescription]   = useState('');

  const isClosed = !currentSession || currentSession.status === 'closed';
  const effectivePlatform = platform === '__otro__' ? customPlatform : platform;

  const handleAdd = () => {
    if (isClosed) { toast.error('La caja está cerrada.'); return; }
    if (!effectivePlatform.trim()) { toast.error('Indica la plataforma o concepto'); return; }
    if (!paymentMethodId) { toast.error('Selecciona el método de pago recibido'); return; }
    const amount = parseMoney(amountStr);
    if (amount <= 0) { toast.error('El monto debe ser mayor a $0'); return; }
    const pm = paymentMethods.find(p => p.id === paymentMethodId);
    onAdd({
      platform: effectivePlatform.trim(),
      paymentMethodId,
      paymentMethodName: pm?.name ?? '',
      amount,
      description: description.trim(),
    });
    setPlatform(''); setCustomPlatform('');
    setPaymentMethodId(''); setAmountStr(''); setDescription('');
  };

  const handleReverse = (m: CashMovement) => {
    if (!window.confirm(`¿Anular este ingreso de $${m.amount.toLocaleString('es-CO')}? Se generará un movimiento de reverso.`)) return;
    onReverse(m.id, m.amount, m.metadata ?? {});
  };

  // Calcula el neto real (descontando reversiones)
  const netTotal = dailyMovements.reduce((sum, m) => {
    if (reversedIds.has(m.id)) return sum;
    return sum + m.amount;
  }, 0);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5 text-green-600" />
            Ingresos — Abonos a Créditos de Plataformas
          </span>
          {currentSession?.status === 'closed' && (
            <Badge variant="secondary">Caja cerrada — solo lectura</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>

        {/* ── Formulario de ingreso ─────────────────────────────────── */}
        {!isClosed && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
            <div>
              <Label className="text-xs">Plataforma de crédito</Label>
              <select
                value={platform}
                onChange={e => { setPlatform(e.target.value); setCustomPlatform(''); }}
                className="w-full mt-1 border rounded p-2 text-sm h-9"
              >
                <option value="">Seleccione...</option>
                {creditPlatforms.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
                <option value="__otro__">Otro / Personalizado</option>
              </select>
              {platform === '__otro__' && (
                <Input value={customPlatform} onChange={e => setCustomPlatform(e.target.value)}
                  placeholder="Nombre..." className="mt-1 h-8 text-sm" autoFocus />
              )}
            </div>

            <div>
              <Label className="text-xs">Método de pago recibido</Label>
              <select
                value={paymentMethodId}
                onChange={e => setPaymentMethodId(e.target.value)}
                className="w-full mt-1 border rounded p-2 text-sm h-9"
              >
                <option value="">Seleccione...</option>
                {paymentMethods.filter(p => p.isActive).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs">Monto</Label>
              <Input type="text" inputMode="numeric" className="mt-1 h-9"
                value={amountStr} onChange={e => setAmountStr(fmtMoneyInput(e.target.value))}
                placeholder="$0" />
            </div>

            <div className="md:col-span-2">
              <Label className="text-xs">Descripción (opcional)</Label>
              <Input className="mt-1 h-9" value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ej: Abono cliente Juan Pérez" />
            </div>
          </div>
        )}

        {!isClosed && (
          <Button onClick={handleAdd} className="bg-green-600 hover:bg-green-700 mb-5">
            <ArrowDownCircle className="h-4 w-4 mr-2" />
            Registrar Ingreso
          </Button>
        )}

        {/* ── Lista CRUD ────────────────────────────────────────────── */}
        {isClosed && dailyMovements.length === 0 ? (
          <div className="p-4 bg-gray-50 border rounded-lg text-sm text-gray-500 text-center">
            {!currentSession ? 'Abre la caja para registrar ingresos.' : 'No hay ingresos registrados.'}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Plataforma / Concepto</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Método</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-24">Hora</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">Monto</th>
                  {isAdmin && !isClosed && <th className="w-10 px-2"></th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {dailyMovements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-gray-400 text-sm">
                      No hay ingresos registrados
                    </td>
                  </tr>
                ) : (
                  dailyMovements.map(m => {
                    const isReversed = reversedIds.has(m.id);
                    const parts = m.description.split(' · ');
                    const platformPart = parts[0] ?? m.description;
                    const methodPart = parts[1]?.split(' — ')[0] ?? '—';
                    return (
                      <tr key={m.id} className={isReversed ? 'bg-gray-50 opacity-60' : 'bg-green-50'}>
                        <td className="px-3 py-2">
                          <span className={`font-medium ${isReversed ? 'line-through text-gray-500' : 'text-green-800'}`}>
                            {platformPart}
                          </span>
                          {isReversed && (
                            <Badge variant="secondary" className="ml-2 text-xs">Anulado</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">{methodPart}</td>
                        <td className="px-3 py-2 text-xs text-gray-400 font-mono">
                          {new Date(m.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className={`px-3 py-2 text-right font-bold font-mono ${isReversed ? 'text-gray-400 line-through' : 'text-green-700'}`}>
                          +${m.amount.toLocaleString('es-CO')}
                        </td>
                        {isAdmin && !isClosed && (
                          <td className="px-2 py-2 text-center">
                            {!isReversed && (
                              <button
                                onClick={() => handleReverse(m)}
                                className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded"
                                title="Anular ingreso"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
              {dailyMovements.length > 0 && (
                <tfoot className="bg-gray-50 border-t">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-sm font-medium">Total neto</td>
                    <td className="px-3 py-2 text-right font-bold text-green-700">
                      +${netTotal.toLocaleString('es-CO')}
                    </td>
                    {isAdmin && !isClosed && <td />}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
