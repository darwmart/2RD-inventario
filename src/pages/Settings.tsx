import { useState } from 'react';
import { useSales } from '@/hooks/useSales';
import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Settings as SettingsIcon, CreditCard, Trash2, Calendar, Percent, Landmark, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Bank } from '@/types';

export default function Settings() {
  const { paymentMethods, addPaymentMethod } = useSales();
  const { cardSettings, updateCardSettings, companyInfo, updateCompanyInfo, taxSettings, updateTaxSettings, banks, addBank, updateBank, deleteBank } = useSettings();
  
  const [isAddingPaymentMethod, setIsAddingPaymentMethod] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    name: '',
    type: 'electronic' as 'cash' | 'electronic' | 'credit'
  });

  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [bankForm, setBankForm] = useState({
    name: '',
  });

  const handleAddPaymentMethod = () => {
    if (!newPaymentMethod.name.trim()) {
      toast.error('El nombre del método de pago es requerido');
      return;
    }

    addPaymentMethod(newPaymentMethod.name.trim(), newPaymentMethod.type);
    toast.success('Método de pago agregado exitosamente');
    
    setNewPaymentMethod({ name: '', type: 'electronic' });
    setIsAddingPaymentMethod(false);
  };

  const getPaymentTypeLabel = (type: 'cash' | 'electronic' | 'credit') => {
    switch (type) {
      case 'cash':
        return 'Efectivo';
      case 'electronic':
        return 'Electrónico';
      case 'credit':
        return 'Crédito';
      default:
        return type;
    }
  };

  const getPaymentTypeBadgeColor = (type: 'cash' | 'electronic' | 'credit') => {
    switch (type) {
      case 'cash':
        return 'default';
      case 'electronic':
        return 'secondary';
      case 'credit':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const handleOpenBankDialog = (bank?: Bank) => {
    if (bank) {
      setEditingBank(bank);
      setBankForm({ name: bank.name });
    } else {
      setEditingBank(null);
      setBankForm({ name: '' });
    }
    setIsBankDialogOpen(true);
  };

  const handleSaveBank = () => {
    if (!bankForm.name.trim()) {
      toast.error('El nombre del banco es requerido');
      return;
    }

    if (editingBank) {
      // Editar banco existente
      updateBank(editingBank.id, { name: bankForm.name.trim() });
      toast.success('Banco actualizado exitosamente');
    } else {
      // Agregar nuevo banco
      const newBank: Bank = {
        id: bankForm.name.toLowerCase().replace(/\s+/g, '-'),
        name: bankForm.name.trim(),
        isActive: true,
      };
      addBank(newBank);
      toast.success('Banco agregado exitosamente');
    }

    setBankForm({ name: '' });
    setEditingBank(null);
    setIsBankDialogOpen(false);
  };

  const handleDeleteBank = (bankId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este banco?')) {
      deleteBank(bankId);
      toast.success('Banco eliminado exitosamente');
    }
  };

  return (
    <ScrollArea className="h-[51rem]">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
          <p className="mt-2 text-gray-600">
            Personaliza tu sistema de ventas e inventario
          </p>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Métodos de Pago */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Métodos de Pago
              </CardTitle>
              <Dialog open={isAddingPaymentMethod} onOpenChange={setIsAddingPaymentMethod}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar Método de Pago</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="payment-name">Nombre del Método</Label>
                      <Input
                        id="payment-name"
                        value={newPaymentMethod.name}
                        onChange={(e) => setNewPaymentMethod({...newPaymentMethod, name: e.target.value})}
                        placeholder="Ej: PayPal, Wompi, etc."
                      />
                    </div>
                    <div>
                      <Label>Tipo de Método</Label>
                      <Select 
                        value={newPaymentMethod.type} 
                        onValueChange={(value: 'cash' | 'electronic' | 'credit') => 
                          setNewPaymentMethod({...newPaymentMethod, type: value})
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Efectivo</SelectItem>
                          <SelectItem value="electronic">Electrónico</SelectItem>
                          <SelectItem value="credit">Crédito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddingPaymentMethod(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddPaymentMethod}>
                        Agregar Método
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
  <div className="space-y-3">
    {paymentMethods && paymentMethods.length > 0 ? (
      paymentMethods.map(method => (
        <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <CreditCard className="h-4 w-4 text-gray-500" />
            <div>
              <p className="font-medium">{method.name}</p>
              <Badge 
                variant={getPaymentTypeBadgeColor(method.type)}
                className="text-xs"
              >
                {getPaymentTypeLabel(method.type)}
              </Badge>
            </div>
          </div>
          <Switch 
            checked={method.isActive}
            onCheckedChange={() => toast.info('Funcionalidad disponible próximamente')}
          />
        </div>
      ))
    ) : (
      <p className="text-sm text-gray-500">No hay métodos de pago configurados</p>
    )}
  </div>
</CardContent>

        </Card>

        {/* Gestión de Bancos */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center">
                <Landmark className="h-5 w-5 mr-2" />
                Bancos / Entidades Financieras
              </CardTitle>
              <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => handleOpenBankDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingBank ? 'Editar Banco' : 'Agregar Banco'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="bank-name">Nombre del Banco</Label>
                      <Input
                        id="bank-name"
                        value={bankForm.name}
                        onChange={(e) => setBankForm({ name: e.target.value })}
                        placeholder="Ej: Bancolombia, Davivienda, etc."
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsBankDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveBank}>
                        {editingBank ? 'Guardar Cambios' : 'Agregar Banco'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {banks && banks.length > 0 ? (
                banks.map(bank => (
                  <div key={bank.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Landmark className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">{bank.name}</p>
                        <Badge variant={bank.isActive ? 'default' : 'secondary'} className="text-xs">
                          {bank.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenBankDialog(bank)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={bank.isActive}
                        onCheckedChange={(checked) => {
                          updateBank(bank.id, { isActive: checked });
                          toast.success(checked ? `${bank.name} activado` : `${bank.name} desactivado`);
                        }}
                      />
                      {bank.id !== 'efectivo' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteBank(bank.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No hay bancos configurados</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Configuraciones Generales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <SettingsIcon className="h-5 w-5 mr-2" />
              Configuración General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Alertas de Stock Bajo</p>
                  <p className="text-sm text-gray-600">
                    Recibir notificaciones cuando los productos estén por agotarse
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Validación de Stock</p>
                  <p className="text-sm text-gray-600">
                    Verificar disponibilidad antes de completar ventas
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Precios Modificables</p>
                  <p className="text-sm text-gray-600">
                    Permitir cambiar precios durante las ventas
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-guardar Cotizaciones</p>
                  <p className="text-sm text-gray-600">
                    Guardar automáticamente las cotizaciones cada 30 segundos
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Configuración de Moneda</h4>
              <div className="space-y-3">
                <div>
                  <Label>Símbolo de Moneda</Label>
                  <Select defaultValue="COP">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es-CO">1.234.567,89 (Colombia)</SelectItem>
                      <SelectItem value="en-US">1,234,567.89 (Estados Unidos)</SelectItem>
                      <SelectItem value="es-ES">1.234.567,89 (España)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Configuración de IVA</h4>
              <p className="text-sm text-gray-600 mb-3">
                Configura el impuesto sobre las ventas (IVA)
              </p>

              <div className="space-y-4">
                {/* Activar/Desactivar IVA */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Aplicar IVA</p>
                    <p className="text-xs text-gray-600">Incluir impuesto en los precios de venta</p>
                  </div>
                  <Switch
                    checked={taxSettings.ivaEnabled}
                    onCheckedChange={(checked) => {
                      updateTaxSettings({ ivaEnabled: checked });
                      toast.success(checked ? 'IVA activado' : 'IVA desactivado');
                    }}
                  />
                </div>

                {/* Porcentaje de IVA */}
                <div>
                  <Label>Porcentaje de IVA (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={taxSettings.ivaPercentage}
                    onChange={(e) => updateTaxSettings({ ivaPercentage: parseFloat(e.target.value) || 0 })}
                    placeholder="19"
                    disabled={!taxSettings.ivaEnabled}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ejemplo: 19 = 19% de IVA
                  </p>
                </div>

                {/* Vista previa del cálculo */}
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

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Información de la Empresa</h4>
              <p className="text-sm text-gray-600 mb-3">
                Esta información se imprimirá en las facturas POS
              </p>
              <div className="space-y-3">
                <div>
                  <Label>Nombre de la Empresa</Label>
                  <Input
                    placeholder="Mi Tienda"
                    value={companyInfo.name}
                    onChange={(e) => updateCompanyInfo({ name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>NIT/RUT</Label>
                  <Input
                    placeholder="123456789-0"
                    value={companyInfo.nit}
                    onChange={(e) => updateCompanyInfo({ nit: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Dirección</Label>
                  <Input
                    placeholder="Calle 123 #45-67"
                    value={companyInfo.address}
                    onChange={(e) => updateCompanyInfo({ address: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    placeholder="(57) 300 123 4567"
                    value={companyInfo.phone}
                    onChange={(e) => updateCompanyInfo({ phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email (Opcional)</Label>
                  <Input
                    type="email"
                    placeholder="contacto@mitienda.com"
                    value={companyInfo.email || ''}
                    onChange={(e) => updateCompanyInfo({ email: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuración de Tarjetas */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Configuración de Tarjetas Débito y Crédito
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Retraso de Acreditación */}
          <div className="border-b pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="font-medium">Retraso de Acreditación</p>
                  <p className="text-sm text-gray-600">
                    Las tarjetas se acreditan al día siguiente (lunes si es fin de semana)
                  </p>
                </div>
              </div>
              <Switch
                checked={cardSettings.delayEnabled}
                onCheckedChange={(checked) => {
                  updateCardSettings({ delayEnabled: checked });
                  toast.success(checked ? 'Retraso de acreditación activado' : 'Retraso de acreditación desactivado');
                }}
              />
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Nota:</strong> Cuando está activo, las ventas con tarjeta en Colpatria
                se verán reflejadas el día siguiente hábil (no fines de semana).
              </p>
            </div>
          </div>

          {/* Comisiones y Retenciones */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="h-4 w-4 text-gray-500" />
              <h4 className="font-medium">Comisiones y Retenciones</h4>
            </div>

            {/* Activar Comisiones */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-sm">Aplicar Comisiones</p>
                <p className="text-xs text-gray-600">Descontar comisión bancaria de las tarjetas</p>
              </div>
              <Switch
                checked={cardSettings.commissionsEnabled}
                onCheckedChange={(checked) => {
                  updateCardSettings({ commissionsEnabled: checked });
                  toast.success(checked ? 'Comisiones activadas' : 'Comisiones desactivadas');
                }}
              />
            </div>

            {/* Configuración de Comisiones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Comisión Tarjeta Débito (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={cardSettings.debitCommission}
                  onChange={(e) => updateCardSettings({ debitCommission: parseFloat(e.target.value) || 0 })}
                  placeholder="1.9"
                  disabled={!cardSettings.commissionsEnabled}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ejemplo: 1.9 = 1.9% de comisión
                </p>
              </div>
              <div>
                <Label>Comisión Tarjeta Crédito (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={cardSettings.creditCommission}
                  onChange={(e) => updateCardSettings({ creditCommission: parseFloat(e.target.value) || 0 })}
                  placeholder="2.9"
                  disabled={!cardSettings.commissionsEnabled}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ejemplo: 2.9 = 2.9% de comisión
                </p>
              </div>
            </div>

            {/* Activar Reteiva */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-sm">Aplicar Reteiva</p>
                <p className="text-xs text-gray-600">Descontar retención del IVA</p>
              </div>
              <Switch
                checked={cardSettings.reteivaEnabled}
                onCheckedChange={(checked) => {
                  updateCardSettings({ reteivaEnabled: checked });
                  toast.success(checked ? 'Reteiva activada' : 'Reteiva desactivada');
                }}
              />
            </div>

            {/* Configuración de Reteiva */}
            <div>
              <Label>Reteiva (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={cardSettings.reteiva}
                onChange={(e) => updateCardSettings({ reteiva: parseFloat(e.target.value) || 0 })}
                placeholder="0.4"
                disabled={!cardSettings.reteivaEnabled}
              />
              <p className="text-xs text-gray-500 mt-1">
                Ejemplo: 0.4 = 0.4% de retención
              </p>
            </div>

            {/* Vista previa del cálculo */}
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
        </CardContent>
      </Card>

      {/* Información del Sistema */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Información del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="font-medium">Versión</p>
              <p className="text-2xl font-bold text-blue-600">1.0.0</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="font-medium">Almacenamiento</p>
              <p className="text-2xl font-bold text-green-600">Local</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="font-medium">Estado</p>
              <p className="text-2xl font-bold text-green-600">Activo</p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Este sistema utiliza almacenamiento local del navegador.
              Los datos se mantienen en tu dispositivo de forma segura.
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </ScrollArea>
  );
}