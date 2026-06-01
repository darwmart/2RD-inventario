import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, ArrowDownCircle } from 'lucide-react';
import { CashRegisterSession } from '@/types';
import { fmtMoneyInput, parseMoney } from '@/utils/formatters';
import { toast } from 'sonner';

export interface CreditPayment {
  id: string;
  date: string;
  platform: string;
  amount: number;
  description: string;
}

const PLATFORMS = ['Addi', 'Sistecrédito', 'Fincomercio', 'Alkosto', 'Codensa', 'Efectivo directo', 'Otro'];

interface Props {
  currentSession: CashRegisterSession | undefined;
  dailyPayments: CreditPayment[];
  totalPayments: number;
  isAdmin: boolean;
  onAdd: (payment: Omit<CreditPayment, 'id' | 'date'>) => void;
  onDelete: (id: string) => void;
}

export default function CreditPaymentsCard({
  currentSession, dailyPayments, totalPayments, isAdmin, onAdd, onDelete,
}: Props) {
  const [platform, setPlatform] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');

  const isClosed = !currentSession || currentSession.status === 'closed';

  const handleAdd = () => {
    if (isClosed) { toast.error('La caja está cerrada. No se pueden registrar ingresos.'); return; }
    if (!platform.trim()) { toast.error('Selecciona o escribe la plataforma'); return; }
    const amount = parseMoney(amountStr);
    if (amount <= 0) { toast.error('El monto debe ser mayor a $0'); return; }
    onAdd({ platform: platform.trim(), amount, description: description.trim() });
    setAmountStr('');
    setDescription('');
    toast.success(`Abono de $${amount.toLocaleString('es-CO')} registrado`);
  };

  return (
    <Card className="mb-8">
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
            {!currentSession ? 'Abre la caja para registrar ingresos.' : 'La caja está cerrada. No se pueden registrar nuevos ingresos.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label>Plataforma / Concepto</Label>
              <div className="flex flex-col gap-1">
                <select
                  value={PLATFORMS.includes(platform) ? platform : platform ? 'Otro' : ''}
                  onChange={e => {
                    if (e.target.value === 'Otro') setPlatform('');
                    else setPlatform(e.target.value);
                  }}
                  className="w-full border rounded p-2 text-sm"
                >
                  <option value="">Seleccione...</option>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {!PLATFORMS.slice(0, -1).includes(platform) && (
                  <Input
                    value={platform}
                    onChange={e => setPlatform(e.target.value)}
                    placeholder="Escriba la plataforma..."
                    className="h-8 text-sm"
                  />
                )}
              </div>
            </div>
            <div>
              <Label>Monto</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={amountStr}
                onChange={e => setAmountStr(fmtMoneyInput(e.target.value))}
                placeholder="$0"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Descripción (opcional)</Label>
              <Input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ej: Abono cliente Juan Pérez"
              />
            </div>
          </div>
        )}

        {currentSession?.status === 'open' && (
          <Button onClick={handleAdd} className="bg-green-600 hover:bg-green-700">
            <ArrowDownCircle className="h-4 w-4 mr-2" />
            Registrar Ingreso
          </Button>
        )}

        <div className="mt-6 space-y-2 max-h-60 overflow-y-auto">
          {dailyPayments.length === 0 ? (
            <p className="text-gray-500 text-center text-sm">No hay ingresos por abonos registrados</p>
          ) : (
            dailyPayments.map(p => (
              <div key={p.id} className="p-3 border rounded-lg flex justify-between items-start gap-2 bg-green-50">
                <div className="flex-1">
                  <p className="font-medium text-green-800">{p.platform}</p>
                  {p.description && <p className="text-xs text-gray-600">{p.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-green-700">+${p.amount.toLocaleString('es-CO')}</span>
                  {isAdmin && (
                    <button
                      onClick={() => onDelete(p.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded"
                      title="Eliminar ingreso"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 text-right font-bold text-green-700">
          Total Ingresos por Abonos: +${totalPayments.toLocaleString('es-CO')}
        </div>
      </CardContent>
    </Card>
  );
}
