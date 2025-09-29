import { useMemo, useState } from 'react'; // Importa el hook useState para manejar estados locales.
import { useInventory } from '@/hooks/useInventory'; // Hook personalizado para obtener datos de inventario.
import { useSales } from '@/hooks/useSales'; // Hook personalizado para manejar ventas.
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button'; // Componente de botón reutilizable.
import { Input } from '@/components/ui/input'; // Componente de entrada reutilizable.
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Componentes para tarjetas.
import { Badge } from '@/components/ui/badge'; // Componente para mostrar etiquetas.
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'; // Componentes para diálogos modales.
import { Label } from '@/components/ui/label'; // Componente para etiquetas de formularios.
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Componentes para menús desplegables.
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'; // Componentes para tablas.
import { Plus, FileText, Search, ShoppingCart, Clock, Minus, Trash2, Banknote, ShoppingBag, CreditCard, Smartphone, Calculator } from 'lucide-react'; // Iconos de la librería Lucide.
import { Product, SaleItem, PaymentMethod,AccountingRecord, RecordType } from '@/types'; // Tipos personalizados para productos, elementos de venta y métodos de pago.
import { toast } from 'sonner'; // Librería para mostrar notificaciones.


export default function Accounting() {
  const [records, setRecords] = useState<AccountingRecord[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // campos del formulario
  const [tipo, setTipo] = useState<RecordType>('ingreso');
  const [descripcion, setDescripcion] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [factura, setFactura] = useState('');
  const [monto, setMonto] = useState<number>(0);
  const [banco, setBanco] = useState('');

  const addRecord = () => {
    if (!monto || !banco) {
      toast.error('Monto y banco son obligatorios');
      return;
    }

    const newRecord: AccountingRecord = {
      id: Date.now(),
      tipo,
      descripcion,
      proveedor: tipo === 'compra' ? proveedor : undefined,
      factura: tipo === 'compra' ? factura : undefined,
      monto,
      banco,
      fecha: new Date().toISOString(),
    };

    setRecords([...records, newRecord]);
    toast.success('Registro agregado');
    resetForm();
    setIsCreating(false);
  };

  const resetForm = () => {
    setTipo('ingreso');
    setDescripcion('');
    setProveedor('');
    setFactura('');
    setMonto(0);
    setBanco('');
  };
   // Calcular efectivo disponible en caja
  const efectivoEnCaja = useMemo(() => {
    const ingresos = records
      .filter((r) => r.banco === "efectivo" && r.tipo === "ingreso")
      .reduce((acc, r) => acc + r.monto, 0);

    const egresos = records
      .filter((r) => r.banco === "efectivo" && (r.tipo === "egreso" || r.tipo === "compra"))
      .reduce((acc, r) => acc + r.monto, 0);

    return ingresos - egresos;
  }, [records]);

   // Gastos totales
  const totalGastos = useMemo(() => {
    return records
      .filter((r) => r.tipo === "egreso")
      .reduce((acc, r) => acc + r.monto, 0);
  }, [records]);

  // Compras totales
  const totalCompras = useMemo(() => {
    return records
      .filter((r) => r.tipo === "compra")
      .reduce((acc, r) => acc + r.monto, 0);
  }, [records]);

  // Créditos / abonos
  const totalCreditos = useMemo(() => {
    return records
      .filter((r) => r.tipo === "credito")
      .reduce((acc, r) => acc + r.monto, 0);
  }, [records]);

  return (
    <ScrollArea className="h-[51rem] p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Contabilidad</h1>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Registro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nuevo Registro Contable</DialogTitle>
            </DialogHeader>
            
             <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={(v: RecordType) => setTipo(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ingreso">Ingreso</SelectItem>
                    <SelectItem value="egreso">Egreso</SelectItem>
                    <SelectItem value="compra">Compra de Mercancía</SelectItem>
                    <SelectItem value="credito">Crédito / Abono</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Banco</Label>
                <Select value={banco} onValueChange={setBanco}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona banco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="colpatria">Colpatria</SelectItem>
                    <SelectItem value="bbva">BBVA</SelectItem>
                    <SelectItem value="nequi">Nequi</SelectItem>
                    <SelectItem value="daviplata">Daviplata</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Monto</Label>
                <Input
                  type="number"
                  value={monto}
                  onChange={(e) => setMonto(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>

              <div>
                <Label>Descripción</Label>
                <Input
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Detalle del movimiento"
                />
              </div>

              {tipo === 'compra' && (
                <>
                  <div>
                    <Label>Proveedor</Label>
                    <Input
                      value={proveedor}
                      onChange={(e) => setProveedor(e.target.value)}
                      placeholder="Nombre proveedor"
                    />
                  </div>
                  <div>
                    <Label>N° Factura</Label>
                    <Input
                      value={factura}
                      onChange={(e) => setFactura(e.target.value)}
                      placeholder="Número de factura"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancelar
              </Button>
              <Button onClick={addRecord}>Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {/* Base del Día */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">CAJA PRINCIPAL</CardTitle>
          <div className="text-xs text-muted-foreground">
            
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">efectivo en caja</p>
              <p className="text-xl font-bold">
                ${efectivoEnCaja.toLocaleString("es-CO")}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">traspaso del dia </p>
              <p className="text-xl font-bold text-green-600">
                ${totalCreditos.toLocaleString("es-CO")}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">gastos</p>
              <p className="text-xl font-bold text-indigo-600">
                ${totalGastos.toLocaleString("es-CO")}
                </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">compras
              </p>
              <p className="text-xl font-bold">
                  ${totalCompras.toLocaleString("es-CO")}
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-end">
                        
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              COLPATRIA
            </CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${('es-CO')}
            </div>
            <p className="text-xs text-muted-foreground">
              {} abonos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              BBVA
            </CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${('es-CO')}
            </div>
            <p className="text-xs text-muted-foreground">
              {}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              NEQUI
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${('es-CO')}
            </div>
            <p className="text-xs text-muted-foreground">
              {}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              DAVIPLATA
            </CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${('es-CO')}
            </div>
            <p className="text-xs text-muted-foreground">
              { }% del total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de registros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Registros ({records.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No hay registros aún
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Factura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.fecha).toLocaleDateString('es-CO')}</TableCell>
                    <TableCell>
                      {r.tipo === 'ingreso' && <Banknote className="inline h-4 w-4 text-green-600 mr-1" />}
                      {r.tipo === 'egreso' && <Minus className="inline h-4 w-4 text-red-600 mr-1" />}
                      {r.tipo === 'compra' && <ShoppingBag className="inline h-4 w-4 text-blue-600 mr-1" />}
                      {r.tipo === 'credito' && <FileText className="inline h-4 w-4 text-purple-600 mr-1" />}
                      {r.tipo}
                    </TableCell>
                    <TableCell>{r.descripcion}</TableCell>
                    <TableCell>${r.monto.toLocaleString('es-CO')}</TableCell>
                    <TableCell>{r.banco}</TableCell>
                    <TableCell>{r.proveedor ?? '-'}</TableCell>
                    <TableCell>{r.factura ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </ScrollArea>
  );
}