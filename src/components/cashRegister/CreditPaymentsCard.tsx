import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowDownCircle } from 'lucide-react';
import { CashRegisterSession } from '@/types';
import { fmtMoneyInput, parseMoney } from '@/utils/formatters';
import { toast } from 'sonner';
import type { CashMovement } from '@/types/cashRegister';

const PLATFORMS = ['Addi', 'Sistecrédito', 'Fincomercio', 'Alkosto', 'Codensa', 'Efectivo directo', 'Otro'];

interface Props {
  currentSession: CashRegisterSession | undefined;
  dailyMovements: CashMovement[];
  totalPayments: number;
  onAdd: (data: { platform: string; amount: number; description: string }) => void;
}

export default function CreditPaymentsCard({ currentSession, dailyMovements, totalPayments, onAdd }: Props) {
  const [platform, setPlatform] = useState('');
  const [customPlatform, setCustomPlatform] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');

  const isClosed = !currentSession || currentSession.status === 'closed';
  const effectivePlatform = platform === 'Otro' ? customPlatform : platform;

  const handleAdd = () => {
    if (isClosed) { toast.error('La caja está cerrada. No se pueden registrar ingresos.'); return; }
    if (!effectivePlatform.trim()) { toast.error('Selecciona o escribe la plataforma'); return; }
    const amount = parseMoney(amountStr);
    if (amount <= 0) { toast.error('El monto debe ser mayor a $0'); return; }
    onAdd({ platform: effectivePlatform.trim(), amount, description: description.trim() });
    setAmountStr('');
    setDescription('');
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5 text-green-600" />
            Ingresos de Efectivo — Abonos a Créditos
          </span>
          {currentSession?.status === 'closed' && (
            <Badge variant="secondary">Caja cerrada — solo lectura</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isClosed ? (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 mb-4 text-center">
            {!currentSession ? 'Abre la caja para registrar ingresos.' : 'La caja está cerrada.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label>Plataforma / Concepto</Label>
              <select
                value={platform}
                onChange={e => { setPlatform(e.target.value); if (e.target.value !== 'Otro') setCustomPlatform(''); }}
                className="w-full mt-1 border rounded p-2 text-sm h-9"
              >
                <option value="">Seleccione...</option>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {platform === 'Otro' && (
                <Input
                  value={customPlatform}
                  onChange={e => setCustomPlatform(e.target.value)}
                  placeholder="Nombre de la plataforma"
                  className="mt-1 h-8 text-sm"
                />
              )}
            </div>
            <div>
              <Label>Monto</Label>
              <Input
                type="text" inputMode="numeric" className="mt-1"
                value={amountStr} onChange={e => setAmountStr(fmtMoneyInput(e.target.value))}
                placeholder="$0"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Descripción (opcional)</Label>
              <Input
                className="mt-1" value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ej: Abono cliente Juan Pérez"
              />
            </div>
          </div>
        )}

        {currentSession?.status === 'open' && (
          <Button onClick={handleAdd} className="bg-green-600 hover:bg-green-700 mb-4">
            <ArrowDownCircle className="h-4 w-4 mr-2" />
            Registrar Ingreso
          </Button>
        )}

        <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
          {dailyMovements.length === 0 ? (
            <p className="text-gray-500 text-center text-sm py-4">No hay ingresos por abonos registrados</p>
          ) : (
            dailyMovements.map(m => (
              <div key={m.id} className="p-3 border rounded-lg flex justify-between items-start gap-2 bg-green-50">
                <div className="flex-1">
                  <p className="font-medium text-green-800 text-sm">{m.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(m.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}{m.createdByName}
                  </p>
                </div>
                <span className="font-bold text-green-700">+${m.amount.toLocaleString('es-CO')}</span>
              </div>
            ))
          )}
        </div>

        {totalPayments > 0 && (
          <div className="mt-4 text-right font-bold text-green-700">
            Total Ingresos por Abonos: +${totalPayments.toLocaleString('es-CO')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
