import { useState } from 'react';
import { useSales } from '@/hooks/useSales';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Settings as SettingsIcon, CreditCard, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { paymentMethods, addPaymentMethod } = useSales();
  
  const [isAddingPaymentMethod, setIsAddingPaymentMethod] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    name: '',
    type: 'electronic' as 'cash' | 'electronic' | 'credit'
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

  return (
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
              <h4 className="font-medium mb-3">Información de la Empresa</h4>
              <div className="space-y-3">
                <div>
                  <Label>Nombre de la Empresa</Label>
                  <Input placeholder="Mi Tienda" />
                </div>
                <div>
                  <Label>NIT/RUT</Label>
                  <Input placeholder="123456789-0" />
                </div>
                <div>
                  <Label>Dirección</Label>
                  <Input placeholder="Calle 123 #45-67" />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input placeholder="(57) 300 123 4567" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
  );
}