import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar, CreditCard, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { CardSettings } from '@/types';

interface Props {
  cardSettings: CardSettings;
  onUpdate: (updates: Partial<CardSettings>) => void;
}

export default function CardSettingsSection({ cardSettings, onUpdate }: Props) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-6 flex items-center">
        <CreditCard className="h-5 w-5 mr-2" />
        Configuración de Tarjetas Débito y Crédito
      </h2>
      <div className="space-y-6">

        <div className="border-b pb-6">
          <div className="flex items-center justify-between mb-4 p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium">Retraso de Acreditación</p>
                <p className="text-sm text-gray-600">Las tarjetas se acreditan al día siguiente (lunes si es fin de semana)</p>
              </div>
            </div>
            <Switch
              checked={cardSettings.delayEnabled}
              onCheckedChange={(checked) => {
                onUpdate({ delayEnabled: checked });
                toast.success(checked ? 'Retraso de acreditación activado' : 'Retraso de acreditación desactivado');
              }}
            />
          </div>
          <div className="p-4 bg-amber-50 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Nota:</strong> Cuando está activo, las ventas con tarjeta en Colpatria
              se verán reflejadas el día siguiente hábil (no fines de semana).
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Percent className="h-5 w-5 text-gray-500" />
            <h3 className="font-semibold">Comisiones y Retenciones</h3>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-sm">Aplicar Comisiones</p>
              <p className="text-xs text-gray-600">Descontar comisión bancaria de las tarjetas</p>
            </div>
            <Switch
              checked={cardSettings.commissionsEnabled}
              onCheckedChange={(checked) => {
                onUpdate({ commissionsEnabled: checked });
                toast.success(checked ? 'Comisiones activadas' : 'Comisiones desactivadas');
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Comisión Tarjeta Débito (%)</Label>
              <Input
                type="number" step="0.1"
                value={cardSettings.debitCommission}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (isNaN(v) || v < 0 || v > 100) { toast.error('La comisión debe estar entre 0% y 100%'); return; }
                  onUpdate({ debitCommission: v });
                }}
                placeholder="1.9"
                disabled={!cardSettings.commissionsEnabled}
              />
              <p className="text-xs text-gray-500 mt-1">Ejemplo: 1.9 = 1.9% de comisión</p>
            </div>
            <div>
              <Label>Comisión Tarjeta Crédito (%)</Label>
              <Input
                type="number" step="0.1"
                value={cardSettings.creditCommission}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (isNaN(v) || v < 0 || v > 100) { toast.error('La comisión debe estar entre 0% y 100%'); return; }
                  onUpdate({ creditCommission: v });
                }}
                placeholder="2.9"
                disabled={!cardSettings.commissionsEnabled}
              />
              <p className="text-xs text-gray-500 mt-1">Ejemplo: 2.9 = 2.9% de comisión</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-sm">Aplicar Reteiva</p>
              <p className="text-xs text-gray-600">Descontar retención del IVA</p>
            </div>
            <Switch
              checked={cardSettings.reteivaEnabled}
              onCheckedChange={(checked) => {
                onUpdate({ reteivaEnabled: checked });
                toast.success(checked ? 'Reteiva activada' : 'Reteiva desactivada');
              }}
            />
          </div>

          <div>
            <Label>Reteiva (%)</Label>
            <Input
              type="number" step="0.1"
              value={cardSettings.reteiva}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (isNaN(v) || v < 0 || v > 100) { toast.error('El reteiva debe estar entre 0% y 100%'); return; }
                onUpdate({ reteiva: v });
              }}
              placeholder="0.4"
              disabled={!cardSettings.reteivaEnabled}
            />
            <p className="text-xs text-gray-500 mt-1">Ejemplo: 0.4 = 0.4% de retención</p>
          </div>

          {(cardSettings.commissionsEnabled || cardSettings.reteivaEnabled) && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900 mb-2">Ejemplo de Cálculo:</p>
              <div className="space-y-1 text-sm text-blue-800">
                <p>Venta con Tarjeta Débito: $100.000</p>
                {cardSettings.commissionsEnabled && (
                  <p>- Comisión débito ({cardSettings.debitCommission}%): ${(100000 * cardSettings.debitCommission / 100).toLocaleString('es-CO')}</p>
                )}
                {cardSettings.reteivaEnabled && (
                  <p>- Reteiva ({cardSettings.reteiva}%): ${(100000 * cardSettings.reteiva / 100).toLocaleString('es-CO')}</p>
                )}
                <p className="font-bold pt-2 border-t border-blue-300">
                  Total recibido: ${(100000 -
                    (cardSettings.commissionsEnabled ? 100000 * cardSettings.debitCommission / 100 : 0) -
                    (cardSettings.reteivaEnabled ? 100000 * cardSettings.reteiva / 100 : 0)
                  ).toLocaleString('es-CO')}
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
