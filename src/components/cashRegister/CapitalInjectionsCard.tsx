import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TrendingUp, PlusCircle } from 'lucide-react';
import { fmtMoneyInput, parseMoney } from '@/utils/formatters';
import { toast } from 'sonner';

const INJECTION_TYPES = [
  { value: 'inversion',     label: 'Inversión de capital' },
  { value: 'prestamo',      label: 'Préstamo recibido' },
  { value: 'socio',         label: 'Aporte de socio' },
  { value: 'devolucion',    label: 'Devolución recibida' },
  { value: 'otro',          label: 'Otro ingreso' },
];

export type CapitalInjection = {
  id: number;
  type: string;
  typeLabel: string;
  banco: string;
  bancoName: string;
  amount: number;
  detail: string;
  fecha: string;
};

interface Bank {
  id: string;
  name: string;
  isActive: boolean;
  balance?: number;
}

interface Props {
  banks: Bank[];
  injections: CapitalInjection[];
  onAdd: (injection: Omit<CapitalInjection, 'id' | 'fecha'>) => void;
}

export default function CapitalInjectionsCard({ banks, injections, onAdd }: Props) {
  const [type, setType] = useState('inversion');
  const [bancoId, setBancoId] = useState('caja-principal');
  const [amount, setAmount] = useState('');
  const [detail, setDetail] = useState('');

  const activeBanks = banks.filter(b => b.isActive);

  const handleAdd = () => {
    const parsed = parseMoney(amount);
    if (parsed <= 0) { toast.error('Ingresa un monto mayor a $0'); return; }
    if (!detail.trim()) { toast.error('El detalle es obligatorio'); return; }
    if (!bancoId) { toast.error('Selecciona una caja o banco destino'); return; }
    const banco = activeBanks.find(b => b.id === bancoId);
    const typeLabel = INJECTION_TYPES.find(t => t.value === type)?.label ?? type;
    onAdd({ type, typeLabel, banco: bancoId, bancoName: banco?.name ?? bancoId, amount: parsed, detail: detail.trim() });
    setAmount('');
    setDetail('');
    toast.success(`Ingreso de $${parsed.toLocaleString('es-CO')} registrado en ${banco?.name ?? bancoId}`);
  };

  const total = injections.reduce((s, i) => s + i.amount, 0);

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700">
          <TrendingUp className="h-5 w-5" />
          Ingresos de Capital
        </CardTitle>
        <p className="text-xs text-gray-500">
          Inversiones, aportes de socios, préstamos recibidos y otros ingresos que no son ventas
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Formulario */}
        <div className="border rounded-lg p-4 bg-green-50/50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo de ingreso</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INJECTION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Destino</Label>
              <Select value={bancoId} onValueChange={setBancoId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeBanks.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                      {b.balance !== undefined && (
                        <span className="text-xs text-gray-400 ml-2">
                          (saldo: ${b.balance.toLocaleString('es-CO')})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Monto</Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="$0"
              value={amount}
              onChange={e => setAmount(fmtMoneyInput(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Detalle / Nota de ingreso <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="Describe el origen del dinero, nombre del inversor, condiciones del préstamo, etc."
              value={detail}
              onChange={e => setDetail(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <Button onClick={handleAdd} className="w-full bg-green-600 hover:bg-green-700">
            <PlusCircle className="h-4 w-4 mr-2" />
            Registrar Ingreso de Capital
          </Button>
        </div>

        {/* Historial */}
        {injections.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Historial de ingresos</p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {[...injections].reverse().map(inj => (
                <div key={inj.id} className="flex items-start justify-between p-3 border rounded-lg bg-white hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        {inj.typeLabel}
                      </span>
                      <span className="text-xs text-gray-500">{inj.bancoName}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(inj.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1 truncate">{inj.detail}</p>
                  </div>
                  <p className="text-base font-bold text-green-600 ml-4 shrink-0">
                    +${inj.amount.toLocaleString('es-CO')}
                  </p>
                </div>
              ))}
            </div>
            <div className="text-right font-bold text-green-700 text-sm pt-1 border-t">
              Total ingresos: ${total.toLocaleString('es-CO')}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">No hay ingresos de capital registrados</p>
        )}
      </CardContent>
    </Card>
  );
}
