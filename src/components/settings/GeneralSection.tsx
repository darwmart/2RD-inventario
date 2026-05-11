import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { CompanyInfo, TaxSettings } from '@/types';

interface Props {
  companyInfo: CompanyInfo;
  onUpdateCompany: (updates: Partial<CompanyInfo>) => void;
  taxSettings: TaxSettings;
  onUpdateTax: (updates: Partial<TaxSettings>) => void;
}

export default function GeneralSection({ companyInfo, onUpdateCompany, taxSettings, onUpdateTax }: Props) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Configuración General</h2>
      <div className="space-y-6">

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Alertas de Stock Bajo</p>
              <p className="text-sm text-gray-600">Recibir notificaciones cuando los productos estén por agotarse</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Validación de Stock</p>
              <p className="text-sm text-gray-600">Verificar disponibilidad antes de completar ventas</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Precios Modificables</p>
              <p className="text-sm text-gray-600">Permitir cambiar precios durante las ventas</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Auto-guardar Cotizaciones</p>
              <p className="text-sm text-gray-600">Guardar automáticamente las cotizaciones cada 30 segundos</p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4">Configuración de Moneda</h3>
          <div className="space-y-4">
            <div>
              <Label>Símbolo de Moneda</Label>
              <Select defaultValue="COP">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COP">$ (Peso Colombiano)</SelectItem>
                  <SelectItem value="USD">$ (Dólar)</SelectItem>
                  <SelectItem value="EUR">€ (Euro)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Formato de Números</Label>
              <Select defaultValue="es-CO">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="es-CO">1.234.567,89 (Colombia)</SelectItem>
                  <SelectItem value="en-US">1,234,567.89 (Estados Unidos)</SelectItem>
                  <SelectItem value="es-ES">1.234.567,89 (España)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4">Configuración de IVA</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-sm">Aplicar IVA</p>
                <p className="text-xs text-gray-600">Incluir impuesto en los precios de venta</p>
              </div>
              <Switch
                checked={taxSettings.ivaEnabled}
                onCheckedChange={(checked) => {
                  onUpdateTax({ ivaEnabled: checked });
                  toast.success(checked ? 'IVA activado' : 'IVA desactivado');
                }}
              />
            </div>
            <div>
              <Label>Porcentaje de IVA (%)</Label>
              <Input
                type="number" step="0.1" min="0" max="100"
                value={taxSettings.ivaPercentage}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (isNaN(v) || v < 0 || v > 100) { toast.error('El IVA debe estar entre 0% y 100%'); return; }
                  onUpdateTax({ ivaPercentage: v });
                }}
                placeholder="19"
                disabled={!taxSettings.ivaEnabled}
              />
              <p className="text-xs text-gray-500 mt-1">Ejemplo: 19 = 19% de IVA</p>
            </div>
            {taxSettings.ivaEnabled && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-2">Ejemplo de Cálculo:</p>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>Precio base: $100.000</p>
                  <p>IVA ({taxSettings.ivaPercentage}%): ${(100000 * taxSettings.ivaPercentage / 100).toLocaleString('es-CO')}</p>
                  <p className="font-bold pt-2 border-t border-blue-300">
                    Precio final con IVA: ${(100000 + (100000 * taxSettings.ivaPercentage / 100)).toLocaleString('es-CO')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4">Información de la Empresa</h3>
          <p className="text-sm text-gray-600 mb-4">Esta información se imprimirá en las facturas POS</p>
          <div className="space-y-4">
            <div>
              <Label>Nombre de la Empresa</Label>
              <Input placeholder="Mi Tienda" value={companyInfo.name} onChange={(e) => onUpdateCompany({ name: e.target.value })} />
            </div>
            <div>
              <Label>NIT/RUT</Label>
              <Input placeholder="123456789-0" value={companyInfo.nit} onChange={(e) => onUpdateCompany({ nit: e.target.value })} />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input placeholder="Calle 123 #45-67" value={companyInfo.address} onChange={(e) => onUpdateCompany({ address: e.target.value })} />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input placeholder="(57) 300 123 4567" value={companyInfo.phone} onChange={(e) => onUpdateCompany({ phone: e.target.value })} />
            </div>
            <div>
              <Label>Email (Opcional)</Label>
              <Input type="email" placeholder="contacto@mitienda.com" value={companyInfo.email || ''} onChange={(e) => onUpdateCompany({ email: e.target.value })} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
